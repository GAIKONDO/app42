/**
 * Firebase互換APIラッパー (Electron/Tauri版)
 * Supabase専用（データはSupabaseに保存、Tauriコマンドはローカルファイル操作などに使用）
 */

// 環境を検出（Tauriアプリ内では__TAURI__が存在する）
// ポート番号による判定はフォールバックとして残す（ブラウザで直接アクセスする場合）
const isTauri = typeof window !== 'undefined' && (
  '__TAURI__' in window || 
  '__TAURI_INTERNALS__' in window ||
  '__TAURI_METADATA__' in window ||
  (window as any).__TAURI__ !== undefined ||
  (window as any).__TAURI_INTERNALS__ !== undefined ||
  (window as any).__TAURI_METADATA__ !== undefined
);
const isElectron = typeof window !== 'undefined' && window.electronAPI;

// Supabaseを常に使用（環境変数チェック不要）
const useSupabase = true;

// DataSourceアダプターをインポート（Supabase専用）
let dataSourceAdapter: any = null;
try {
  dataSourceAdapter = require('./dataSourceAdapter');
} catch (e) {
  console.warn('DataSourceアダプターの読み込みに失敗しました。Tauriコマンドを使用します。', e);
}

// Tauriコマンドを呼び出すヘルパー関数
export async function callTauriCommand(command: string, args?: any): Promise<any> {
  if (!isTauri) {
    throw new Error('Tauri環境ではありません');
  }
  
  // IPCプロトコルの失敗を無視する（postMessageインターフェースにフォールバックするため）
  // エラーログを抑制するため、詳細なログは開発時のみ出力
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    console.log('[callTauriCommand] 開始', { 
      command, 
      args: args ? JSON.stringify(args).substring(0, 100) : 'none',
      isTauri, 
      port: typeof window !== 'undefined' ? window.location.port : 'undefined',
      hasWindowTAURI: typeof window !== 'undefined' && '__TAURI__' in window
    });
  }
  
  // まず、window.__TAURI__が利用可能か確認（withGlobalTauriが有効な場合）
  if (typeof window !== 'undefined' && '__TAURI__' in window && (window as any).__TAURI__) {
    try {
      const tauriCore = (window as any).__TAURI__.core;
      if (tauriCore && typeof tauriCore.invoke === 'function') {
        console.log('[callTauriCommand] window.__TAURI__.core.invokeを使用', { command, args });
        try {
          // Tauri 2.0では位置引数はオブジェクトとして直接送る
          const invokeArgs = args !== undefined ? args : {};
          const result = await tauriCore.invoke(command, invokeArgs);
          console.log('[callTauriCommand] ✅ 成功', { 
            command, 
            resultType: typeof result,
            resultIsNull: result === null,
            resultIsUndefined: result === undefined,
            resultKeys: result && typeof result === 'object' ? Object.keys(result) : 'N/A',
            resultPreview: result ? JSON.stringify(result).substring(0, 500) : 'null/undefined',
            fullResult: result
          });
          
          // undefinedが返された場合の警告
          if (result === undefined) {
            console.warn('[callTauriCommand] ⚠️ undefinedが返されました', {
              command,
              args,
              tauriCoreAvailable: !!tauriCore,
              invokeAvailable: typeof tauriCore.invoke === 'function'
            });
          }
          
          return result;
        } catch (invokeError: any) {
          // 「no rows」エラーは正常な状態（レコードが存在しない）として扱う
          const errorMessage = invokeError?.message || invokeError?.error || invokeError?.errorString || String(invokeError || '');
          const errorString = String(invokeError || '');
          const errorStack = invokeError?.stack || '';
          const errorName = invokeError?.name || '';
          
          const isNoRowsError = errorMessage.includes('no rows') || 
                                errorMessage.includes('Query returned no rows') ||
                                (command === 'doc_get' && errorMessage.includes('ドキュメント取得エラー'));
          
          // IPCプロトコル関連のエラーは無視（postMessageインターフェースにフォールバックするため）
          // エラーメッセージがundefinedの場合でも、エラー名やスタックから検出
          const isIPCProtocolError = 
            errorMessage.includes('IPC custom protocol failed') ||
            errorMessage.includes('Load failed') ||
            errorMessage.includes('TypeError: Load failed') ||
            errorMessage.includes('access control checks') ||
            errorMessage.includes('ipc://localhost') ||
            errorString.includes('IPC custom protocol failed') ||
            errorString.includes('Load failed') ||
            errorString.includes('access control checks') ||
            errorString.includes('ipc://localhost') ||
            errorStack.includes('IPC custom protocol failed') ||
            errorStack.includes('Load failed') ||
            errorStack.includes('access control checks') ||
            errorStack.includes('ipc://localhost') ||
            errorName === 'TypeError' ||
            (errorName === 'TypeError' && (errorMessage.includes('Load failed') || errorString.includes('Load failed')));
          
          if (!isNoRowsError && !isIPCProtocolError && isDev) {
            console.error('[callTauriCommand] ❌ invoke実行エラー', {
              command,
              args,
              errorMessage: invokeError?.message,
              errorName: invokeError?.name,
              errorCode: invokeError?.code,
              errorStack: invokeError?.stack,
              error: invokeError,
              errorString: String(invokeError)
            });
          }
          
          // IPCプロトコルエラーやCORSエラーの場合は、下のフォールバック処理に進む
          if (isIPCProtocolError) {
            if (isDev) {
              console.debug('[callTauriCommand] IPCプロトコルエラーを検出、postMessageインターフェースにフォールバック', {
                command,
                errorMessage,
                errorName,
                errorString: errorString.substring(0, 200)
              });
            }
            throw new Error('IPC_PROTOCOL_FALLBACK');
          }
          
          throw invokeError;
        }
      } else {
        if (isDev) {
          console.warn('[callTauriCommand] tauriCore.invokeが利用できません', {
            hasTauriCore: !!tauriCore,
            invokeType: tauriCore ? typeof tauriCore.invoke : 'N/A'
          });
        }
      }
    } catch (error: any) {
      // IPCプロトコルエラーの場合は、フォールバック処理に進む
      if (error?.message === 'IPC_PROTOCOL_FALLBACK') {
        // 下のフォールバック処理に進む
        if (isDev) {
          console.debug('[callTauriCommand] IPC_PROTOCOL_FALLBACKエラー、postMessageインターフェースにフォールバック', { command });
        }
      } else {
        // 「no rows」エラーは正常な状態（レコードが存在しない）として扱う
        const errorMessage = error?.message || error?.error || error?.errorString || String(error || '');
        const errorString = String(error || '');
        const errorStack = error?.stack || '';
        const errorName = error?.name || '';
        
        const isNoRowsError = errorMessage.includes('no rows') || 
                              errorMessage.includes('Query returned no rows') ||
                              (command === 'doc_get' && errorMessage.includes('ドキュメント取得エラー'));
        
        // IPCプロトコル関連のエラーは無視（エラーメッセージがundefinedの場合でも検出）
        const isIPCProtocolError = 
          errorMessage.includes('IPC custom protocol failed') ||
          errorMessage.includes('Load failed') ||
          errorMessage.includes('TypeError: Load failed') ||
          errorMessage.includes('access control checks') ||
          errorMessage.includes('ipc://localhost') ||
          errorString.includes('IPC custom protocol failed') ||
          errorString.includes('Load failed') ||
          errorString.includes('access control checks') ||
          errorString.includes('ipc://localhost') ||
          errorStack.includes('IPC custom protocol failed') ||
          errorStack.includes('Load failed') ||
          errorStack.includes('access control checks') ||
          errorStack.includes('ipc://localhost') ||
          errorName === 'TypeError' ||
          (errorName === 'TypeError' && (errorMessage.includes('Load failed') || errorString.includes('Load failed')));
        
        if (!isNoRowsError && !isIPCProtocolError && isDev) {
          console.error('[callTauriCommand] ❌ window.__TAURI__使用時にエラー', {
            command,
            errorMessage: error?.message,
            errorName: error?.name,
            errorCode: error?.code,
            errorStack: error?.stack,
            error: error
          });
        }
        
        // IPCプロトコルエラーの場合は、フォールバック処理に進む
        if (isIPCProtocolError) {
          if (isDev) {
            console.debug('[callTauriCommand] IPCプロトコルエラーを検出（外側のcatch）、postMessageインターフェースにフォールバック', {
              command,
              errorMessage,
              errorName,
              errorString: errorString.substring(0, 200)
            });
          }
          // フォールバック処理に進む（下の静的インポートを試す）
        } else {
          // IPCプロトコルエラーでない場合は、エラーを再スロー
          throw error;
        }
      }
    }
  }
  
  // window.__TAURI__が使えない場合、またはIPCプロトコルエラーの場合は、静的インポートを試す
  try {
    // 静的インポートを使用（Tauriアプリケーション内で実行されている場合は動作する）
    // @ts-ignore - 動的インポートのため型チェックをスキップ
    const { invoke } = await import('@tauri-apps/api/core');
    
    if (typeof invoke !== 'function') {
      throw new Error('invoke関数が見つかりません');
    }
    
    if (isDev) {
      console.log('[callTauriCommand] @tauri-apps/api/coreのinvokeを使用', { command });
    }
    // Tauri 2.0では位置引数はオブジェクトとして直接送る
    const invokeArgs = args !== undefined ? args : {};
    const result = await invoke(command, invokeArgs);
    if (isDev) {
      console.log('[callTauriCommand] ✅ 成功', { 
        command, 
        resultType: typeof result,
        resultKeys: result && typeof result === 'object' ? Object.keys(result) : 'N/A',
        resultPreview: result ? JSON.stringify(result).substring(0, 200) : 'null'
      });
    }
    return result;
  } catch (error: any) {
    // 「no rows」エラーは正常な状態（レコードが存在しない）として扱う
    const errorMessage = error?.message || error?.error || error?.errorString || String(error || '');
    const isNoRowsError = errorMessage.includes('no rows') || 
                          errorMessage.includes('Query returned no rows') ||
                          (command === 'doc_get' && errorMessage.includes('ドキュメント取得エラー'));
    
    if (!isNoRowsError) {
      console.error('[callTauriCommand] ❌ エラー発生', { 
        command, 
        args: args ? JSON.stringify(args).substring(0, 200) : 'none',
        errorMessage: error?.message, 
        errorCode: error?.code,
        errorStack: error?.stack,
        errorName: error?.name,
        errorType: typeof error,
        errorString: String(error),
        hasWindowTAURI: typeof window !== 'undefined' && '__TAURI__' in window,
        fullError: error,
        errorToString: error?.toString(),
        errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error))
      });
    }
    
    // モジュールが見つからない場合や、Tauriアプリケーションが起動していない場合のエラーハンドリング
    if (error.code === 'MODULE_NOT_FOUND' || 
        error.message?.includes('Cannot find module') ||
        error.message?.includes('Failed to fetch dynamically imported module') ||
        error.message?.includes('is not available') ||
        error.message?.includes('does not resolve to a valid URL') ||
        error.message?.includes('Tauri invoke関数が見つかりません') ||
        error.message?.includes('Tauri command') ||
        error.message?.includes('not found') ||
        error.name === 'TypeError') {
      const errorMessage = 'Tauriアプリケーションが起動していません。\n\n' +
        'Tauriアプリケーションを起動するには、以下のコマンドを実行してください：\n\n' +
        '  cd app33-tauri-local\n' +
        '  npm run tauri:dev\n\n' +
        'ブラウザで直接 http://localhost:3010 を開いている場合は、\n' +
        'Tauriアプリケーション経由でアクセスする必要があります。\n\n' +
        `エラー詳細: ${error.message}\n` +
        `コマンド: ${command}\n` +
        `エラーコード: ${error.code || 'N/A'}\n` +
        `エラータイプ: ${error.name || 'Unknown'}`;
      throw new Error(errorMessage);
    }
    
    // コマンド実行時のエラー（Tauriコマンドが返すエラー）はそのまま投げる
    // エラーメッセージが含まれている場合は、それをそのまま使用
    if (error.message) {
      // エラーメッセージが複数行の場合はそのまま使用
      if (error.message.includes('\n')) {
        throw error;
      }
      // 単一行の場合は詳細情報を追加
      const enhancedError = new Error(
        `Tauriコマンド実行エラー: ${command}\n` +
        `エラーメッセージ: ${error.message}\n` +
        `エラーコード: ${error.code || 'N/A'}\n` +
        `エラータイプ: ${error.name || 'Unknown'}`
      );
      if (error.code) (enhancedError as any).code = error.code;
      if (error.name) enhancedError.name = error.name;
      throw enhancedError;
    }
    // エラーメッセージがない場合は、汎用エラーメッセージを設定
    throw new Error(
      `Tauriコマンド実行エラー: ${command}\n` +
      `エラー詳細: ${String(error)}\n` +
      `エラータイプ: ${error.name || typeof error}`
    );
  }
}

