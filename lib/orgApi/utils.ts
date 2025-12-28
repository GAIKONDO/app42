/**
 * データベース操作のリトライ関数
 */
export async function retryDbOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  delayMs: number = 200
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || String(error || '');
      const errorString = String(error || '');
      const isLocked = errorMessage.includes('database is locked') || errorString.includes('database is locked');
      
      if (isLocked && i < maxRetries - 1) {
        // 指数バックオフ: 200ms, 400ms, 800ms, 1600ms, 3200ms
        const waitTime = delayMs * Math.pow(2, i);
        console.log(`⚠️ [retryDbOperation] データベースロック検出、${waitTime}ms後にリトライ... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Tauriダイアログを使用した確認
 * Tauri環境では、window.confirmを直接使用します（Tauriのネイティブダイアログは設定が必要なため）
 */
export async function tauriConfirm(message: string, title: string = '確認'): Promise<boolean> {
  try {
    console.log('🔔 [tauriConfirm] 開始:', { title, message: message.substring(0, 100) });
    
    // Tauri環境かどうかを確認
    const isTauri = typeof window !== 'undefined' && (
      '__TAURI__' in window || 
      window.location.port === '3010' ||
      (window.location.hostname === 'localhost' && window.location.port === '3010')
    );

    console.log('🔔 [tauriConfirm] 環境確認:', { isTauri, hasWindow: typeof window !== 'undefined' });

    // window.confirmは同期的な関数なので、Promiseでラップする必要はありませんが、
    // 非同期関数として扱うためにPromiseでラップします
    const fullMessage = `${title}\n\n${message}`;
    
    // Promiseでラップして、確実にbooleanを返すようにします
    return new Promise<boolean>((resolve) => {
      try {
        console.log('🔔 [tauriConfirm] window.confirmを呼び出します');
        const result = window.confirm(fullMessage);
        console.log('🔔 [tauriConfirm] window.confirmの結果:', result);
        resolve(result);
      } catch (error) {
        console.error('❌ [tauriConfirm] window.confirmでエラー:', error);
        // エラーが発生した場合は、デフォルトでfalseを返す
        resolve(false);
      }
    });
  } catch (error) {
    console.error('❌ [tauriConfirm] 確認ダイアログの表示に失敗しました:', error);
    // エラーが発生した場合は、デフォルトでfalseを返す
    return false;
  }
}

/**
 * Tauriダイアログを使用したアラート
 * Tauri環境では、window.alertを直接使用します（Tauriのネイティブダイアログは設定が必要なため）
 */
export async function tauriAlert(message: string, title: string = 'お知らせ'): Promise<void> {
  try {
    const isTauri = typeof window !== 'undefined' && (
      '__TAURI__' in window || 
      window.location.port === '3010' ||
      (window.location.hostname === 'localhost' && window.location.port === '3010')
    );

    if (isTauri) {
      // Tauri環境では、window.alertを直接使用
      // Tauriのネイティブダイアログを使用する場合は、プラグインの設定が必要です
      window.alert(`${title}\n\n${message}`);
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } catch (error) {
    console.warn('⚠️ [tauriAlert] アラートダイアログの表示に失敗しました。フォールバックを使用します。', error);
    window.alert(message);
  }
}

/**
 * ユニークIDを生成
 */
export function generateUniqueId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `init_${timestamp}_${randomPart}`;
}

/**
 * 注力施策のユニークIDを生成（エクスポート）
 */
export function generateUniqueInitiativeId(): string {
  return generateUniqueId();
}

/**
 * 議事録のユニークIDを生成
 */
function generateMeetingNoteId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `meeting_${timestamp}_${randomPart}`;
}

/**
 * 議事録のユニークIDを生成（エクスポート）
 */
export function generateUniqueMeetingNoteId(): string {
  return generateMeetingNoteId();
}

/**
 * 制度のIDを生成（内部関数）
 */
function generateRegulationId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `regulation_${timestamp}_${randomPart}`;
}

/**
 * 制度のユニークIDを生成（エクスポート）
 */
export function generateUniqueRegulationId(): string {
  return generateRegulationId();
}

/**
 * スタートアップのIDを生成
 */
function generateStartupId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `startup_${timestamp}_${randomPart}`;
}

/**
 * スタートアップのユニークIDを生成（エクスポート）
 */
export function generateUniqueStartupId(): string {
  return generateStartupId();
}

/**
 * テーマのユニークIDを生成
 */
export function generateUniqueThemeId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `theme_${timestamp}_${randomPart}`;
}

/**
 * カテゴリーのユニークIDを生成
 */
export function generateUniqueCategoryId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `category_${timestamp}_${randomPart}`;
}

/**
 * VCのユニークIDを生成
 */
export function generateUniqueVcId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `vc_${timestamp}_${randomPart}`;
}

/**
 * 部署のユニークIDを生成
 */
export function generateUniqueDepartmentId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `dept_${timestamp}_${randomPart}`;
}

export function generateUniqueStatusId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `status_${timestamp}_${randomPart}`;
}

export function generateUniqueEngagementLevelId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `engagement_${timestamp}_${randomPart}`;
}

export function generateUniqueBizDevPhaseId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `bizdev_${timestamp}_${randomPart}`;
}

/**
 * 注力施策をJSONファイルから読み込む（現在は未実装）
 */
export async function loadInitiativeFromJson(initiativeId: string): Promise<any | null> {
  // 現在は未実装のため、nullを返す
  return null;
}

/**
 * 注力施策をJSONファイルに保存する（現在は未実装）
 */
export async function saveInitiativeToJson(initiative: any): Promise<void> {
  // 現在は未実装のため、何もしない
  return;
}

