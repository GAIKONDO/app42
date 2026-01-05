/**
 * Supabaseデータソース実装
 * Supabase SDKを使用してDataSourceインターフェースを実装
 */

import { DataSource } from './dataSource';
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { logSupabaseError } from './utils/supabaseErrorHandler';
import { getSupabaseClient } from './utils/supabaseClient';
import { callTauriCommand } from './localFirebase';

export class SupabaseDataSource implements DataSource {
  private supabase: SupabaseClient;
  private channels: Map<string, RealtimeChannel> = new Map();

  constructor() {
    // シングルトンのSupabaseクライアントを使用
    this.supabase = getSupabaseClient();
  }

  /**
   * テーブル名を正規化（PostgreSQLでは引用符なしの識別子は小文字に変換される）
   * キャメルケースのテーブル名を小文字に変換
   */
  private normalizeTableName(tableName: string): string {
    // 引用符付きテーブル名のリスト（大文字小文字を保持する必要があるテーブル）
    // これらのテーブルは引用符付きで作成されているため、そのまま返す
    const quotedTableNames = [
      'engagementLevels', // "engagementLevels"として作成されている
    ];
    
    // 引用符付きテーブル名の場合はそのまま返す
    if (quotedTableNames.includes(tableName)) {
      return tableName;
    }
    
    // 既に小文字の場合はそのまま返す
    if (tableName === tableName.toLowerCase()) {
      return tableName;
    }
    // キャメルケースのテーブル名を小文字に変換
    // 例: organizationContents -> organizationcontents
    return tableName.toLowerCase();
  }

  /**
   * フィールド名を正規化（PostgreSQLでは引用符なしの識別子は小文字に変換される）
   * キャメルケースのフィールド名を小文字に変換
   * ただし、引用符付きのカラム名（"organizationId"）を持つテーブルの場合はそのまま使用
   */
  private normalizeFieldName(fieldName: string, tableName?: string): string {
    // 引用符付きの場合はそのまま返す（Supabaseクライアントが処理する）
    if (fieldName.startsWith('"') && fieldName.endsWith('"')) {
      return fieldName;
    }
    
    // 引用符付きのカラム名を持つテーブルのリスト
    // これらのテーブルでは、キャメルケースのフィールド名をそのまま使用
    // 注意: entitiesとrelationsは引用符なしで定義されているため、小文字に変換する必要がある
    // topicsテーブルはfix_column_names.sqlでmeetingNoteId, createdAtなどが引用符付きにリネームされている
    const tablesWithQuotedColumns = [
      'startups',
      'focusinitiatives',
      'focusInitiatives',
      'topics',
    ];
    
    // 引用符付きのカラム名を持つフィールドのリスト
    // これらのフィールドは、引用符付きテーブルでのみ引用符付きとして扱う
    // 注意: entities, relations, topicsなどは引用符なしで定義されているため、小文字に変換する
    const quotedFields = [
      'parentCategoryId',
      'methodOther',
      'methodDetails',
      'categoryIds',
      'agencyContractMonth',
      'engagementLevel',
      'bizDevPhase',
      'relatedVCS',
      'responsibleDepartments',
      'hpUrl',
      'asanaUrl',
      'boxUrl',
    ];
    
    const normalizedTableName = tableName ? this.normalizeTableName(tableName) : '';
    
    // organizationsテーブルは引用符付きカラム（"levelName", "parentId", "createdAt", "updatedAt"）を持つ
    // これらのフィールドはそのまま返す
    if (normalizedTableName === 'organizations') {
      const organizationsQuotedFields = ['levelName', 'parentId', 'createdAt', 'updatedAt'];
      if (organizationsQuotedFields.includes(fieldName)) {
        return fieldName;
      }
    }
    
    // organizationMembersテーブルは引用符付きカラムを持つ
    // すべてのキャメルケースのフィールド名をそのまま返す（引用符付きとして扱う）
    if (normalizedTableName === 'organizationmembers') {
      return fieldName;
    }
    
    // 引用符付きのカラム名を持つテーブルの場合、フィールド名をそのまま返す
    if (normalizedTableName && tablesWithQuotedColumns.includes(normalizedTableName)) {
      // 引用符付きテーブルでは、quotedFieldsに含まれるフィールドはそのまま返す
      if (quotedFields.includes(fieldName)) {
        return fieldName;
      }
      // その他のフィールドもそのまま返す（引用符付きテーブルでは引用符付きで定義されている）
      return fieldName;
    }
    
    // 引用符なしで定義されているテーブル（entities, relations, topicsなど）では、
    // すべてのキャメルケースのフィールド名を小文字に変換
    // 既に小文字の場合はそのまま返す
    if (fieldName === fieldName.toLowerCase()) {
      return fieldName;
    }
    
    // キャメルケースのフィールド名を小文字に変換
    // 例: organizationId -> organizationid, semanticCategory -> semanticcategory
    return fieldName.toLowerCase();
  }