// Firestore互換API
export const doc = (db: any, collectionName: string, docId?: string) => {
  const docRef = {
    id: docId,
    path: `${collectionName}/${docId}`,
    parent: {
      id: collectionName,
      path: collectionName,
    },
    get: async () => {
      // Supabase専用（DataSourceアダプターを使用）
      if (dataSourceAdapter) {
        try {
          const data = await dataSourceAdapter.getDocViaDataSource(collectionName, docId);
          if (!data) {
            return { 
              exists: () => false, 
              data: () => undefined, 
              id: docId 
            };
          }
          return {
            exists: () => true,
            data: () => enhanceTimestampsInData(data),
            id: data.id || docId,
          };
        } catch (error: any) {
          const errorMessage = error?.message || error?.error || String(error || '');
          if (errorMessage.includes('no rows') || 
              errorMessage.includes('Query returned no rows') ||
              errorMessage.includes('ドキュメント取得エラー') ||
              errorMessage.includes('PGRST116')) {
            return { 
              exists: () => false, 
              data: () => undefined, 
              id: docId 
            };
          }
          throw error;
        }
      } else {
        // DataSourceアダプターが利用できない場合はエラー
        throw new Error('Supabase DataSourceアダプターが利用できません。Supabaseの設定を確認してください。');
      }
      
    },
    set: async (data: any, options?: any) => {
      // Supabase専用（DataSourceアダプターを使用）
      if (dataSourceAdapter) {
        try {
          await dataSourceAdapter.setDocViaDataSource(collectionName, docId, data);
          return { id: docId };
        } catch (error: any) {
          console.error('❌ [doc.set] DataSourceエラー:', {
            collectionName,
            docId,
            errorMessage: error?.message,
            error: error,
          });
          throw error;
        }
      } else {
        throw new Error('Supabase DataSourceアダプターが利用できません。Supabaseの設定を確認してください。');
      }
    },
    update: async (data: any) => {
      // Supabase専用（DataSourceアダプターを使用）
      if (dataSourceAdapter) {
        try {
          await dataSourceAdapter.updateDocViaDataSource(collectionName, docId, data);
          return { id: docId };
        } catch (error: any) {
          console.error('❌ [doc.update] DataSourceエラー:', {
            collectionName,
            docId,
            errorMessage: error?.message,
            error: error,
          });
          throw error;
        }
      } else {
        throw new Error('Supabase DataSourceアダプターが利用できません。Supabaseの設定を確認してください。');
      }
    },
    delete: async () => {
      // Supabase専用（DataSourceアダプターを使用）
      if (dataSourceAdapter) {
        try {
          await dataSourceAdapter.deleteDocViaDataSource(collectionName, docId);
          return { id: docId };
        } catch (error: any) {
          console.error('❌ [doc.delete] DataSourceエラー:', {
            collectionName,
            docId,
            errorMessage: error?.message,
            error: error,
          });
          throw error;
        }
      } else {
        throw new Error('Supabase DataSourceアダプターが利用できません。Supabaseの設定を確認してください。');
      }
    },
  };
  return docRef;
};

