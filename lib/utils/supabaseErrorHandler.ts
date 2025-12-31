/**
 * Supabaseエラーハンドリングユーティリティ
 */

export interface SupabaseErrorInfo {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
}

/**
 * Supabaseエラーを解析してユーザーフレンドリーなメッセージに変換
 */
export function parseSupabaseError(error: any): SupabaseErrorInfo {
  // エラーオブジェクトから情報を抽出
  const code = error?.code || error?.error_code;
  const message = error?.message || error?.error_description || String(error);
  const details = error?.details;
  const hint = error?.hint;

  // エラーコードに基づいてメッセージを改善
  let userFriendlyMessage = message;

  switch (code) {
    case 'PGRST116':
      userFriendlyMessage = 'レコードが見つかりません';
      break;
    case '23505':
      userFriendlyMessage = 'このデータは既に存在します（重複エラー）';
      break;
    case '23503':
      userFriendlyMessage = '参照されているデータが存在しません（外部キーエラー）';
      break;
    case '23502':
      userFriendlyMessage = '必須フィールドが不足しています';
      break;
    case '42501':
      userFriendlyMessage = 'アクセス権限がありません';
      break;
    case 'PGRST301':
      userFriendlyMessage = 'リクエストが多すぎます。しばらく待ってから再試行してください';
      break;
    default:
      // メッセージに含まれるキーワードで判定
      if (message.includes('network') || message.includes('fetch')) {
        userFriendlyMessage = 'ネットワークエラーが発生しました。接続を確認してください';
      } else if (message.includes('timeout')) {
        userFriendlyMessage = 'リクエストがタイムアウトしました。しばらく待ってから再試行してください';
      } else if (message.includes('unauthorized') || message.includes('401')) {
        userFriendlyMessage = '認証が必要です。ログインしてください';
      } else if (message.includes('forbidden') || message.includes('403')) {
        userFriendlyMessage = 'アクセス権限がありません';
      } else if (message.includes('not found') || message.includes('404')) {
        userFriendlyMessage = 'リソースが見つかりません';
      }
  }

  return {
    code,
    message: userFriendlyMessage,
    details,
    hint,
  };
}

/**
 * エラーログを出力（開発時のみ詳細ログ）
 */
export function logSupabaseError(error: any, context?: string) {
  const errorInfo = parseSupabaseError(error);
  const isDev = process.env.NODE_ENV === 'development';

  // regulationsテーブルが存在しないエラー（PGRST205）は抑制
  const isRegulationsTableNotFound = errorInfo.code === 'PGRST205' && 
    (errorInfo.message?.includes('regulations') || 
     errorInfo.hint?.includes('regulations') ||
     context?.includes('regulations'));

  if (isRegulationsTableNotFound) {
    // regulationsテーブルが存在しない場合は、エラーをログに出力しない
    return errorInfo;
  }

  // "TypeError: Load failed"エラーはCSPによるブロックなので、ログを抑制
  const isLoadFailedError = errorInfo.message?.includes('Load failed') || 
                            errorInfo.message?.includes('TypeError: Load failed') ||
                            errorInfo.message?.includes('access control checks');

  if (isLoadFailedError) {
    // CSPによるブロックエラーは、デバッグログのみ（本番環境では完全に抑制）
    if (isDev) {
      console.debug(`[Supabase Error]${context ? ` ${context}:` : ''} CSPブロック（Tauriコマンド経由でフォールバック）:`, errorInfo.message);
    }
    return errorInfo;
  }

  if (isDev) {
    console.error(`[Supabase Error]${context ? ` ${context}:` : ''}`, {
      code: errorInfo.code,
      message: errorInfo.message,
      details: errorInfo.details,
      hint: errorInfo.hint,
      originalError: error,
    });
  } else {
    // 本番環境では簡潔なログのみ
    console.error(`[Supabase Error]${context ? ` ${context}:` : ''} ${errorInfo.message}`);
  }

  return errorInfo;
}

/**
 * エラーをユーザーに表示するためのメッセージを生成
 */
export function getUserFriendlyErrorMessage(error: any, context?: string): string {
  const errorInfo = parseSupabaseError(error);
  const contextMessage = context ? `${context}: ` : '';
  return `${contextMessage}${errorInfo.message}`;
}