  async doc_get(collectionName: string, docId: string): Promise<any> {
    const normalizedTableName = this.normalizeTableName(collectionName);
    
    console.log(`[doc_get] 開始: ${collectionName} (${normalizedTableName}), docId: ${docId}`);
    console.log(`[doc_get] Supabaseクライアント状態:`, {
      hasClient: !!this.supabase,
      url: (this.supabase as any)?._url || 'N/A',
    });
    
    try {
      // まず正規化されたテーブル名で試す
      // .maybeSingle()を使用（レコードが存在しない場合はnullを返し、406エラーを回避）
      console.log(`[doc_get] クエリ実行: from(${normalizedTableName}).select('*').eq('id', ${docId}).maybeSingle()`);
      
      let { data, error } = await this.supabase
        .from(normalizedTableName)
        .select('*')
        .eq('id', docId)
        .maybeSingle();

      console.log(`[doc_get] クエリ結果:`, {
        hasData: !!data,
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message,
      });

      // エラーが発生した場合、詳細をログに記録
      // PGRST116（レコードが見つからない）は正常な動作なので、ログを出力しない
      // CSPブロックエラーもログを出力しない（Tauriコマンドを呼び出すとアプリがクラッシュするため）
      if (error && error.code !== 'PGRST116') {
        const errorMessage = error?.message || String(error || '');
        const isCSPBlockError = error instanceof TypeError ||
                                errorMessage.includes('Load failed') ||
                                errorMessage.includes('TypeError: Load failed') ||
                                errorMessage.includes('access control checks') ||
                                errorMessage.includes('Failed to fetch') ||
                                errorMessage.includes('CORS');
        
        if (!isCSPBlockError) {
          console.error(`[doc_get] エラー発生: ${collectionName}`, {
            errorCode: error.code,
            errorMessage: error.message,
            errorStatus: (error as any).status,
            errorStatusText: (error as any).statusText,
            errorDetails: error.details,
            errorHint: error.hint,
            normalizedTableName,
            docId,
          });
        }
      }

      // 406エラーの場合、元のテーブル名（大文字小文字を保持）で再試行
      // HTTPステータスコード406は、error.statusまたはerror.codeに含まれる可能性がある
      const is406Error = error && (
        error.code === '406' || 
        error.code === 'PGRST301' ||
        (error as any).status === 406 ||
        (error as any).statusCode === 406 ||
        error.message?.includes('Not Acceptable') ||
        error.message?.includes('406')
      );

      if (is406Error) {
        // 406エラーは正常な動作（レコードが存在しない場合など）なので、ログを出力しない
        // 元のテーブル名（大文字小文字を保持）で再試行
        // .maybeSingle()を使用（レコードが存在しない場合はnullを返し、406エラーを回避）
        const retryResult = await this.supabase
          .from(collectionName)
          .select('*')
          .eq('id', docId)
          .maybeSingle();
        
        if (!retryResult.error) {
          // 再試行が成功した場合
          return retryResult.data;
        }
        
        // 再試行も失敗した場合、nullを返す（新規作成として扱う）
        return null;
      }

      if (error) {
        if (error.code === 'PGRST116') {
          // レコードが見つからない場合
          return null;
        }
        const errorInfo = logSupabaseError(error, 'doc_get');
        throw new Error(errorInfo.message);
      }

      return data;
    } catch (err: any) {
      // CSPブロックエラー（TypeError: Load failed）の場合は、Tauriコマンド経由でフォールバック
      const errorMessage = err?.message || String(err || '');
      const errorString = String(err || '');
      const errorStack = err?.stack || '';
      const errorName = err?.name || '';
      
      const isCSPBlockError = 
        err instanceof TypeError ||
        errorMessage.includes('Load failed') ||
        errorMessage.includes('TypeError: Load failed') ||
        errorMessage.includes('access control checks') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('CORS') ||
        errorString.includes('Load failed') ||
        errorString.includes('access control checks') ||
        errorString.includes('Failed to fetch') ||
        errorString.includes('CORS') ||
        errorStack.includes('Load failed') ||
        errorStack.includes('access control checks') ||
        errorName === 'TypeError';

      if (isCSPBlockError) {
        // CSPブロックエラーは静かに処理（ログを出力しない）
        // Tauriコマンドを呼び出すとアプリがクラッシュする可能性があるため、直接nullを返す
        console.debug(`[doc_get] CSPブロックエラー（Tauriコマンドをスキップ）: ${collectionName}/${docId}`);
        return null;
      } else {
        // 予期しないエラー（HTTPエラーなど）をキャッチ
        console.error(`[doc_get] 予期しないエラー: ${collectionName}`, {
          docId,
          normalizedTableName,
          error: err,
          errorMessage: err?.message,
          errorStatus: err?.status,
          errorStatusText: err?.statusText,
          errorStack: err?.stack,
          errorName: err?.name,
          errorType: typeof err,
          supabaseClient: {
            hasClient: !!this.supabase,
            url: (this.supabase as any)?._url || 'N/A',
          },
        });
        
        // 406エラーの可能性がある場合は、元のテーブル名で再試行
        if (err?.status === 406 || err?.statusCode === 406 || err?.message?.includes('406') || err?.message?.includes('Not Acceptable')) {
          console.warn(`⚠️ [doc_get] 406エラー（catch節）、元のテーブル名で再試行: ${collectionName}`);
          try {
            // .maybeSingle()を使用（レコードが存在しない場合はnullを返し、406エラーを回避）
            const retryResult = await this.supabase
              .from(collectionName)
              .select('*')
              .eq('id', docId)
              .maybeSingle();
            
            if (!retryResult.error) {
              console.log(`✅ [doc_get] 再試行成功（catch節）: ${collectionName}`);
              return retryResult.data;
            }
          } catch (retryErr) {
            console.warn(`⚠️ [doc_get] 再試行も失敗（catch節）: ${collectionName}`, retryErr);
          }
        }
      }
      
      // エラーを無視してnullを返す（406エラーの場合は新規作成として扱う）
      return null;
    }
  }