export const collection = (db: any, collectionName: string) => {
  const collectionRef = {
    id: collectionName,
    path: collectionName,
    doc: (docId: string) => doc(db, collectionName, docId),
    add: async (data: any) => {
      try {
        console.log(`[collection.add] 開始: collectionName=${collectionName}`, {
          dataKeys: Object.keys(data || {}),
          dataSize: JSON.stringify(data || {}).length,
          isTauri,
          isElectron
        });
        
        // Supabase専用（DataSourceアダプターを使用）
        if (dataSourceAdapter) {
          try {
            const docId = await dataSourceAdapter.addDocViaDataSource(collectionName, data);
            return {
              id: docId,
              path: `${collectionName}/${docId}`,
            };
          } catch (error: any) {
            console.error(`[collection.add] ❌ DataSourceエラー:`, {
              errorMessage: error?.message,
              error: error,
              collectionName,
              dataKeys: Object.keys(data || {})
            });
            throw error;
          }
        } else {
          throw new Error('Supabase DataSourceアダプターが利用できません。Supabaseの設定を確認してください。');
        }
      } catch (error: any) {
        console.error(`[collection.add] エラー発生:`, {
          collectionName,
          errorMessage: error?.message,
          errorName: error?.name,
          errorCode: error?.code,
          errorStack: error?.stack,
          error: error,
          dataKeys: Object.keys(data || {}),
          dataPreview: JSON.stringify(data || {}).substring(0, 200)
        });
        
        // データベース関連のエラーの場合、診断情報を取得
        let diagnostics: any = null;
        if (error?.message?.includes('データベース') || error?.message?.includes('データベースが利用できません')) {
          try {
            console.log('[collection.add] データベース診断を実行します...');
            diagnostics = await callTauriCommand('diagnose_database', {});
            console.log('[collection.add] 診断結果:', diagnostics);
          } catch (diagError: any) {
            console.error('[collection.add] 診断コマンド実行エラー:', diagError);
          }
        }
        
        // エラーメッセージを改善
        let enhancedError: Error;
        if (error?.message) {
          // エラーメッセージが複数行の場合はそのまま使用
          if (error.message.includes('\n')) {
            let errorMsg = error.message;
            if (diagnostics) {
              errorMsg += `\n\n[診断情報]\n`;
              Object.entries(diagnostics).forEach(([key, value]) => {
                errorMsg += `${key}: ${value}\n`;
              });
            }
            enhancedError = new Error(errorMsg);
          } else {
            // 単一行の場合は詳細情報を追加
            let errorMsg = `データベースエラー: ${error.message}\n` +
              `コレクション名: ${collectionName}\n` +
              `エラータイプ: ${error.name || 'Unknown'}\n` +
              `エラーコード: ${error.code || 'N/A'}`;
            
            if (diagnostics) {
              errorMsg += `\n\n[診断情報]\n`;
              Object.entries(diagnostics).forEach(([key, value]) => {
                errorMsg += `${key}: ${value}\n`;
              });
            }
            
            enhancedError = new Error(errorMsg);
          }
        } else {
          let errorMsg = `データベースエラーが発生しました。\n` +
            `コレクション名: ${collectionName}\n` +
            `詳細: ${String(error)}`;
          
          if (diagnostics) {
            errorMsg += `\n\n[診断情報]\n`;
            Object.entries(diagnostics).forEach(([key, value]) => {
              errorMsg += `${key}: ${value}\n`;
            });
          }
          
          enhancedError = new Error(errorMsg);
        }
        
        // 元のエラーのプロパティを保持
        if (error?.code) (enhancedError as any).code = error.code;
        if (error?.name) enhancedError.name = error.name;
        if (diagnostics) (enhancedError as any).diagnostics = diagnostics;
        
        throw enhancedError;
      }
    },
    get: async () => {
      // Supabase専用（環境変数チェック不要）
      if (dataSourceAdapter) {
        try {
          const results = await dataSourceAdapter.getCollectionViaDataSource(collectionName);
          const docs = (results || []).map((r: any) => ({
            id: r.id,
            data: () => enhanceTimestampsInData(r),
            exists: () => true,
          }));
          
          return {
            docs: docs,
            empty: docs.length === 0,
            size: docs.length,
            forEach: (callback: (doc: any) => void) => {
              docs.forEach(callback);
            },
          };
        } catch (error: any) {
          console.error('❌ [collection.get] DataSourceエラー:', {
            collectionName,
            errorMessage: error?.message,
            error: error,
          });
          throw error;
        }
      }
    },
  };
  return collectionRef;
};

