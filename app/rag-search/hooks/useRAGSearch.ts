import { useState } from 'react';
import { searchKnowledgeGraph, searchKnowledgeGraphWithRouter } from '@/lib/knowledgeGraphRAG';
import type { KnowledgeGraphSearchResult } from '@/lib/knowledgeGraphRAG';
import { getSearchConfig } from '@/lib/knowledgeGraphRAG/searchConfig';

interface SearchFilters {
  organizationId?: string;
  entityType?: string;
  relationType?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  filterLogic?: 'AND' | 'OR';
}

interface UseRAGSearchOptions {
  useCache?: boolean;
  onSearchComplete?: (results: KnowledgeGraphSearchResult[], query: string) => void;
  onSearchError?: (error: Error) => void;
}

// 簡易キャッシュ（メモリベース）
const searchCache = new Map<string, { results: KnowledgeGraphSearchResult[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分

// キャッシュをクリアする関数（デバッグ用）
export function clearRAGSearchCache() {
  searchCache.clear();
  console.log('[useRAGSearch] キャッシュをクリアしました');
}

function getCacheKey(query: string, filters: SearchFilters): string {
  return JSON.stringify({ query, filters });
}

export function useRAGSearch(options: UseRAGSearchOptions = {}) {
  const { useCache = true, onSearchComplete, onSearchError } = options;
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<KnowledgeGraphSearchResult[]>([]);

  const search = async (
    query: string,
    filters: SearchFilters = {},
    maxResults: number = 10
  ): Promise<KnowledgeGraphSearchResult[]> => {
    console.log('[useRAGSearch] 検索開始:', { query, filters, maxResults });
    setIsSearching(true);
    setSearchResults([]);

    try {
      // キャッシュチェック
      if (useCache) {
        const cacheKey = getCacheKey(query, filters);
        const cached = searchCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          console.log('[useRAGSearch] キャッシュから取得:', cached.results.length, '件');
          // キャッシュされた結果のスコアを確認
          const invalidScores = cached.results.filter(r => 
            typeof r.score !== 'number' || isNaN(r.score) || r.score <= 0
          );
          if (invalidScores.length > 0) {
            console.warn('[useRAGSearch] キャッシュされた結果に無効なスコアが含まれています。再検索を実行します。', {
              invalidCount: invalidScores.length,
              totalCount: cached.results.length,
              invalidResults: invalidScores.map(r => ({ id: r.id, score: r.score, scoreType: typeof r.score }))
            });
            // 無効なスコアの場合はキャッシュを削除して再検索
            searchCache.delete(cacheKey);
          } else {
            setSearchResults(cached.results);
            if (onSearchComplete) {
              onSearchComplete(cached.results, query);
            }
            setIsSearching(false);
            return cached.results;
          }
        }
      }

      // 検索を実行
      console.log('[useRAGSearch] searchKnowledgeGraphを呼び出し:', {
        query,
        maxResults,
        filters: {
          organizationId: filters.organizationId,
          entityType: filters.entityType,
          relationType: filters.relationType,
        },
      });
      
      // organizationIdが未指定の場合の警告
      if (!filters.organizationId) {
        console.log('[useRAGSearch] organizationIdが未指定のため、全組織横断検索を実行します。');
      }
      
      // 検索設定を取得
      let searchConfig;
      try {
        searchConfig = getSearchConfig();
        console.log('[useRAGSearch] 検索設定:', searchConfig);
      } catch (error) {
        console.error('[useRAGSearch] 検索設定の取得エラー:', error);
        searchConfig = {
          enableBM25: false,
          enableRouter: false,
          useHybridSearchByDefault: false,
        };
      }
      
      // クエリルーターが有効な場合は、ルーターを使用した検索を実行
      let results: KnowledgeGraphSearchResult[];
      try {
        if (searchConfig.enableRouter) {
          console.log('[useRAGSearch] クエリルーターを使用した検索を実行');
          results = await searchKnowledgeGraphWithRouter(
            query,
            maxResults,
            {
              organizationId: filters.organizationId,
              entityType: filters.entityType,
              relationType: filters.relationType,
              createdAfter: filters.createdAfter,
              createdBefore: filters.createdBefore,
              updatedAfter: filters.updatedAfter,
              updatedBefore: filters.updatedBefore,
              filterLogic: filters.filterLogic,
            },
            useCache
          );
        } else {
          // 従来の検索（ベクトル検索のみ、またはハイブリッド検索）
          console.log('[useRAGSearch] 従来の検索を実行（ルーター無効）');
          results = await searchKnowledgeGraph(
            query,
            maxResults,
            {
              organizationId: filters.organizationId,
              entityType: filters.entityType,
              relationType: filters.relationType,
              createdAfter: filters.createdAfter,
              createdBefore: filters.createdBefore,
              updatedAfter: filters.updatedAfter,
              updatedBefore: filters.updatedBefore,
              filterLogic: filters.filterLogic,
            },
            useCache
          );
        }
        
        console.log('[useRAGSearch] 検索結果取得:', results.length, '件');
        if (results.length > 0) {
          console.log('[useRAGSearch] 検索結果のサンプル:', results.slice(0, 3).map(r => ({
            type: r.type,
            id: r.id,
            score: r.score,
          })));
        }
      } catch (searchError: any) {
        console.error('[useRAGSearch] 検索実行エラー:', searchError);
        console.error('[useRAGSearch] エラースタック:', searchError?.stack);
        throw searchError;
      }
      
      setSearchResults(results);
      
      // キャッシュに保存
      if (useCache) {
        const cacheKey = getCacheKey(query, filters);
        searchCache.set(cacheKey, {
          results,
          timestamp: Date.now(),
        });
      }
      
      if (onSearchComplete) {
        onSearchComplete(results, query);
      }

      return results;
    } catch (error: any) {
      console.error('RAG検索エラー:', error);
      const searchError = new Error(error.message || '不明なエラーが発生しました');
      if (onSearchError) {
        onSearchError(searchError);
      }
      setSearchResults([]);
      throw searchError;
    } finally {
      setIsSearching(false);
    }
  };

  return {
    isSearching,
    searchResults,
    search,
    setSearchResults,
  };
}

