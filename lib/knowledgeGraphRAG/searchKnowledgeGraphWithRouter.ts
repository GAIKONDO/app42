/**
 * クエリルーターを使用したナレッジグラフ検索
 * 
 * この関数は自動的にクエリを分析し、最適な検索戦略を選択します。
 */

import { searchKnowledgeGraph } from './searchKnowledgeGraph';

/**
 * クエリルーターを使用したナレッジグラフ検索
 * 
 * @param queryText 検索クエリテキスト
 * @param limit 各タイプごとの最大結果数（デフォルト: 10）
 * @param filters フィルタリング条件（オプション）
 * @param useCache キャッシュを使用するか（デフォルト: true）
 * @param timeoutMs タイムアウト時間（ミリ秒、デフォルト: 10000）
 * @returns 統合検索結果の配列
 */
export async function searchKnowledgeGraphWithRouter(
  queryText: string,
  limit: number = 10,
  filters?: Parameters<typeof searchKnowledgeGraph>[2],
  useCache: boolean = true,
  timeoutMs: number = 10000
) {
  // クエリルーターを有効にして検索
  return await searchKnowledgeGraph(
    queryText,
    limit,
    filters,
    useCache,
    timeoutMs,
    undefined, // hybridConfig（ルーターが自動決定）
    true // useRouter
  );
}