export const query = (...args: any[]) => {
  const collectionRef = args[0];
  // collectionRefからコレクション名を取得（_path.segments[0] または id または path を使用）
  const collectionName = collectionRef._path?.segments?.[0] || collectionRef.id || collectionRef.path || collectionRef;
  
  const conditions: any = {};
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg && typeof arg === 'object') {
      if (arg.type === 'where') {
        conditions.field = arg.fieldPath;
        conditions.operator = arg.opStr;
        conditions.value = arg.value;
      } else if (arg.type === 'orderBy') {
        conditions.orderBy = arg.fieldPath;
        conditions.orderDirection = arg.dir || 'asc';
      } else if (arg.type === 'limit') {
        conditions.limit = arg.limitCount;
      }
    }
  }

  return {
    get: async () => {
      // Supabase専用（DataSourceアダプターを使用）
      if (dataSourceAdapter) {
        try {
          // query機能はSupabaseのクエリビルダーを使用
          // 簡易実装：条件に基づいてコレクションを取得
          const results = await dataSourceAdapter.getCollectionViaDataSource(collectionName);
          let docs = (results || []).map((r: any) => ({
            id: r.id,
            data: () => enhanceTimestampsInData(r),
            exists: () => true,
          }));
          
          // where条件でフィルタリング
          if (conditions.field && conditions.operator && conditions.value !== undefined) {
            docs = docs.filter((doc: any) => {
              const fieldValue = doc.data()[conditions.field];
              switch (conditions.operator) {
                case '==':
                  return fieldValue === conditions.value;
                case '!=':
                  return fieldValue !== conditions.value;
                case '>':
                  return fieldValue > conditions.value;
                case '>=':
                  return fieldValue >= conditions.value;
                case '<':
                  return fieldValue < conditions.value;
                case '<=':
                  return fieldValue <= conditions.value;
                default:
                  return true;
              }
            });
          }
          
          // orderByでソート
          if (conditions.orderBy) {
            docs.sort((a: any, b: any) => {
              const aValue = a.data()[conditions.orderBy];
              const bValue = b.data()[conditions.orderBy];
              const direction = conditions.orderDirection === 'desc' ? -1 : 1;
              if (aValue < bValue) return -1 * direction;
              if (aValue > bValue) return 1 * direction;
              return 0;
            });
          }
          
          // limitで制限
          if (conditions.limit) {
            docs = docs.slice(0, conditions.limit);
          }
          
          return {
            docs: docs,
            empty: docs.length === 0,
            size: docs.length,
            forEach: (callback: (doc: any) => void) => {
              docs.forEach(callback);
            },
          };
        } catch (error: any) {
          console.error('❌ [query.get] DataSourceエラー:', {
            collectionName,
            errorMessage: error?.message,
            error: error,
          });
          throw error;
        }
      } else {
        throw new Error('Supabase DataSourceアダプターが利用できません。Supabaseの設定を確認してください。');
      }
    },
  };
};

