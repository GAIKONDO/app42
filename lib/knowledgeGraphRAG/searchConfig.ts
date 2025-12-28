/**
 * RAG検索の設定管理
 * 本番環境での検索機能の有効/無効を制御
 */

/**
 * 検索機能の設定
 */
export interface SearchConfig {
  /**
   * BM25検索を有効化するか
   * デフォルト: true（本番環境で有効）
   */
  enableBM25: boolean;

  /**
   * クエリルーターを有効化するか
   * デフォルト: true（本番環境で有効）
   */
  enableRouter: boolean;

  /**
   * ハイブリッド検索をデフォルトで使用するか
   * デフォルト: true（本番環境で有効）
   */
  useHybridSearchByDefault: boolean;
}

/**
 * デフォルト設定（本番環境用）
 */
export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  enableBM25: true,
  enableRouter: true,
  useHybridSearchByDefault: true,
};

/**
 * 設定を取得（環境変数やlocalStorageから読み込み可能）
 */
export function getSearchConfig(): SearchConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_SEARCH_CONFIG;
  }

  try {
    // localStorageから設定を読み込み（オプション）
    const stored = localStorage.getItem('rag_search_config');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_SEARCH_CONFIG,
        ...parsed,
      };
    }
  } catch (error) {
    console.warn('[getSearchConfig] 設定の読み込みエラー:', error);
  }

  return DEFAULT_SEARCH_CONFIG;
}

/**
 * 設定を保存
 */
export function setSearchConfig(config: Partial<SearchConfig>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const current = getSearchConfig();
    const updated = {
      ...current,
      ...config,
    };
    localStorage.setItem('rag_search_config', JSON.stringify(updated));
    console.log('[setSearchConfig] 設定を保存:', updated);
  } catch (error) {
    console.warn('[setSearchConfig] 設定の保存エラー:', error);
  }
}

/**
 * 設定をリセット（デフォルトに戻す）
 */
export function resetSearchConfig(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem('rag_search_config');
    console.log('[resetSearchConfig] 設定をリセットしました');
  } catch (error) {
    console.warn('[resetSearchConfig] 設定のリセットエラー:', error);
  }
}

