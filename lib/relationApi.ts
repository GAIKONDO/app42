/**
 * リレーションAPI
 * ナレッジグラフで使用するリレーションの操作を行う
 */

import type {
  Relation,
  CreateRelationInput,
  UpdateRelationInput,
  RelationType,
  RelationValidationResult,
} from '@/types/relation';
import { callTauriCommand } from './localFirebase';
import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import { getEntityById } from './entityApi';
import { saveRelationEmbeddingAsync } from './relationEmbeddings';

/**
 * リレーションを作成
 */
// 重複チェック用：最近作成されたリレーションを追跡（5秒以内）
const recentlyCreatedRelations = new Map<string, { timestamp: number; relation: CreateRelationInput }>();

export async function createRelation(relation: CreateRelationInput): Promise<Relation> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    
    // 重複チェック：既存のリレーションを確認（常に実行）
    const relationKey = `${relation.topicId || ''}_${relation.sourceEntityId}_${relation.targetEntityId}_${relation.relationType}`;
    const recentRelation = recentlyCreatedRelations.get(relationKey);
    const now = Date.now();
    
    // 既存のリレーションをデータベースから確認
    if (relation.topicId) {
      try {
        const { getRelationsByTopicId } = await import('./relationApi');
        const existingRelations = await getRelationsByTopicId(relation.topicId);
        const duplicate = existingRelations.find(r => 
          r.sourceEntityId === relation.sourceEntityId &&
          r.targetEntityId === relation.targetEntityId &&
          r.relationType === relation.relationType
        );
        if (duplicate) {
          console.log(`✅ [createRelation] 既存のリレーションを返します（重複防止）:`, {
            existingId: duplicate.id,
            topicId: relation.topicId,
            sourceEntityId: relation.sourceEntityId,
            targetEntityId: relation.targetEntityId,
            relationType: relation.relationType,
          });
          return duplicate;
        }
      } catch (error) {
        console.warn(`⚠️ [createRelation] 既存リレーションの確認に失敗しました（続行）:`, error);
      }
    }
    
    // 最近作成されたリレーションのチェック（5秒以内）
    if (recentRelation && (now - recentRelation.timestamp) < 5000) {
      console.warn(`⚠️ [createRelation] 重複リレーション作成を検出（最近作成）:`, {
        relationKey,
        recentTimestamp: new Date(recentRelation.timestamp).toISOString(),
        currentTimestamp: new Date(now).toISOString(),
        timeDiff: now - recentRelation.timestamp,
      });
      // 既存のリレーションを再度確認
      if (relation.topicId) {
        try {
          const { getRelationsByTopicId } = await import('./relationApi');
          const existingRelations = await getRelationsByTopicId(relation.topicId);
          const duplicate = existingRelations.find(r => 
            r.sourceEntityId === relation.sourceEntityId &&
            r.targetEntityId === relation.targetEntityId &&
            r.relationType === relation.relationType
          );
          if (duplicate) {
            console.log(`✅ [createRelation] 既存のリレーションを返します（重複防止）: ${duplicate.id}`);
            return duplicate;
          }
        } catch (error) {
          console.warn(`⚠️ [createRelation] 既存リレーションの確認に失敗しました（続行）:`, error);
        }
      }
      // 既存のリレーションが見つからない場合は新規作成を続行
      console.log(`⚠️ [createRelation] 既存のリレーションが見つからないため、新規作成を続行します`);
    }
    
    const id = `relation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    const relationData: Relation = {
      ...relation,
      id,
      createdAt: createdAt,
      updatedAt: createdAt,
      // topicIdとyamlFileIdがundefinedの場合、明示的にnullを設定（CHECK制約対応）
      topicId: relation.topicId === undefined ? null : relation.topicId,
      yamlFileId: relation.yamlFileId === undefined ? null : relation.yamlFileId,
    };
    
    // 重複チェック用のマップに追加
    recentlyCreatedRelations.set(relationKey, { timestamp: now, relation });
    // 5秒後に削除（メモリリーク防止）
    setTimeout(() => {
      recentlyCreatedRelations.delete(relationKey);
    }, 5000);

    // バリデーション
    const validation = await validateRelation(relationData);
    if (!validation.isValid) {
      throw new Error(`リレーションのバリデーションエラー: ${validation.errors.join(', ')}`);
    }

    // Supabase使用時はDataSource経由で作成
    if (useSupabase) {
      try {
        console.log('📝 [createRelation] Supabase経由でリレーションを作成します:', {
          relationId: id,
          topicId: relationData.topicId,
          sourceEntityId: relationData.sourceEntityId,
          targetEntityId: relationData.targetEntityId,
        });
        
        // undefinedをnullに変換（データベースのNOT NULL制約対応）
        const relationDataForDb: any = {
          ...relationData,
        };
        // undefinedの値をnullに変換
        Object.keys(relationDataForDb).forEach(key => {
          if (relationDataForDb[key] === undefined) {
            relationDataForDb[key] = null;
          }
        });
        
        // Supabaseスキーマに存在しないカラムを除外（yamlFileId）
        // SupabaseのrelationsテーブルにはyamlFileIdカラムが存在しないため、事前に除外
        if (relationDataForDb.yamlFileId !== undefined && relationDataForDb.yamlFileId !== null) {
          delete relationDataForDb.yamlFileId;
        }
        
        // metadataをJSON文字列に変換
        if (relationDataForDb.metadata && typeof relationDataForDb.metadata === 'object') {
          relationDataForDb.metadata = JSON.stringify(relationDataForDb.metadata);
        }
        
        // Supabaseに保存
        const { setDocViaDataSource } = await import('./dataSourceAdapter');
        await setDocViaDataSource('relations', id, relationDataForDb);
        console.log('✅ [createRelation] Supabase経由でリレーションを作成しました:', id);
        
        // 埋め込みを非同期で生成（エラーは無視）
        // Graphvizのリレーションの場合、topicIdはnullになるが、空文字列として扱う
        console.log(`[createRelation] 埋め込み生成チェック: organizationId=${relation.organizationId}, companyId=${relation.companyId}`);
        if (relation.organizationId) {
          const topicIdForEmbedding = relation.topicId || '';
          console.log(`[createRelation] リレーション埋め込み生成を開始: ${id}, organizationId=${relation.organizationId}, topicId=${topicIdForEmbedding}`);
          saveRelationEmbeddingAsync(id, topicIdForEmbedding, relation.organizationId)
            .then((success) => {
              if (success) {
                console.log(`✅ [createRelation] リレーション埋め込み生成成功: ${id}`);
              } else {
                console.warn(`⚠️ [createRelation] リレーション埋め込み生成が失敗しました（続行します）: ${id}`);
              }
            })
            .catch(error => {
              console.error('❌ [createRelation] リレーション埋め込みの生成に失敗しました（続行します）:', {
                relationId: id,
                relationType: relation.relationType,
                topicId: relation.topicId,
                topicIdForEmbedding,
                yamlFileId: relation.yamlFileId,
                organizationId: relation.organizationId,
                error: error?.message || String(error),
                stack: error?.stack,
              });
            });
        } else if (relation.companyId) {
          console.log(`ℹ️ [createRelation] companyIdが設定されていますが、事業会社用の埋め込み生成は未実装です: ${relation.relationType} (${id})`);
        } else {
          console.warn(`⚠️ [createRelation] organizationIdもcompanyIdも設定されていないため、埋め込み生成をスキップ: ${relation.relationType} (${id})`);
        }
        
        return relationData;
      } catch (supabaseError: any) {
        console.error('❌ [createRelation] Supabase経由の作成に失敗:', supabaseError);
        throw supabaseError;
      }
    }

    // SQLite使用時は既存のロジック
    try {
      // Rust API経由で作成（未実装の場合はフォールバック）
      const createdRelation = await apiPost<Relation>('/api/relations', relationData);
      console.log('✅ [createRelation] Rust API経由でリレーションを作成:', {
        relationId: createdRelation.id,
        topicId: createdRelation.topicId,
        sourceEntityId: createdRelation.sourceEntityId,
        targetEntityId: createdRelation.targetEntityId,
      });
      return createdRelation;
    } catch (error) {
      // フォールバック: Tauriコマンド経由
      console.warn('⚠️ [createRelation] Rust API経由の作成に失敗、Tauriコマンドにフォールバック:', error);
      console.log('📊 [createRelation] Tauriコマンド経由でリレーションを作成:', {
        relationId: id,
        topicId: relationData.topicId,
        sourceEntityId: relationData.sourceEntityId,
        targetEntityId: relationData.targetEntityId,
      });
      // undefinedをnullに変換（データベースのNOT NULL制約対応）
      const relationDataForDb: any = {
        ...relationData,
      };
      // undefinedの値をnullに変換
      Object.keys(relationDataForDb).forEach(key => {
        if (relationDataForDb[key] === undefined) {
          relationDataForDb[key] = null;
        }
      });
      
      await callTauriCommand('doc_set', {
        collectionName: 'relations',
        docId: id,
        data: relationDataForDb,
      });
      
      // 埋め込みを非同期で生成（エラーは無視）
      // Graphvizのリレーションの場合、topicIdはnullになるが、空文字列として扱う
      if (relation.organizationId) {
        const topicIdForEmbedding = relation.topicId || '';
        saveRelationEmbeddingAsync(id, topicIdForEmbedding, relation.organizationId).catch(error => {
          console.error('❌ [createRelation] リレーション埋め込みの生成に失敗しました（続行します）:', {
            relationId: id,
            relationType: relation.relationType,
            topicId: relation.topicId,
            topicIdForEmbedding,
            yamlFileId: relation.yamlFileId,
            organizationId: relation.organizationId,
            error: error?.message || String(error),
            stack: error?.stack,
            timestamp: new Date().toISOString(),
          });
        });
      } else if (relation.companyId) {
        // 事業会社用の埋め込み生成（将来的に実装）
        console.log(`ℹ️ [createRelation] companyIdが設定されていますが、事業会社用の埋め込み生成は未実装です: ${relation.relationType} (${id})`);
      } else {
        console.warn(`⚠️ [createRelation] organizationIdもcompanyIdも設定されていないため、埋め込み生成をスキップ: ${relation.relationType} (${id})`);
      }
      
      return relationData;
    }
  } catch (error: any) {
    console.error('❌ [createRelation] エラー:', error);
    throw error;
  }
}

/**
 * 複数のリレーションIDで一括取得（並列処理、パフォーマンス最適化）
 * @param relationIds リレーションIDの配列
 * @param concurrencyLimit 並列実行数の制限（デフォルト: 5）
 * @returns リレーションの配列（存在しないIDは除外）
 */
export async function getRelationsByIds(
  relationIds: string[],
  concurrencyLimit: number = 5
): Promise<Relation[]> {
  if (relationIds.length === 0) {
    return [];
  }

  // p-limitを使用して並列数を制限
  const pLimit = (await import('p-limit')).default;
  const limit = pLimit(concurrencyLimit);

  try {
    // 並列で取得
    const results = await Promise.allSettled(
      relationIds.map(id => 
        limit(async () => {
          try {
            return await getRelationById(id);
          } catch (error: any) {
            // 個別のエラーは無視してnullを返す（CORSエラーなど）
            const errorMessage = error?.message || String(error || '');
            if (!errorMessage.includes('access control checks') && 
                !errorMessage.includes('CORS') &&
                !errorMessage.includes('Tauri環境ではありません')) {
              console.warn(`[getRelationsByIds] リレーション ${id} の取得エラー:`, error);
            }
            return null;
          }
        })
      )
    );

    // 成功した結果のみを返す
    const relations: Relation[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        relations.push(result.value);
      }
    }

    return relations;
  } catch (error) {
    console.error('❌ [getRelationsByIds] エラー:', error);
    return [];
  }
}

/**
 * リレーションIDで取得（Supabase対応）
 */
export async function getRelationById(relationId: string): Promise<Relation | null> {
  try {
    const { getDataSourceInstance } = await import('./dataSource');
    const dataSource = getDataSourceInstance();
    
    const data = await dataSource.doc_get('relations', relationId);
    
    if (!data) {
      // リレーションが見つからない場合は警告を出力しない
      return null;
    }
    
    // Supabaseから取得したデータをRelation形式に変換
    const relation: Relation = {
      id: data.id || relationId,
      topicId: data.topicId || data.topicid || undefined,
      yamlFileId: data.yamlFileId || data.yamlfileid || undefined,
      organizationId: data.organizationId || data.organizationid || null,
      companyId: data.companyId || data.companyid || null,
      sourceEntityId: data.sourceEntityId || data.sourceentityid || '',
      targetEntityId: data.targetEntityId || data.targetentityid || '',
      relationType: data.relationType || data.relationtype || 'related-to',
      description: data.description || '',
      confidence: data.confidence,
      metadata: data.metadata || {},
      createdAt: data.createdAt || data.createdat || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updatedat || new Date().toISOString(),
    };
    
    // metadataをパース
    if (relation.metadata && typeof relation.metadata === 'string') {
      try {
        relation.metadata = JSON.parse(relation.metadata);
      } catch (e) {
        console.warn('⚠️ [getRelationById] metadataのパースエラー:', e);
        relation.metadata = {};
      }
    }
    
    return relation;
  } catch (error: any) {
    // 「no rows」エラーは正常な状態として扱う
    const errorMessage = error?.message || String(error || '');
    const isNoRowsError = errorMessage.includes('no rows') || 
                          errorMessage.includes('Query returned no rows') ||
                          errorMessage.includes('PGRST116') ||
                          errorMessage.includes('ドキュメント取得エラー');
    
    if (!isNoRowsError) {
      console.warn('⚠️ [getRelationById] 取得に失敗:', relationId, error);
    }
    return null;
  }
}

/**
 * すべてのリレーションを取得（全トピック横断）
 */
export async function getAllRelations(): Promise<Relation[]> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`📖 [getAllRelations] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から取得）`);
    
    let result: any[] = [];
    
    // Supabase使用時はDataSource経由で取得
    if (useSupabase) {
      try {
        const { getCollectionViaDataSource } = await import('./dataSourceAdapter');
        result = await getCollectionViaDataSource('relations');
        
        // Supabaseから取得したデータは既に配列形式
        if (!Array.isArray(result)) {
          console.warn('⚠️ [getAllRelations] 結果が配列ではありません:', result);
          return [];
        }
        console.log('📖 [getAllRelations] Supabaseから取得:', result.length, '件');
      } catch (supabaseError: any) {
        console.error('❌ [getAllRelations] Supabase経由の取得に失敗:', supabaseError);
        return [];
      }
    } else {
      // SQLite使用時はTauriコマンド経由
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        const tauriResult = await callTauriCommand('collection_get', {
          collectionName: 'relations',
        });
        
        if (!tauriResult || !Array.isArray(tauriResult)) {
          console.warn('⚠️ [getAllRelations] 結果が配列ではありません:', tauriResult);
          return [];
        }
        result = tauriResult;
      } else {
        // Tauri環境でない場合は空配列を返す
        return [];
      }
    }
    
    const relations: Relation[] = result.map((item: any) => {
      // Supabaseの場合は直接オブジェクト、Tauriの場合はitem.dataまたはitem
      const relationData = useSupabase ? item : (item.data || item);
      const relationId = useSupabase ? item.id : (item.id || relationData.id);
      
      const relation: Relation = {
        id: relationId,
        topicId: relationData.topicId || relationData.topicid || undefined,
        yamlFileId: relationData.yamlFileId || relationData.yamlfileid || undefined,
        organizationId: relationData.organizationId || relationData.organizationid || null,
        companyId: relationData.companyId || relationData.companyid || null,
        sourceEntityId: relationData.sourceEntityId || relationData.sourceentityid || '',
        targetEntityId: relationData.targetEntityId || relationData.targetentityid || '',
        relationType: relationData.relationType || relationData.relationtype || 'related-to',
        description: relationData.description || '',
        confidence: relationData.confidence,
        metadata: relationData.metadata || {},
        createdAt: relationData.createdAt || relationData.createdat || new Date().toISOString(),
        updatedAt: relationData.updatedAt || relationData.updatedat || new Date().toISOString(),
      };
      
      // metadataをパース
      if (relation.metadata && typeof relation.metadata === 'string') {
        try {
          relation.metadata = JSON.parse(relation.metadata);
        } catch (e) {
          console.warn('⚠️ [getAllRelations] metadataのパースエラー:', e);
        }
      }
      
      return relation;
    });
    
    console.log('✅ [getAllRelations] 取得成功:', relations.length, '件');
    if (relations.length > 0) {
      console.log('🔍 [getAllRelations] サンプルリレーション:', relations[0]);
    }
    return relations;
  } catch (error: any) {
    console.error('❌ [getAllRelations] エラー:', error);
    return [];
  }
}

/**
 * トピックIDでリレーション一覧を取得
 */
export async function getRelationsByTopicId(topicId: string): Promise<Relation[]> {
  try {
    console.log('📊 [getRelationsByTopicId] リレーション取得開始:', { topicId });
    
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    let result: any[] = [];
    
    if (useSupabase) {
      try {
        const { getCollectionViaDataSource } = await import('./dataSourceAdapter');
        // Supabaseではtopicid（小文字）として保存されている
        result = await getCollectionViaDataSource('relations', {
          filters: [
            { field: 'topicid', operator: 'eq', value: topicId }
          ]
        });
        
        // Supabaseから取得したデータは既に配列形式
        if (!Array.isArray(result)) {
          console.warn('⚠️ [getRelationsByTopicId] 結果が配列ではありません:', result);
          return [];
        }
      } catch (supabaseError: any) {
        console.error('❌ [getRelationsByTopicId] Supabase経由の取得に失敗:', supabaseError);
        return [];
      }
    } else {
      const tauriResult = await callTauriCommand('query_get', {
        collectionName: 'relations',
        conditions: { topicId },
      });

      // query_getの結果は[{id: ..., data: ...}, ...]の形式
      result = (tauriResult || []) as Array<{id: string; data: any}>;
    }
    
    // データをRelation形式に変換
    const items = useSupabase 
      ? result.map((item: any) => ({ id: item.id, data: item }))
      : result as Array<{id: string; data: any}>;
    
    const relations = items.map(item => {
      let relationData = useSupabase ? item.data : item.data;
      
      // Supabaseから取得したデータの場合、小文字のフィールド名をキャメルケースにマッピング
      if (useSupabase && relationData) {
        relationData = {
          ...relationData,
          // topicid -> topicId
          topicId: relationData.topicId || relationData.topicid,
          // sourceentityid -> sourceEntityId
          sourceEntityId: relationData.sourceEntityId || relationData.sourceentityid,
          // targetentityid -> targetEntityId
          targetEntityId: relationData.targetEntityId || relationData.targetentityid,
          // relationtype -> relationType
          relationType: relationData.relationType || relationData.relationtype,
          // organizationid -> organizationId
          organizationId: relationData.organizationId || relationData.organizationid,
          // companyid -> companyId
          companyId: relationData.companyId || relationData.companyid,
          // createdat -> createdAt
          createdAt: relationData.createdAt || relationData.createdat,
          // updatedat -> updatedAt
          updatedAt: relationData.updatedAt || relationData.updatedat,
        };
        // 小文字のフィールドを削除
        delete relationData.topicid;
        delete relationData.sourceentityid;
        delete relationData.targetentityid;
        delete relationData.relationtype;
        delete relationData.organizationid;
        delete relationData.companyid;
        delete relationData.createdat;
        delete relationData.updatedat;
      }
      
      const relation: Relation = { ...relationData, id: item.id };
      // metadataをJSON文字列からオブジェクトに変換
      if (relation.metadata && typeof relation.metadata === 'string') {
        try {
          relation.metadata = JSON.parse(relation.metadata);
        } catch (e) {
          console.warn('⚠️ [getRelationsByTopicId] metadataのパースエラー:', e);
          relation.metadata = {};
        }
      }
      return relation;
    }) as Relation[];
    
    // デバッグ: 取得したリレーションのtopicIdを確認
    relations.forEach(relation => {
      if (relation.topicId !== topicId) {
        console.warn('⚠️ [getRelationsByTopicId] リレーションのtopicIdが一致しません:', {
          relationId: relation.id,
          relationTopicId: relation.topicId,
          expectedTopicId: topicId,
        });
      }
    });
    
    // topicIdで再度フィルタリング（念のため）
    const filteredRelations = relations.filter(r => r.topicId === topicId);
    
    if (filteredRelations.length !== relations.length) {
      console.warn('⚠️ [getRelationsByTopicId] 一部のリレーションがフィルタリングされました:', {
        originalCount: relations.length,
        filteredCount: filteredRelations.length,
        topicId,
      });
    }
    
    console.log('✅ [getRelationsByTopicId] リレーション取得完了:', {
      topicId,
      count: filteredRelations.length,
      relationIds: filteredRelations.map(r => r.id),
    });
    
    return filteredRelations;
  } catch (error: any) {
    console.error('❌ [getRelationsByTopicId] エラー:', error);
    return [];
  }
}

/**
 * エンティティIDでリレーション一覧を取得（起点または終点）
 */
export async function getRelationsByEntityId(entityId: string): Promise<Relation[]> {
  try {
    // 起点としてのリレーション
    const sourceResult = await callTauriCommand('query_get', {
      collectionName: 'relations',
      conditions: { sourceEntityId: entityId },
    });

    // 終点としてのリレーション
    const targetResult = await callTauriCommand('query_get', {
      collectionName: 'relations',
      conditions: { targetEntityId: entityId },
    });

    // query_getの結果は[{id: ..., data: ...}, ...]の形式
    const sourceItems = (sourceResult || []) as Array<{id: string; data: any}>;
    const targetItems = (targetResult || []) as Array<{id: string; data: any}>;
    const sourceRelations = sourceItems.map(item => ({ ...item.data, id: item.id })) as Relation[];
    const targetRelations = targetItems.map(item => ({ ...item.data, id: item.id })) as Relation[];

    // 重複を除去して結合
    const allRelations = [...sourceRelations, ...targetRelations];
    const uniqueRelations = allRelations.filter(
      (relation, index, self) =>
        index === self.findIndex(r => r.id === relation.id)
    );

    return uniqueRelations;
  } catch (error: any) {
    console.error('❌ [getRelationsByEntityId] エラー:', error);
    return [];
  }
}

/**
 * リレーションタイプでフィルタリングして取得
 */
export async function getRelationsByType(
  relationType: RelationType,
  organizationId?: string,
  companyId?: string
): Promise<Relation[]> {
  try {
    const filters: any = { relationType };
    if (organizationId) {
      filters.organizationId = organizationId;
    }
    if (companyId) {
      filters.companyId = companyId;
    }

    const result = await callTauriCommand('query_get', {
      collectionName: 'relations',
      conditions: filters,
    });

    // query_getの結果は[{id: ..., data: ...}, ...]の形式
    const items = (result || []) as Array<{id: string; data: any}>;
    return items.map(item => ({ ...item.data, id: item.id })) as Relation[];
  } catch (error: any) {
    console.error('❌ [getRelationsByType] エラー:', error);
    return [];
  }
}

/**
 * YAMLファイルIDでリレーション一覧を取得
 */
export async function getRelationsByYamlFileId(yamlFileId: string): Promise<Relation[]> {
  try {
    const result = await callTauriCommand('query_get', {
      collectionName: 'relations',
      conditions: { yamlFileId },
    });

    // query_getの結果は[{id: ..., data: ...}, ...]の形式
    const items = (result || []) as Array<{id: string; data: any}>;
    const relations = items.map(item => ({ ...item.data, id: item.id })) as Relation[];
    
    // metadataをパース
    relations.forEach(relation => {
      if (relation.metadata && typeof relation.metadata === 'string') {
        try {
          relation.metadata = JSON.parse(relation.metadata);
        } catch (e) {
          console.warn('⚠️ [getRelationsByYamlFileId] metadataのパースエラー:', e);
        }
      }
    });
    
    console.log('✅ [getRelationsByYamlFileId] リレーション取得完了:', {
      yamlFileId,
      count: relations.length,
      relationIds: relations.map(r => r.id),
    });
    
    return relations;
  } catch (error: any) {
    console.error('❌ [getRelationsByYamlFileId] エラー:', error);
    return [];
  }
}

/**
 * リレーションを更新
 */
export async function updateRelation(
  relationId: string,
  updates: UpdateRelationInput
): Promise<Relation | null> {
  try {
    const existing = await getRelationById(relationId);
    if (!existing) {
      throw new Error(`リレーションが見つかりません: ${relationId}`);
    }

    const updated: Relation = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // バリデーション
    const validation = await validateRelation(updated);
    if (!validation.isValid) {
      throw new Error(`リレーションのバリデーションエラー: ${validation.errors.join(', ')}`);
    }

    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    
    // データベース用のデータを準備
    const updatedForDb: any = {
      ...updated,
    };
    
    // Supabaseスキーマに存在しないカラムを除外（yamlFileId）
    // SupabaseのrelationsテーブルにはyamlFileIdカラムが存在しないため、事前に除外
    if (useSupabase && updatedForDb.yamlFileId !== undefined) {
      delete updatedForDb.yamlFileId;
    }
    
    // metadataをJSON文字列に変換
    if (updatedForDb.metadata && typeof updatedForDb.metadata === 'object') {
      updatedForDb.metadata = JSON.stringify(updatedForDb.metadata);
    } else if (updatedForDb.metadata === undefined && existing.metadata) {
      // 既存のmetadataを保持（JSON文字列のまま）
      updatedForDb.metadata = typeof existing.metadata === 'string'
        ? existing.metadata
        : JSON.stringify(existing.metadata);
    }
    
    // Supabase使用時はDataSource経由で更新
    if (useSupabase) {
      try {
        console.log('📝 [updateRelation] Supabase経由でリレーションを更新します:', relationId);
        
        // Supabaseに保存（doc_setは既存レコードがある場合は更新、ない場合は作成）
        const { setDocViaDataSource } = await import('./dataSourceAdapter');
        await setDocViaDataSource('relations', relationId, updatedForDb);
        console.log('✅ [updateRelation] Supabase経由でリレーションを更新しました:', relationId);
        
        // ChromaDB同期（改善版: 変更検知、リトライ、エラー通知付き）
        if (updated.organizationId) {
          try {
            const { syncRelationToChroma } = await import('./chromaSync');
            await syncRelationToChroma(
              relationId,
              updated.topicId || '',
              updated.organizationId,
              updated,
              existing,
              updates
            );
          } catch (error) {
            // エラーは既にsyncRelationToChroma内で処理されているため、ここではログのみ
            console.debug(`[updateRelation] ChromaDB同期エラー（処理は続行）: ${relationId}`, error);
          }
        } else if (updated.companyId) {
          console.log(`ℹ️ [updateRelation] companyIdが設定されていますが、事業会社用のChromaDB同期は未実装です: ${relationId}`);
        } else {
          console.warn(`⚠️ [updateRelation] organizationIdもcompanyIdも設定されていないため、ChromaDB同期をスキップ: ${relationId}`);
        }
        
        return updated;
      } catch (supabaseError: any) {
        console.error('❌ [updateRelation] Supabase経由の更新に失敗:', supabaseError);
        throw supabaseError;
      }
    }
    
    // SQLite使用時は既存のロジック
    try {
      // Rust API経由で更新（未実装の場合はフォールバック）
      return await apiPut<Relation>(`/api/relations/${relationId}`, updates);
    } catch (error) {
      // フォールバック: Tauriコマンド経由
      console.warn('Rust API経由の更新に失敗、Tauriコマンドにフォールバック:', error);
      await callTauriCommand('doc_update', {
        collectionName: 'relations',
        docId: relationId,
        data: updatedForDb,
      });
      
      // ChromaDB同期（改善版: 変更検知、リトライ、エラー通知付き）
      if (updated.organizationId) {
        try {
          const { syncRelationToChroma } = await import('./chromaSync');
          await syncRelationToChroma(
            relationId,
            updated.topicId || '',
            updated.organizationId,
            updated,
            existing,
            updates
          );
        } catch (error) {
          // エラーは既にsyncRelationToChroma内で処理されているため、ここではログのみ
          console.debug(`[updateRelation] ChromaDB同期エラー（処理は続行）: ${relationId}`, error);
        }
      } else if (updated.companyId) {
        // 事業会社用のChromaDB同期（将来的に実装）
        console.log(`ℹ️ [updateRelation] companyIdが設定されていますが、事業会社用のChromaDB同期は未実装です: ${relationId}`);
      } else {
        console.warn(`⚠️ [updateRelation] organizationIdもcompanyIdも設定されていないため、ChromaDB同期をスキップ: ${relationId}`);
      }
      
      return updated;
    }
  } catch (error: any) {
    console.error('❌ [updateRelation] エラー:', error);
    throw error;
  }
}

/**
 * データベース操作のリトライ関数
 */
async function retryDbOperation<T>(
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
        // 指数バックオフ: 200ms, 400ms, 800ms, 1600ms
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
 * リレーションを削除
 */
export async function deleteRelation(relationId: string): Promise<void> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    
    // 削除前にリレーション情報を取得（ChromaDB削除用）
    const existing = await retryDbOperation(() => getRelationById(relationId));
    const organizationId = existing?.organizationId;
    const companyId = existing?.companyId;
    
    // Supabase使用時はDataSource経由で削除
    if (useSupabase) {
      try {
        console.log('📝 [deleteRelation] Supabase経由でリレーションを削除します:', relationId);
        
        const { deleteDocViaDataSource } = await import('./dataSourceAdapter');
        await deleteDocViaDataSource('relations', relationId);
        console.log('✅ [deleteRelation] Supabase経由でリレーションを削除しました:', relationId);
      } catch (supabaseError: any) {
        console.error('❌ [deleteRelation] Supabase経由の削除に失敗:', supabaseError);
        throw supabaseError;
      }
    } else {
      // SQLite使用時は既存のロジック
      try {
        // Rust API経由で削除（未実装の場合はフォールバック）
        await retryDbOperation(() => apiDelete(`/api/relations/${relationId}`), 5, 200);
      } catch (error) {
        // フォールバック: Tauriコマンド経由（リトライ付き）
        console.warn('Rust API経由の削除に失敗、Tauriコマンドにフォールバック:', error);
        await retryDbOperation(() => callTauriCommand('doc_delete', {
          collectionName: 'relations',
          docId: relationId,
        }), 5, 200);
      }
    }
    
    // ChromaDBからも削除（改善版: リトライ、エラー通知付き）
    if (organizationId) {
      try {
        const { deleteRelationFromChroma } = await import('./chromaSync');
        await deleteRelationFromChroma(relationId, organizationId);
      } catch (error) {
        // エラーは既にdeleteRelationFromChroma内で処理されているため、ここではログのみ
        console.debug(`[deleteRelation] ChromaDB削除エラー（処理は続行）: ${relationId}`, error);
      }
    } else if (companyId) {
      // 事業会社用のChromaDB削除（将来的に実装）
      console.log(`ℹ️ [deleteRelation] companyIdが設定されていますが、事業会社用のChromaDB削除は未実装です: ${relationId}`);
    }
    
    // キャッシュを無効化
    try {
      const { invalidateCacheForRelation } = await import('./ragSearchCache');
      invalidateCacheForRelation(relationId);
    } catch (error) {
      // キャッシュ無効化エラーは無視
      console.debug(`[deleteRelation] キャッシュ無効化エラー（無視）: ${relationId}`, error);
    }
  } catch (error: any) {
    console.error('❌ [deleteRelation] エラー:', error);
    throw error;
  }
}

/**
 * リレーションのバリデーション
 */
export async function validateRelation(relation: Relation): Promise<RelationValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 必須フィールドのチェック（topicIdまたはyamlFileIdのいずれかが必要）
  if (!relation.topicId && !relation.yamlFileId) {
    errors.push('topicIdまたはyamlFileIdのいずれかは必須です');
  }

  if (!relation.relationType) {
    errors.push('relationTypeは必須です');
  }

  // エンティティIDのチェック（エンティティが見つからない場合は警告のみ）
  // エンティティがまだ作成されていない場合や、タイミングの問題で見つからない場合でも
  // リレーションを保存できるようにするため、エラーではなく警告として扱う
  if (relation.sourceEntityId) {
    try {
      const sourceEntity = await getEntityById(relation.sourceEntityId);
      if (!sourceEntity) {
        warnings.push(`起点エンティティが見つかりません: ${relation.sourceEntityId}（リレーションは保存されます）`);
      }
    } catch (error) {
      // エンティティ取得に失敗した場合も警告として扱う
      warnings.push(`起点エンティティの取得に失敗しました: ${relation.sourceEntityId}（リレーションは保存されます）`);
    }
  }

  if (relation.targetEntityId) {
    try {
      const targetEntity = await getEntityById(relation.targetEntityId);
      if (!targetEntity) {
        warnings.push(`終点エンティティが見つかりません: ${relation.targetEntityId}（リレーションは保存されます）`);
      }
    } catch (error) {
      // エンティティ取得に失敗した場合も警告として扱う
      warnings.push(`終点エンティティの取得に失敗しました: ${relation.targetEntityId}（リレーションは保存されます）`);
    }
  }

  // エンティティ間リレーションの場合、両方のエンティティIDが必要
  if (relation.relationType !== 'related-to' && !relation.sourceEntityId && !relation.targetEntityId) {
    warnings.push('エンティティ間リレーションの場合、sourceEntityIdとtargetEntityIdの両方が推奨されます');
  }

  // 信頼度のチェック
  if (relation.confidence !== undefined) {
    if (relation.confidence < 0 || relation.confidence > 1) {
      errors.push('confidenceは0から1の間である必要があります');
    }
    if (relation.confidence < 0.5) {
      warnings.push('信頼度が低いリレーションです（0.5未満）');
    }
  }

  // 双方向リレーションの矛盾チェック（簡易版）
  if (relation.sourceEntityId && relation.targetEntityId) {
    // 同じエンティティ間の特定のリレーションタイプの矛盾をチェック
    if (relation.sourceEntityId === relation.targetEntityId) {
      if (['subsidiary', 'invests', 'employs'].includes(relation.relationType)) {
        warnings.push('同じエンティティ間でこのリレーションタイプは通常使用されません');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * リレーションパスを探索（A→B→Cの関係チェーン）
 */
export async function findRelationPath(
  startEntityId: string,
  endEntityId: string,
  maxDepth: number = 3
): Promise<Relation[][]> {
  try {
    const paths: Relation[][] = [];

    async function dfs(
      currentEntityId: string,
      targetEntityId: string,
      visited: Set<string>,
      path: Relation[],
      depth: number
    ) {
      if (depth > maxDepth) {
        return;
      }

      if (currentEntityId === targetEntityId && path.length > 0) {
        paths.push([...path]);
        return;
      }

      if (visited.has(currentEntityId)) {
        return;
      }

      visited.add(currentEntityId);

      // 現在のエンティティから出るリレーションを取得
      const relations = await getRelationsByEntityId(currentEntityId);

      for (const relation of relations) {
        const nextEntityId =
          relation.sourceEntityId === currentEntityId
            ? relation.targetEntityId
            : relation.sourceEntityId;

        if (nextEntityId && !visited.has(nextEntityId)) {
          path.push(relation);
          await dfs(nextEntityId, targetEntityId, new Set(visited), path, depth + 1);
          path.pop();
        }
      }
    }

    await dfs(startEntityId, endEntityId, new Set(), [], 0);

    // パスを長さでソート（短いパスを優先）
    return paths.sort((a, b) => a.length - b.length);
  } catch (error: any) {
    console.error('❌ [findRelationPath] エラー:', error);
    return [];
  }
}