export const where = (fieldPath: string, opStr: string, value: any) => {
  return { type: 'where', fieldPath, opStr, value };
};

export const orderBy = (fieldPath: string, directionStr?: 'asc' | 'desc') => {
  return { type: 'orderBy', fieldPath, dir: directionStr || 'asc' };
};

export const limit = (limitCount: number) => {
  return { type: 'limit', limitCount };
};

// タイムスタンプオブジェクトにメソッドを追加するヘルパー関数
function enhanceTimestamp(timestamp: any) {
  if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
    return {
      ...timestamp,
      toDate: () => new Date(timestamp.seconds * 1000),
      toMillis: () => timestamp.seconds * 1000,
    };
  }
  return timestamp;
}

// データオブジェクト内のタイムスタンプを変換するヘルパー関数
function enhanceTimestampsInData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const enhanced = { ...data };
  const timestampFields = ['createdAt', 'updatedAt', 'approvedAt', 'requestedAt', 'lastLoginAt'];
  timestampFields.forEach(field => {
    if (enhanced[field]) {
      enhanced[field] = enhanceTimestamp(enhanced[field]);
    }
  });
  return enhanced;
}

export const getDoc = async (docRef: any) => {
  if (docRef && typeof docRef.get === 'function') {
    const result = await docRef.get();
    // result.existsが関数の場合はそのまま、ブール値の場合は関数に変換
    if (typeof result.exists === 'function') {
      return {
        ...result,
        data: () => enhanceTimestampsInData(result.data()),
      };
    } else {
      // existsがブール値の場合は関数に変換
      const existsValue = result.exists;
      return {
        ...result,
        exists: () => existsValue,
        data: () => enhanceTimestampsInData(result.data ? result.data() : result.data),
      };
    }
  }
  // フォールバック: Supabase経由で取得（SQLiteフォールバックは削除）
  if (docRef && docRef.path) {
    const [collectionName, docId] = docRef.path.split('/');
    try {
      // Supabase専用（環境変数チェック不要）
      const { getDocViaDataSource } = await import('./dataSourceAdapter');
      const result = await getDocViaDataSource(collectionName, docId);
      if (!result) {
        return { exists: () => false, data: () => undefined, id: docId };
      }
      return {
        exists: () => true,
        data: () => enhanceTimestampsInData(result),
        id: result.id || docId,
      };
    } catch (error: any) {
      console.error('❌ [getDoc] Supabaseからの取得エラー:', error);
      return { exists: () => false, data: () => undefined, id: docId };
    }
  }
  throw new Error('Invalid document reference');
};