  async doc_set(collectionName: string, docId: string, data: any): Promise<void> {
    const normalizedTableName = this.normalizeTableName(collectionName);
    console.log(`🔍 [doc_set] テーブル名の正規化: ${collectionName} -> ${normalizedTableName}, docId: ${docId}`);
    // パフォーマンス最適化: doc_getを削除し、upsertを使用して1回のリクエストで処理
    // 既存レコードのチェックは不要（upsertが自動的に処理する）
    
    const now = new Date().toISOString();
    
    // データを準備（undefinedのフィールドを除外、nullは保持）
    // 引用符なしで定義されているテーブルでは、キャメルケースのフィールド名を小文字に変換
    // organizationsテーブルは引用符付きカラム（"parentId", "levelName", "createdAt", "updatedAt"）と
    // 小文字カラム（name, title, description, level, position, type）が混在しているため、除外
    const tablesWithLowercaseColumns = ['entities', 'relations', 'topics', 'organizationContents', 'meetingNotes', 'focusInitiatives', 'themes'];
    const useLowercaseColumns = tablesWithLowercaseColumns.includes(normalizedTableName);
    const isOrganizationsTable = normalizedTableName === 'organizations';
    const isOrganizationMembersTable = normalizedTableName === 'organizationmembers';
    
    const cleanedData: any = {};
    for (const [key, value] of Object.entries(data)) {
      // undefinedの場合は除外、nullは保持
      if (value !== undefined) {
        // relationsテーブルではyamlFileIdカラムが存在しないため、除外
        if (normalizedTableName === 'relations' && (key === 'yamlFileId' || key === 'yamlfileid')) {
          continue;
        }
        // organizationsテーブルまたはorganizationMembersテーブルの場合は、normalizeFieldNameで適切に処理
        // organizations: 引用符付きカラムはそのまま、小文字カラムは小文字に変換
        // organizationMembers: すべてのカラム名をそのまま返す（引用符付きとして扱う）
        if ((isOrganizationsTable || isOrganizationMembersTable) && key !== 'id') {
          const normalizedKey = this.normalizeFieldName(key, normalizedTableName);
          cleanedData[normalizedKey] = value;
        } else if (useLowercaseColumns && key !== 'id') {
          // 引用符なしで定義されているテーブルでは、キャメルケースのフィールド名を小文字に変換
          // createdAt, updatedAt, organizationId, companyIdなどを小文字に変換
          const normalizedKey = this.normalizeFieldName(key, normalizedTableName);
          cleanedData[normalizedKey] = value;
        } else {
          cleanedData[key] = value;
        }
      }
    }
    
    const record: any = {
      ...cleanedData,
      id: docId,
    };
    
    // createdAtとupdatedAtを適切な形式で設定
    // 既存のcreatedAt/updatedAtを削除してから設定
    // topicsテーブルはfix_column_names.sqlで引用符付きにリネームされているため、createdAt/updatedAtを使用
    // organizationsテーブルは引用符付きカラム（"createdAt", "updatedAt", "levelName", "parentId"）を持つ
    const isTopicsTable = normalizedTableName === 'topics';
    // isOrganizationMembersTableは既に上で定義されているため、ここでは再定義しない
    
    if (useLowercaseColumns && !isTopicsTable && !isOrganizationsTable && !isOrganizationMembersTable) {
      // 小文字カラムテーブルの場合（organizationMembersテーブルは除外）
      // まず、キャメルケースのcreatedAt/updatedAtを削除（念のため複数回削除）
      delete record.createdAt;
      delete record.updatedAt;
      // データにcreatedatが含まれている場合はそれを使用、含まれていない場合は現在時刻を設定
      const hasCreatedAt = record.createdat !== undefined;
      record.updatedat = now;
      if (!hasCreatedAt) {
        record.createdat = now;
      }
      // meetingNoteIdなどの複合フィールドも小文字に変換
      // 既にnormalizeFieldNameで変換されているはずだが、念のため確認
      const keysToConvert: string[] = [];
      Object.keys(record).forEach(key => {
        if (key !== 'id' && key !== key.toLowerCase() && key !== 'createdat' && key !== 'updatedat') {
          const lowerKey = key.toLowerCase();
          if (!(lowerKey in record)) {
            keysToConvert.push(key);
          }
        }
      });
      keysToConvert.forEach(key => {
        const lowerKey = key.toLowerCase();
        record[lowerKey] = record[key];
        delete record[key];
      });
      // 最後に、createdAt/updatedAtが残っていないか確認して削除
      delete record.createdAt;
      delete record.updatedAt;
    } else {
      // topicsテーブル、organizationsテーブル、またはorganizationMembersテーブルの場合、引用符付きカラムを使用
      delete record.createdat;
      delete record.updatedat;
      // データにcreatedAtが含まれている場合はそれを使用、含まれていない場合は現在時刻を設定
      const hasCreatedAt = record.createdAt !== undefined;
      record.updatedAt = now;
      if (!hasCreatedAt) {
        record.createdAt = now;
      }
    }

    // デバッグログ: recordの内容を確認
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 [doc_set] record内容: ${collectionName}/${docId}`, {
        keys: Object.keys(record),
        hasMeetingNoteId: 'meetingNoteId' in record,
        hasMeetingnoteid: 'meetingnoteid' in record,
        hasCreatedAt: 'createdAt' in record,
        hasCreatedat: 'createdat' in record,
        useLowercaseColumns,
        isOrganizationMembersTable,
      });
    }

    // organizationMembersテーブルの場合、createdAt/updatedAtが残っていないか最終確認
    if (isOrganizationMembersTable) {
      delete record.createdAt;
      delete record.updatedAt;
    }

    // upsertを使用して1回のリクエストで挿入または更新を実行（パフォーマンス最適化）
    console.log(`🔍 [doc_set] Supabaseにupsert実行: テーブル=${normalizedTableName}, docId=${docId}, レコードキー=${Object.keys(record).join(', ')}`);
    console.log(`🔍 [doc_set] レコード内容:`, JSON.stringify(record, null, 2));
    let { error } = await this.supabase
      .from(normalizedTableName)
      .upsert(record, { onConflict: 'id' });

      // 406エラーの場合、元のテーブル名で再試行
      if (error && (
        error.code === '406' || 
        error.code === 'PGRST301' ||
        (error as any).status === 406 ||
        (error as any).statusCode === 406 ||
        error.message?.includes('Not Acceptable') ||
        error.message?.includes('406')
      )) {
        const retryResult = await this.supabase
          .from(collectionName)
          .upsert(record, { onConflict: 'id' });
        
        if (retryResult.error) {
          const errorInfo = logSupabaseError(retryResult.error, 'doc_set (upsert, retry)');
          throw new Error(errorInfo.message);
        }
        console.log(`✅ [doc_set] upsert成功（406エラー後の再試行）: ${collectionName}/${docId}`);
      } else if (!error) {
        console.log(`✅ [doc_set] upsert成功: ${collectionName}/${docId}`);
      } else if (error) {
        // PGRST204エラー（存在しないカラム）の場合、該当カラムを除外して再試行
        // 複数のカラムが存在しない場合でも対応できるようにループ処理を追加
        if (error.code === 'PGRST204' && error.message) {
          const missingColumns = new Set<string>();
          let currentRecord = { ...record };
          let retryCount = 0;
          const maxRetries = 10; // 無限ループを防ぐため、最大再試行回数を設定
          
          // 必須フィールドのリスト（削除してはいけないフィールド）
          // テーブルごとに必須フィールドを定義
          const getRequiredFields = (tableName: string): string[] => {
            const requiredFieldsMap: { [key: string]: string[] } = {
              'organizationmembers': ['id', 'organizationid', 'name'],
              'organizationcontents': ['id', 'organizationid'],
              'entities': ['id', 'name', 'type'],
              'relations': ['id', 'topicid', 'relationtype'],
              'topics': ['id', 'topicid', 'title'],
              'meetingnotes': ['id', 'title'],
              'focusinitiatives': ['id', 'title'],
            };
            return requiredFieldsMap[tableName.toLowerCase()] || ['id'];
          };
          
          const requiredFields = getRequiredFields(normalizedTableName);
          const requiredFieldsLower = requiredFields.map(f => f.toLowerCase());
          
          // 存在しないカラムをすべて収集するまでループ
          while (retryCount < maxRetries) {
            const columnMatch = error.message.match(/Could not find the '([^']+)' column/);
            if (columnMatch && columnMatch[1]) {
              const missingColumn = columnMatch[1];
              const missingColumnLower = missingColumn.toLowerCase();
              
              // 必須フィールドは削除しない
              if (requiredFieldsLower.includes(missingColumnLower)) {
                console.error(`❌ [doc_set] 必須フィールド '${missingColumn}' が存在しません。データベーススキーマを確認してください: ${collectionName}`);
                const errorInfo = logSupabaseError(error, 'doc_set (upsert, required field missing)');
                throw new Error(errorInfo.message);
              }
              
              // 既に処理済みのカラムの場合はループを終了
              if (missingColumns.has(missingColumnLower)) {
                break;
              }
              
              missingColumns.add(missingColumnLower);
              console.warn(`⚠️ [doc_set] カラム '${missingColumn}' が存在しないため、除外します: ${collectionName}`);
              
              // すべてのバリエーションを削除（必須フィールドは保護）
              const removeColumnVariations = (record: any, column: string) => {
                const columnLower = column.toLowerCase();
                
                // 必須フィールドは削除しない
                if (requiredFieldsLower.includes(columnLower)) {
                  return;
                }
                
                // 削除対象のキーを収集（必須フィールドは除外）
                const keysToDelete: string[] = [];
                
                // 1. 元のカラム名
                if (record.hasOwnProperty(column) && !requiredFieldsLower.includes(column.toLowerCase())) {
                  keysToDelete.push(column);
                }
                // 2. 小文字版
                const lowerKey = column.toLowerCase();
                if (record.hasOwnProperty(lowerKey) && !requiredFieldsLower.includes(lowerKey)) {
                  keysToDelete.push(lowerKey);
                }
                // 3. キャメルケース版（最初の文字を大文字に）
                const camelCaseColumn = column.charAt(0).toUpperCase() + column.slice(1);
                if (record.hasOwnProperty(camelCaseColumn) && !requiredFieldsLower.includes(camelCaseColumn.toLowerCase())) {
                  keysToDelete.push(camelCaseColumn);
                }
                // 4. 完全なキャメルケース版（例: meetingnoteid -> meetingNoteId）
                if (lowerKey.includes('note') || lowerKey.includes('topic') || lowerKey.includes('parent')) {
                  const noteMatch = lowerKey.match(/^(.*?)(note|topic|parent)(id)$/);
                  if (noteMatch) {
                    const prefix = noteMatch[1];
                    const word = noteMatch[2];
                    const suffix = noteMatch[3];
                    const camelCase = prefix + word.charAt(0).toUpperCase() + word.slice(1) + suffix.charAt(0).toUpperCase() + suffix.slice(1);
                    if (record.hasOwnProperty(camelCase) && !requiredFieldsLower.includes(camelCase.toLowerCase())) {
                      keysToDelete.push(camelCase);
                    }
                    if (record.hasOwnProperty(lowerKey) && !requiredFieldsLower.includes(lowerKey)) {
                      keysToDelete.push(lowerKey);
                    }
                  }
                }
                // 5. すべてのキーをチェックして、大文字小文字を無視して一致するものも削除（必須フィールドは保護）
                Object.keys(record).forEach(key => {
                  if (key.toLowerCase() === columnLower && !requiredFieldsLower.includes(key.toLowerCase())) {
                    keysToDelete.push(key);
                  }
                });
                
                // 重複を削除してから削除実行
                const uniqueKeysToDelete = Array.from(new Set(keysToDelete));
                uniqueKeysToDelete.forEach(key => {
                  delete record[key];
                });
              };
              
              removeColumnVariations(currentRecord, missingColumn);
              
              // 再試行
              const retryResult = await this.supabase
                .from(normalizedTableName)
                .upsert(currentRecord, { onConflict: 'id' });
              
              if (!retryResult.error) {
                // 成功した場合
                const columnsList = Array.from(missingColumns).join(', ');
                console.warn(`⚠️ [doc_set] カラム '${columnsList}' を除外して保存しました。SQLスクリプトを実行してカラムを追加してください。`);
                return;
              }
              
              // 別のカラムが存在しない場合、エラーメッセージを更新してループを続行
              if (retryResult.error.code === 'PGRST204') {
                error = retryResult.error;
                retryCount++;
                continue;
              } else {
                // その他のエラーの場合はスロー
                const errorInfo = logSupabaseError(retryResult.error, 'doc_set (upsert, column removed)');
                throw new Error(errorInfo.message);
              }
            } else {
              // カラム名が抽出できない場合はループを終了
              break;
            }
          }
          
          // 最大再試行回数に達した場合
          if (retryCount >= maxRetries) {
            const columnsList = Array.from(missingColumns).join(', ');
            console.error(`❌ [doc_set] 最大再試行回数に達しました。除外したカラム: ${columnsList}`);
            const errorInfo = logSupabaseError(error, 'doc_set (upsert, max retries reached)');
            throw new Error(errorInfo.message);
          }
        }
        const errorInfo = logSupabaseError(error, 'doc_set (upsert)');
        throw new Error(errorInfo.message);
      }
  }

  async doc_update(collectionName: string, docId: string, data: any): Promise<void> {
    const normalizedTableName = this.normalizeTableName(collectionName);
    const now = new Date().toISOString();
    let { error } = await this.supabase
      .from(normalizedTableName)
      .update({
        ...data,
        updatedAt: now,
      })
      .eq('id', docId);

    // 406エラーの場合、元のテーブル名で再試行
    if (error && (
      error.code === '406' || 
      error.code === 'PGRST301' ||
      (error as any).status === 406 ||
      (error as any).statusCode === 406 ||
      error.message?.includes('Not Acceptable') ||
      error.message?.includes('406')
    )) {
      const retryResult = await this.supabase
        .from(collectionName)
        .update({
          ...data,
          updatedAt: now,
        })
        .eq('id', docId);
      
      if (retryResult.error) {
        const errorInfo = logSupabaseError(retryResult.error, 'doc_update (retry)');
        throw new Error(errorInfo.message);
      }
    } else if (error) {
      const errorInfo = logSupabaseError(error, 'doc_update');
      throw new Error(errorInfo.message);
    }
  }

  async doc_delete(collectionName: string, docId: string): Promise<void> {
    const normalizedTableName = this.normalizeTableName(collectionName);
    console.log(`🗑️ [doc_delete] 削除開始: ${collectionName} -> ${normalizedTableName}/${docId}`);
    
    let { data, error } = await this.supabase
      .from(normalizedTableName)
      .delete()
      .eq('id', docId)
      .select();

    // 406エラーの場合、元のテーブル名で再試行
    if (error && (
      error.code === '406' || 
      error.code === 'PGRST301' ||
      (error as any).status === 406 ||
      (error as any).statusCode === 406 ||
      error.message?.includes('Not Acceptable') ||
      error.message?.includes('406')
    )) {
      console.log(`🔄 [doc_delete] 406エラー発生（正規化テーブル名: ${normalizedTableName}）、元のテーブル名で再試行: ${collectionName}`, {
        errorCode: error.code,
        errorStatus: (error as any).status,
        errorMessage: error.message,
      });
      
      const retryResult = await this.supabase
        .from(collectionName)
        .delete()
        .eq('id', docId)
        .select();
      
      if (retryResult.error) {
        // 再試行でもエラーが発生した場合、より詳細なエラー情報を出力
        const retryError = retryResult.error;
        console.error(`❌ [doc_delete] 再試行も失敗:`, {
          collectionName,
          normalizedTableName,
          docId,
          retryErrorCode: retryError.code,
          retryErrorStatus: (retryError as any).status,
          retryErrorMessage: retryError.message,
          originalErrorCode: error.code,
          originalErrorStatus: (error as any).status,
          originalErrorMessage: error.message,
        });
        
        // レコードが見つからないエラー（PGRST116）の場合は成功として扱う
        if (retryError.code === 'PGRST116' || retryError.message?.includes('No rows found')) {
          console.log(`ℹ️ [doc_delete] 再試行でレコードが見つかりません（既に削除済み）: ${collectionName}/${docId}`);
          return;
        }
        
        const errorInfo = logSupabaseError(retryError, 'doc_delete (retry)');
        throw new Error(errorInfo.message);
      }
      
      console.log(`✅ [doc_delete] 再試行成功: ${collectionName}/${docId}`);
    } else if (error) {
      // レコードが見つからないエラー（PGRST116）の場合は成功として扱う
      if (error.code === 'PGRST116' || error.message?.includes('No rows found')) {
        console.log(`ℹ️ [doc_delete] レコードが見つかりません（既に削除済み）: ${collectionName}/${docId}`);
        return;
      }
      
      const errorInfo = logSupabaseError(error, 'doc_delete');
      throw new Error(errorInfo.message);
    } else {
      // 削除が成功した場合
      if (data && data.length > 0) {
        console.log(`✅ [doc_delete] 削除成功: ${collectionName}/${docId} (${data.length}件)`);
      } else {
        console.log(`ℹ️ [doc_delete] 削除対象が見つかりませんでした: ${collectionName}/${docId}`);
      }
    }
  }

  async collection_get(collectionName: string, conditions?: any): Promise<any[]> {
    const normalizedTableName = this.normalizeTableName(collectionName);
    // パフォーマンス最適化: 必要なカラムのみを選択（conditions.columnsが指定されている場合）
    const selectColumns = conditions?.columns || '*';
    
    try {
      let query = this.supabase.from(normalizedTableName).select(selectColumns);

      // 条件を適用
      if (conditions) {
        // 複数のWHERE条件をサポート
        if (conditions.filters && Array.isArray(conditions.filters)) {
          for (const filter of conditions.filters) {
            if (filter.field && filter.operator && filter.value !== undefined) {
              const operator = filter.operator === '==' ? 'eq' : filter.operator;
              // PostgreSQLでは引用符なしの識別子は小文字に変換されるため、フィールド名も正規化
              // ただし、引用符付きのカラム名（"organizationId"）を持つテーブルの場合はそのまま使用
              const normalizedField = this.normalizeFieldName(filter.field, normalizedTableName);
              query = query.filter(normalizedField, operator, filter.value);
            }
          }
        } else if (conditions.field && conditions.operator && conditions.value !== undefined) {
          // 単一のWHERE条件（後方互換性のため）
          const operator = conditions.operator === '==' ? 'eq' : conditions.operator;
          const normalizedField = this.normalizeFieldName(conditions.field, normalizedTableName);
          query = query.filter(normalizedField, operator, conditions.value);
        }

        // ORDER BY
        if (conditions.orderBy) {
          const ascending = conditions.orderDirection !== 'desc';
          // PostgreSQLでは引用符なしの識別子は小文字に変換されるため、orderByも正規化
          // ただし、引用符付きのカラム名を持つテーブルの場合はそのまま使用
          // focusInitiativesテーブルではcreatedAt/updatedAtが引用符なしのため、createdat/updatedat（小文字）を使用
          const normalizedOrderBy = this.normalizeFieldName(conditions.orderBy, normalizedTableName);
          query = query.order(normalizedOrderBy, { ascending });
        }

        // LIMIT
        if (conditions.limit) {
          query = query.limit(conditions.limit);
        }
      }

      let { data, error } = await query;

    // CSPブロックエラーの場合は、Tauriコマンド経由でフォールバック
    if (error && (
      error instanceof TypeError ||
      error?.message?.includes('Load failed') ||
      error?.message?.includes('TypeError: Load failed') ||
      error?.message?.includes('access control checks') ||
      error?.message?.includes('Failed to fetch') ||
      error?.name === 'TypeError'
    )) {
      // CSPブロックエラーは静かに処理（ログを出力しない）
      // Tauriコマンドを呼び出すとアプリがクラッシュする可能性があるため、直接空配列を返す
      console.debug(`[collection_get] CSPブロックエラー（Tauriコマンドをスキップ）: ${collectionName}`);
      return [];
    }

    // 406エラーの場合、元のテーブル名で再試行
    // 406エラーは正常な動作（テーブル名の正規化の問題）なので、ログを出力しない
    if (error && (
      error.code === '406' || 
      error.code === 'PGRST301' ||
      (error as any).status === 406 ||
      (error as any).statusCode === 406 ||
      error.message?.includes('Not Acceptable') ||
      error.message?.includes('406')
    )) {
      // 元のテーブル名で再構築
      let retryQuery = this.supabase.from(collectionName).select(selectColumns);

      // 条件を再適用
      if (conditions) {
        if (conditions.filters && Array.isArray(conditions.filters)) {
          for (const filter of conditions.filters) {
            if (filter.field && filter.operator && filter.value !== undefined) {
              const operator = filter.operator === '==' ? 'eq' : filter.operator;
              const normalizedField = this.normalizeFieldName(filter.field, collectionName);
              retryQuery = retryQuery.filter(normalizedField, operator, filter.value);
            }
          }
        } else if (conditions.field && conditions.operator && conditions.value !== undefined) {
          const operator = conditions.operator === '==' ? 'eq' : conditions.operator;
          const normalizedField = this.normalizeFieldName(conditions.field, collectionName);
          retryQuery = retryQuery.filter(normalizedField, operator, conditions.value);
        }

        if (conditions.orderBy) {
          const ascending = conditions.orderDirection !== 'desc';
          const normalizedOrderBy = this.normalizeFieldName(conditions.orderBy, collectionName);
          retryQuery = retryQuery.order(normalizedOrderBy, { ascending });
        }

        if (conditions.limit) {
          retryQuery = retryQuery.limit(conditions.limit);
        }
      }

      const retryResult = await retryQuery;
      
      if (retryResult.error) {
        const errorInfo = logSupabaseError(retryResult.error, 'collection_get (retry)');
        throw new Error(errorInfo.message);
      }
      
      return retryResult.data || [];
    }

    if (error) {
      const errorInfo = logSupabaseError(error, 'collection_get');
      // regulationsテーブルが存在しないエラー（PGRST205）は例外をスローしない
      const isRegulationsTableNotFound = errorInfo.code === 'PGRST205' && 
        (errorInfo.message?.includes('regulations') || 
         errorInfo.hint?.includes('regulations') ||
         normalizedTableName === 'regulations');
      
      if (isRegulationsTableNotFound) {
        // regulationsテーブルが存在しない場合は、空配列を返す
        return [];
      }
      
      throw new Error(errorInfo.message);
    }

      return data || [];
    } catch (err: any) {
      // CSPブロックエラー（TypeError: Load failed）の場合は、Tauriコマンド経由でフォールバック
      const errorMessage = err?.message || String(err || '');
      const errorString = String(err || '');
      const errorStack = err?.stack || '';
      const errorName = err?.name || '';
      
      const isCSPBlockError = 
        err instanceof TypeError ||
        errorMessage.includes('Load failed') ||
        errorMessage.includes('TypeError: Load failed') ||
        errorMessage.includes('access control checks') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('CORS') ||
        errorString.includes('Load failed') ||
        errorString.includes('access control checks') ||
        errorString.includes('Failed to fetch') ||
        errorString.includes('CORS') ||
        errorStack.includes('Load failed') ||
        errorStack.includes('access control checks') ||
        errorName === 'TypeError';

      if (isCSPBlockError) {
        // CSPブロックエラーは静かに処理（ログを出力しない）
        // Tauriコマンドを呼び出すとアプリがクラッシュする可能性があるため、直接空配列を返す
        console.debug(`[collection_get] CSPブロックエラー（Tauriコマンドをスキップ）: ${collectionName}`);
        return [];
      }
      
      // その他のエラーは再スロー
      throw err;
    }
  }

  async collection_add(collectionName: string, data: any): Promise<string> {
    // UUIDを生成（crypto.randomUUIDを使用、フォールバックとしてDateベースのID）
    const docId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const record = {
      ...data,
      id: docId,
      createdAt: now,
      updatedAt: now,
    };

    const normalizedTableName = this.normalizeTableName(collectionName);
    let { error } = await this.supabase
      .from(normalizedTableName)
      .insert(record);

    // 406エラーの場合、元のテーブル名で再試行
    if (error && (
      error.code === '406' || 
      error.code === 'PGRST301' ||
      (error as any).status === 406 ||
      (error as any).statusCode === 406 ||
      error.message?.includes('Not Acceptable') ||
      error.message?.includes('406')
    )) {
      const retryResult = await this.supabase
        .from(collectionName)
        .insert(record);
      
      if (retryResult.error) {
        const errorInfo = logSupabaseError(retryResult.error, 'collection_add (retry)');
        throw new Error(errorInfo.message);
      }
    } else if (error) {
      const errorInfo = logSupabaseError(error, 'collection_add');
      throw new Error(errorInfo.message);
    }

    return docId;
  }

  async query_get(collectionName: string, conditions?: any): Promise<any[]> {
    // collection_getと同じ実装
    return this.collection_get(collectionName, conditions);
  }

  async sign_in(email: string, password: string): Promise<any> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // メール確認が必要な場合の特別な処理
      if (error.code === 'email_not_confirmed' || error.message?.includes('Email not confirmed')) {
        throw new Error('メール確認が必要です。登録時に送信されたメールを確認してください。\n\n開発環境では、Supabaseダッシュボードで「Auto Confirm User」を有効にするか、認証設定でメール確認を無効にしてください。');
      }
      const errorInfo = logSupabaseError(error, 'sign_in');
      throw new Error(errorInfo.message);
    }

    return {
      user: {
        uid: data.user?.id,
        email: data.user?.email,
        emailVerified: data.user?.email_confirmed_at !== null,
      },
    };
  }

  async sign_up(email: string, password: string): Promise<any> {
    // Supabaseの認証設定で、メール確認をスキップするオプションを追加
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined, // リダイレクトURLを設定しない
        // メール確認をスキップする設定（Supabaseの設定で有効な場合）
      },
    });

    if (error) {
      const errorInfo = logSupabaseError(error, 'sign_up');
      throw new Error(errorInfo.message);
    }

    // auth.usersにユーザーが作成された後、public.usersテーブルにもレコードを作成
    if (data.user) {
      try {
        const authUserId = data.user.id;
        const userEmail = data.user.email || email;
        
        // public.usersテーブルにレコードを作成
        // auth.usersのIDをpublic.usersのIDとして使用
        // passwordHashはダミー値（認証はauth.usersで管理するため、実際には使用されない）
        // 開発環境では自動承認（approved: 1）
        const { error: insertError } = await this.supabase
          .from('users')
          .insert({
            id: authUserId, // auth.usersのIDを使用
            email: userEmail,
            passwordHash: '[SUPABASE_AUTH]', // 認証はauth.usersで管理するためダミー値（実際には使用されない）
            approved: 1, // 開発環境では自動承認
            approvedBy: 'system', // システムによる自動承認
            approvedAt: new Date().toISOString(),
            role: 'user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

        if (insertError) {
          // 既に存在する場合はエラーを無視（重複登録の可能性）
          if (!insertError.message?.includes('duplicate') && !insertError.code?.includes('23505')) {
            console.warn('[sign_up] public.usersテーブルへのレコード作成に失敗:', insertError);
          }
        } else {
          console.log('[sign_up] public.usersテーブルにレコードを作成しました:', { id: authUserId, email: userEmail });
        }
      } catch (userInsertError: any) {
        // エラーが発生しても認証は成功しているので、警告のみ
        console.warn('[sign_up] public.usersテーブルへのレコード作成中にエラー:', userInsertError);
      }
    }

    return {
      user: {
        uid: data.user?.id,
        email: data.user?.email,
        emailVerified: data.user?.email_confirmed_at !== null,
      },
    };
  }

  async sign_out(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      const errorInfo = logSupabaseError(error, 'sign_out');
      throw new Error(errorInfo.message);
    }
  }

  async get_current_user(): Promise<any | null> {
    const { data: { user }, error } = await this.supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      uid: user.id,
      email: user.email,
      emailVerified: user.email_confirmed_at !== null,
    };
  }

  // リアルタイム同期
  subscribe(table: string, callback: (payload: any) => void): () => void {
    const normalizedTableName = this.normalizeTableName(table);
    const channelName = `${normalizedTableName}-changes`;
    
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: normalizedTableName,
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    this.channels.set(table, channel);

    // unsubscribe関数を返す
    return () => {
      this.unsubscribe(table);
    };
  }

  unsubscribe(table: string): void {
    const channel = this.channels.get(table);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.channels.delete(table);
    }
  }
}

