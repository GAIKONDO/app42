/**
 * エンティティ埋め込みの管理
 * ChromaDBまたはSupabase（pgvector）を使用した高速ベクトル検索
 * 
 * 注意: このファイルは後方互換性のため残されていますが、
 * 新しいコードでは `lib/vectorSearchAdapter.ts` を使用してください
 */

import { callTauriCommand } from './localFirebase';
import { generateEmbedding, generateMetadataEmbedding } from './embeddings';
import type { EntityEmbedding } from '@/types/entityEmbedding';
import type { Entity } from '@/types/entity';
import { getVectorSearchBackend } from './vectorSearchConfig';
import { saveEntityEmbedding as saveEntityEmbeddingAdapter } from './vectorSearchAdapter';

/**
 * エンティティ埋め込みをChromaDBに保存
 */
export async function saveEntityEmbeddingToChroma(
  entityId: string,
  organizationId: string,
  entity: Entity
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('エンティティ埋め込みの保存はクライアント側でのみ実行可能です');
  }

  try {
    const now = new Date().toISOString();

    // 埋め込みを生成
    const nameEmbedding = await generateEmbedding(entity.name);
    
    // エイリアスとメタデータを含む統合埋め込み
    const combinedParts: string[] = [entity.name];
    if (entity.aliases && entity.aliases.length > 0) {
      combinedParts.push(...entity.aliases);
    }
    if (entity.metadata && Object.keys(entity.metadata).length > 0) {
      combinedParts.push(JSON.stringify(entity.metadata));
    }
    const combinedText = combinedParts.join('\n\n');
    const combinedEmbedding = await generateEmbedding(combinedText);

    // 埋め込みベクトルの次元数をチェック
    if (combinedEmbedding.length !== 1536) {
      throw new Error(`埋め込みベクトルの次元数が一致しません。期待値: 1536, 実際: ${combinedEmbedding.length}`);
    }

    // メタデータ埋め込み（メタデータがある場合のみ）
    let metadataEmbedding: number[] | undefined;
    if (entity.metadata && Object.keys(entity.metadata).length > 0) {
      try {
        const metadataForEmbedding = {
          keywords: entity.aliases || [],
          semanticCategory: entity.type,
          summary: JSON.stringify(entity.metadata),
        };
        metadataEmbedding = await generateMetadataEmbedding(metadataForEmbedding);
        
        if (metadataEmbedding && metadataEmbedding.length !== 1536) {
          metadataEmbedding = undefined;
        }
      } catch (error) {
        console.warn('メタデータ埋め込みの生成に失敗しました:', error);
      }
    }

    // メタデータを準備
    const metadata: Record<string, any> = {
      entityId,
      organizationId,
      companyId: entity.companyId || '',
      name: entity.name,
      type: entity.type,
      aliases: entity.aliases ? JSON.stringify(entity.aliases) : '',
      metadata: entity.metadata ? JSON.stringify(entity.metadata) : '',
      createdAt: now,
      updatedAt: now,
    };

    // 新しい抽象化レイヤーを使用（環境変数でChromaDB/Supabaseを自動切り替え）
    const backend = getVectorSearchBackend();
    if (backend === 'supabase') {
      // Supabaseを使用
      await saveEntityEmbeddingAdapter(
        entityId,
        organizationId,
        entity.companyId || null,
        combinedEmbedding,
        {
          name: entity.name,
          type: entity.type,
          aliases: entity.aliases,
          metadata: entity.metadata,
          embeddingModel: 'text-embedding-3-small',
          embeddingVersion: '1.0',
        }
      );
    } else {
      // ChromaDBを使用（既存の実装）
      await Promise.race([
        callTauriCommand('chromadb_save_entity_embedding', {
          entityId,
          organizationId,
          combinedEmbedding,
          metadata,
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('ChromaDBへの埋め込み保存がタイムアウトしました（60秒）')), 60000)
        )
      ]);
    }
  } catch (error) {
    console.error('ChromaDBへのエンティティ埋め込み保存エラー:', error);
    throw error;
  }
}

/**
 * ChromaDBからエンティティ埋め込みを取得
 */