export const getDocs = async (queryRef: any) => {
  return queryRef.get();
};

export const setDoc = async (docRef: any, data: any, options?: any) => {
  return docRef.set(data);
};

export const updateDoc = async (docRef: any, data: any) => {
  return docRef.update(data);
};

export const deleteDoc = async (docRef: any) => {
  return docRef.delete();
};

export const addDoc = async (collectionRef: any, data: any) => {
  return collectionRef.add(data);
};

export const serverTimestamp = () => {
  return 'SERVER_TIMESTAMP';
};

// getTimestamp関数（serverTimestampの代替）
export const getTimestamp = () => {
  return Math.floor(Date.now() / 1000).toString();
};

export const deleteField = () => {
  return '__DELETE_FIELD__';
};

// Timestamp互換クラス
export class Timestamp {
  constructor(public seconds: number, public nanoseconds: number) {}

  static now() {
    const now = Date.now();
    return new Timestamp(Math.floor(now / 1000), (now % 1000) * 1000000);
  }

  static fromDate(date: Date) {
    const ms = date.getTime();
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1000000);
  }

  toDate() {
    return new Date(this.seconds * 1000 + this.nanoseconds / 1000000);
  }

  toMillis() {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1000000);
  }
}

// Auth互換API
export const signInWithEmailAndPassword = async (auth: any, email: string, password: string) => {
  // キャッシュをクリア（新しいユーザーでログインするため）
  currentUserCache = null;
  
  // Supabase専用（環境変数チェック不要）
  try {
    const { getDataSourceInstance } = await import('./dataSource');
    const dataSource = getDataSourceInstance();
    const result = await dataSource.sign_in(email, password);
    
    if (result && result.user) {
      // ログイン成功時にキャッシュを更新
      currentAuthUser = result.user;
      currentUserCache = {
        user: result.user,
        timestamp: Date.now(),
      };
      return { user: result.user };
    }
    throw new Error('ログインに失敗しました。ユーザー情報が取得できませんでした。');
  } catch (error: any) {
    // サンプルアカウントでログイン失敗した場合、自動的に登録を試みる
    const isSampleAccount = (email === 'gkondo@ctc-america.com' || email === 'admin@example.com' || email === 'admin@test.com' || email === 'admin@test.local') && password === 'admin123';
    const isInvalidCredentials = error?.message?.includes('Invalid login credentials') || 
                                  error?.message?.includes('invalid_credentials');
    
    if (isSampleAccount && isInvalidCredentials) {
      try {
        console.log('[signInWithEmailAndPassword] サンプルアカウントが存在しないため、自動的に登録します...');
        // サンプルアカウントを自動的に登録
        const { getDataSourceInstance } = await import('./dataSource');
        const dataSource = getDataSourceInstance();
        const signUpResult = await dataSource.sign_up(email, password);
        
        if (signUpResult && signUpResult.user) {
          console.log('[signInWithEmailAndPassword] サンプルアカウントの登録に成功しました。再度ログインを試みます...');
          // 登録後、再度ログインを試みる
          const loginResult = await dataSource.sign_in(email, password);
          
          if (loginResult && loginResult.user) {
            // ログイン成功時にキャッシュを更新
            currentAuthUser = loginResult.user;
            currentUserCache = {
              user: loginResult.user,
              timestamp: Date.now(),
            };
            return { user: loginResult.user };
          }
        }
      } catch (autoSignUpError: any) {
        // 自動登録に失敗した場合、またはメール確認が必要な場合
        const isEmailNotConfirmed = autoSignUpError?.message?.includes('Email not confirmed') || 
                                    autoSignUpError?.code === 'email_not_confirmed';
        
        if (isEmailNotConfirmed) {
          // メール確認が必要な場合、Supabaseダッシュボードで確認するよう案内
          throw new Error('ユーザーは登録されましたが、メール確認が必要です。\n\n開発環境では、Supabaseダッシュボードで以下を設定してください：\n1. 「Authentication」→「Settings」→「Enable email confirmations」のチェックを外す\n2. または、「Authentication」→「Users」で該当ユーザーを選択し、「Confirm email」をクリック');
        }
        
        // その他のエラーの場合は、元のエラーを投げる
        console.warn('[signInWithEmailAndPassword] サンプルアカウントの自動登録に失敗:', autoSignUpError);
        throw error;
      }
    }
    
    throw error;
  }
};

export const createUserWithEmailAndPassword = async (auth: any, email: string, password: string) => {
  // キャッシュをクリア（新しいユーザーを作成するため）
  currentUserCache = null;
  
  // Supabase専用（環境変数チェック不要）
  const { getDataSourceInstance } = await import('./dataSource');
  const dataSource = getDataSourceInstance();
  const result = await dataSource.sign_up(email, password);
  
  if (result && result.user) {
    // 登録成功時にキャッシュを更新
    currentAuthUser = result.user;
    currentUserCache = {
      user: result.user,
      timestamp: Date.now(),
    };
    return { user: result.user };
  }
  throw new Error('登録に失敗しました。ユーザー情報が取得できませんでした。');
};

export const signOut = async (auth: any) => {
  // キャッシュをクリア
  currentUserCache = null;
  currentAuthUser = null;
  
  // Supabase専用（環境変数チェック不要）
  const { getDataSourceInstance } = await import('./dataSource');
  const dataSource = getDataSourceInstance();
  await dataSource.sign_out();
};

// authオブジェクトの互換実装（onAuthStateChangedより前に定義）
let currentAuthUser: User | null = null;

// 認証状態が変更されたときにcurrentAuthUserを更新するためのヘルパー
const updateAuthUser = (user: User | null) => {
  currentAuthUser = user;
};

// getCurrentUserのキャッシュ（TTL: 5秒）
let currentUserCache: { user: any; timestamp: number } | null = null;
const CURRENT_USER_CACHE_TTL = 5000; // 5秒

// 現在のユーザーを取得する関数（キャッシュ付き）
const getCurrentUserWithCache = async (forceRefresh: boolean = false): Promise<any> => {
  // キャッシュが有効で、強制リフレッシュでない場合はキャッシュを返す
  if (!forceRefresh && currentUserCache) {
    const now = Date.now();
    if (now - currentUserCache.timestamp < CURRENT_USER_CACHE_TTL) {
      return currentUserCache.user;
    }
  }

  // キャッシュが無効または強制リフレッシュの場合は取得
  let user: any = null;
  
  // Supabase専用（DataSource経由で取得）
  try {
    const { getDataSourceInstance } = await import('./dataSource');
    const dataSource = getDataSourceInstance();
    const result = await dataSource.get_current_user();
    user = result || null;
  } catch (error: any) {
    user = null;
  }

  // キャッシュを更新
  currentUserCache = {
    user,
    timestamp: Date.now(),
  };
  currentAuthUser = user;
  return user;
};