export async function getEntityEmbeddingFromChroma(
  entityId: string,
  organizationId: string
): Promise<EntityEmbedding | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const result = await Promise.race([
      callTauriCommand('chromadb_get_entity_embedding', {
        entityId,
        organizationId,
      }) as Promise<Record<string, any> | null>,
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('ChromaDBからの埋め込み取得がタイムアウトしました（30秒）')), 30000)
      )
    ]) as Record<string, any> | null;

    if (!result) {
      return null;
    }

    const combinedEmbedding = result.combinedEmbedding as number[] | undefined;
    if (!combinedEmbedding || !Array.isArray(combinedEmbedding) || combinedEmbedding.length === 0) {
      return null;
    }

    const nameEmbeddingStr = result.nameEmbedding as string | undefined;
    const metadataEmbeddingStr = result.metadataEmbedding as string | undefined;
    
    let nameEmbedding: number[] | undefined;
    let metadataEmbedding: number[] | undefined;

    if (nameEmbeddingStr) {
      try {
        nameEmbedding = JSON.parse(nameEmbeddingStr);
      } catch (e) {
        console.warn('nameEmbeddingのパースに失敗しました:', e);
      }
    }

    if (metadataEmbeddingStr) {
      try {
        metadataEmbedding = JSON.parse(metadataEmbeddingStr);
      } catch (e) {
        console.warn('metadataEmbeddingのパースに失敗しました:', e);
      }
    }

    const embedding: EntityEmbedding = {
      id: entityId,
      entityId,
      organizationId,
      combinedEmbedding,
      nameEmbedding,
      metadataEmbedding,
      embeddingModel: (result.embeddingModel as string) || 'text-embedding-3-small',
      embeddingVersion: (result.embeddingVersion as string) || '1.0',
      createdAt: (result.createdAt as string) || new Date().toISOString(),
      updatedAt: (result.updatedAt as string) || new Date().toISOString(),
    };

    return embedding;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes('タイムアウト') || errorMessage.includes('timeout')) {
      console.warn(`ChromaDBからの埋め込み取得がタイムアウトしました: ${entityId}`);
    } else {
      // ChromaDBが初期化されていない場合や、埋め込みが存在しない場合はエラーをログに出力しない
      const errorMessage = (error as any)?.message || String(error || '');
      if (!errorMessage.includes('ChromaDBクライアントが初期化されていません') && 
          !errorMessage.includes('no such table') &&
          !errorMessage.includes('Database error')) {
        // 予期しないエラーのみログに出力
        console.error('ChromaDBからのエンティティ埋め込み取得エラー:', error);
      }
    }
    return null;
  }
}

/**
 * ChromaDBを使用した類似エンティティ検索
 */