// onAuthStateChanged互換API
export const onAuthStateChanged = (auth: any, callback?: (user: any) => void) => {
  // callbackが関数でない場合、authとcallbackが逆になっている可能性がある
  if (typeof auth === 'function' && !callback) {
    // authが実際にはcallbackで、callbackがundefinedの場合
    callback = auth;
    auth = null; // authは使用しないのでnullでOK
  }

  // callbackが関数であることを確認
  if (typeof callback !== 'function') {
    console.error('onAuthStateChanged: callback must be a function');
    return () => {}; // 空のunsubscribe関数を返す
  }
  
  // Tauri環境では、callTauriCommandが直接@tauri-apps/api/coreを使用するため、
  // __TAURI__のチェックは不要

  // APIが利用可能かチェック
  if (typeof window === 'undefined' || (!isTauri && !isElectron)) {
    console.warn('onAuthStateChanged: Neither Tauri nor Electron API is available');
    updateAuthUser(null);
    callback(null);
    return () => {}; // 空のunsubscribe関数を返す
  }

  // 前回のユーザー状態を保持（変更検出用）
  let previousUserId: string | null = null;

  // ユーザーIDを比較するヘルパー関数
  const getUserIdentifier = (user: any): string | null => {
    return user?.uid || null;
  };

  // 認証状態が変更されたかチェックしてコールバックを呼ぶ
  const checkAndNotify = (user: any) => {
    const currentUserId = getUserIdentifier(user);
    if (currentUserId !== previousUserId) {
      previousUserId = currentUserId;
      updateAuthUser(user || null);
      callback!(user || null);
    }
  };

  // 初回チェック（キャッシュを使用しない）
  getCurrentUserWithCache(true).then((user: any) => {
    previousUserId = getUserIdentifier(user);
    updateAuthUser(user || null);
    callback!(user || null);
  });

  // 定期的にチェック（変更があった場合のみコールバックを呼ぶ）
  // ポーリング間隔を5秒に延長（1秒→5秒）
  const interval = setInterval(() => {
    // キャッシュを使用して取得（変更検知のため、キャッシュが古い場合は更新）
    getCurrentUserWithCache(false).then((user: any) => {
      checkAndNotify(user);
    });
  }, 5000); // 1秒から5秒に変更

  // unsubscribe関数を返す
  return () => {
    clearInterval(interval);
  };
};

// User型の互換実装
export type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

// deleteUser, reauthenticateWithCredential, EmailAuthProvider の互換実装
export const deleteUser = async (user: any) => {
  // Electron版では実装しない
  throw new Error('deleteUser is not implemented in Electron version');
};

export const reauthenticateWithCredential = async (user: any, credential: any) => {
  // Electron版では実装しない
  throw new Error('reauthenticateWithCredential is not implemented in Electron version');
};

export const EmailAuthProvider = {
  credential: (email: string, password: string) => {
    return { email, password };
  },
};

// authオブジェクトの互換実装
export const auth = {
  get currentUser() {
    return currentAuthUser;
  },
  // 現在のユーザーを取得する関数（キャッシュ付き）
  async getCurrentUser(forceRefresh: boolean = false) {
    return getCurrentUserWithCache(forceRefresh);
  },
};

// Firebase互換のスタブ関数（firebase.tsで使用される）
export const getAuth = (app?: any) => {
  return auth;
};

export const getFirestore = (app?: any) => {
  // Tauri環境ではdbは使用しない
  return null;
};

export const getStorage = (app?: any) => {
  // Tauri環境ではstorageは使用しない
  return null;
};

// Firebase Storage互換の関数（Tauri環境では実装しない）
export const ref = (storage: any, path: string) => {
  // Tauri環境では実装しない
  throw new Error('Storage機能はTauri環境では使用できません。ローカルファイルシステムを使用してください。');
};

export const uploadBytes = async (ref: any, data: Blob | Uint8Array | ArrayBuffer) => {
  // Tauri環境では実装しない
  throw new Error('Storage機能はTauri環境では使用できません。ローカルファイルシステムを使用してください。');
};

export const getDownloadURL = async (ref: any) => {
  // Tauri環境では実装しない
  throw new Error('Storage機能はTauri環境では使用できません。ローカルファイルシステムを使用してください。');
};

// 型定義
declare global {
  interface Window {
    electronAPI?: {
      db: {
        signIn: (email: string, password: string) => Promise<any>;
        signUp: (email: string, password: string) => Promise<any>;
        signOut: () => Promise<any>;
        getCurrentUser: () => Promise<any>;
        collection: (collectionName: string) => any;
        query: (collectionName: string, conditions: any) => any;
      };
      fs: {
        readFile: (filePath: string) => Promise<any>;
        writeFile: (filePath: string, data: string) => Promise<any>;
        exists: (filePath: string) => Promise<any>;
      };
      getAppVersion: () => Promise<string>;
      getAppPath: () => Promise<string>;
    };
  }
}