export async function findSimilarEntitiesChroma(
  queryText: string,
  limit: number = 5,
  organizationId?: string
): Promise<Array<{ entityId: string; similarity: number }>> {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    // クエリの埋め込みを生成
    const queryEmbedding = await generateEmbedding(queryText);

    // 埋め込みベクトルの次元数をチェック
    if (queryEmbedding.length !== 1536) {
      throw new Error(`埋め込みベクトルの次元数が一致しません。期待値: 1536, 実際: ${queryEmbedding.length}`);
    }

    // organizationIdが未指定の場合、Supabaseから組織IDのリストを取得
    let finalOrganizationId: string | undefined = organizationId;
    if (!finalOrganizationId) {
      try {
        // シンプルにorganizationsテーブルから組織IDのリストを取得
        const { getDataSourceInstance } = await import('./dataSource');
        const dataSource = getDataSourceInstance();
        
        // タイムアウトを設定（3秒）
        const orgsPromise = dataSource.collection_get('organizations');
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 3000);
        });
        
        const orgs = await Promise.race([orgsPromise, timeoutPromise]);
        
        console.log('[findSimilarEntitiesChroma] 組織データ取得結果:', {
          hasOrgs: !!orgs,
          isArray: Array.isArray(orgs),
          length: Array.isArray(orgs) ? orgs.length : 0,
          sample: Array.isArray(orgs) && orgs.length > 0 ? orgs[0] : null,
        });
        
        if (orgs && Array.isArray(orgs) && orgs.length > 0) {
          // 組織IDのリストを抽出
          const orgIds = orgs.map((org: any) => org.id).filter((id: string) => id);
          
          console.log('[findSimilarEntitiesChroma] 抽出した組織ID:', {
            count: orgIds.length,
            sample: orgIds.slice(0, 5),
          });
          
          if (orgIds.length > 0) {
            // 複数の組織がある場合、各組織に対して個別に検索を実行
            console.log(`[findSimilarEntitiesChroma] 全組織横断検索: ${orgIds.length}件の組織を検索します`);
            
            const allResults: Array<{ entityId: string; similarity: number }> = [];
            const searchPromises = orgIds.map(async (orgId: string) => {
              try {
                const orgResults = await callTauriCommand('chromadb_find_similar_entities', {
                  queryEmbedding,
                  limit,
                  organizationId: orgId,
                }) as Array<[string, number]>;
                
                return orgResults.map(([entityId, similarity]) => ({
                  entityId,
                  similarity,
                }));
              } catch (error) {
                console.warn(`[findSimilarEntitiesChroma] 組織 ${orgId} の検索エラー:`, error);
                return [];
              }
            });
            
            const resultsArray = await Promise.all(searchPromises);
            for (const results of resultsArray) {
              allResults.push(...results);
            }
            
            // 類似度でソートして上位limit件を返す
            allResults.sort((a, b) => b.similarity - a.similarity);
            const finalResults = allResults.slice(0, limit);
            
            console.log(`[findSimilarEntitiesChroma] 全組織横断検索結果: ${finalResults.length}件`);
            return finalResults;
          }
        }
        
        console.warn('[findSimilarEntitiesChroma] 組織が見つかりませんでした。organizationIdを未指定のまま検索を続行します。');
      } catch (error) {
        // エラーをログに出力しない（Supabaseエラーが大量に出力されるのを防ぐ）
        console.debug('[findSimilarEntitiesChroma] 組織IDの取得に失敗しました。organizationIdを未指定のまま検索を続行します:', error);
      }
    }

    // Rust側のTauriコマンドを呼び出し
    const results = await callTauriCommand('chromadb_find_similar_entities', {
      queryEmbedding,
      limit,
      organizationId: finalOrganizationId || undefined,
    }) as Array<[string, number]>;

    console.log('[findSimilarEntitiesChroma] ChromaDB検索結果:', {
      resultType: Array.isArray(results) ? 'array' : typeof results,
      resultLength: Array.isArray(results) ? results.length : 0,
      organizationId: organizationId || 'all',
      limit,
      sample: Array.isArray(results) && results.length > 0 ? results.slice(0, 3) : [],
    });

    // 結果が空の場合の警告
    if (Array.isArray(results) && results.length === 0) {
      console.warn('[findSimilarEntitiesChroma] ⚠️ ChromaDBからの検索結果が空です。埋め込みが保存されていない可能性があります。');
      if (organizationId) {
        console.warn('[findSimilarEntitiesChroma] 組織ID:', organizationId, 'の埋め込みを確認してください。');
      } else {
        console.warn('[findSimilarEntitiesChroma] 全組織横断検索を実行しましたが、どの組織にも埋め込みが見つかりませんでした。');
      }
    }

    // 結果を変換
    const mappedResults = results.map(([entityId, similarity]) => ({
      entityId,
      similarity,
    }));
    
    console.log('[findSimilarEntitiesChroma] 変換後の結果:', {
      count: mappedResults.length,
      sample: mappedResults.slice(0, 3),
    });
    
    return mappedResults;
  } catch (error) {
    console.error('ChromaDBでの類似エンティティ検索エラー:', error);
    throw error;
  }
}

/**
 * ChromaDBのエンティティコレクションの件数を取得
 */
export async function countEntitiesInChroma(organizationId: string): Promise<number> {
  if (typeof window === 'undefined') {
    return 0;
  }

  try {
    const count = await callTauriCommand('chromadb_count_entities', {
      organizationId,
    }) as number;
    return count;
  } catch (error) {
    console.error('ChromaDBのエンティティコレクション件数取得エラー:', error);
    return 0;
  }
}

/**
 * ChromaDBからエンティティ埋め込みを削除
 */
export async function deleteEntityEmbeddingFromChroma(entityId: string, organizationId: string): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    await callTauriCommand('chromadb_delete_entity_embedding', {
      entityId,
      organizationId,
    });
  } catch (error) {
    console.error('ChromaDBからのエンティティ埋め込み削除エラー:', error);
    throw error;
  }
}
