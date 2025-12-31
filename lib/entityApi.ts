/**
 * エンティティAPI
 * ナレッジグラフで使用するエンティティの操作を行う
 */

import type { Entity, CreateEntityInput, UpdateEntityInput, EntityType } from '@/types/entity';
import { callTauriCommand } from './localFirebase';
import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import { saveEntityEmbeddingAsync } from './entityEmbeddings';

/**
 * エンティティを作成
 */
export async function createEntity(entity: CreateEntityInput | (CreateEntityInput & { id?: string; createdAt?: string; updatedAt?: string })): Promise<Entity> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    
    // 既にIDが設定されている場合はそれを使用、なければ新規生成
    const id = (entity as any).id || `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const entityData: Entity = {
      ...entity,
      id,
      createdAt: (entity as any).createdAt || now,
      updatedAt: (entity as any).updatedAt || now,
    };

    // Supabase使用時はDataSource経由で作成
    if (useSupabase) {
      try {
        console.log('📝 [createEntity] Supabase経由でエンティティを作成します:', id, entityData.name);
        
        // データベース用のデータを準備
        const entityDataForDb: any = {
          ...entityData,
        };
        
        // organizationIdとcompanyIdを明示的にnullに設定（undefinedを避ける）
        if (entityDataForDb.organizationId === undefined) {
          entityDataForDb.organizationId = null;
        }
        if (entityDataForDb.companyId === undefined) {
          entityDataForDb.companyId = null;
        }
        
        // aliasesとmetadataをJSON文字列に変換（SupabaseではTEXT型として保存）
        if (entityDataForDb.aliases && Array.isArray(entityDataForDb.aliases)) {
          entityDataForDb.aliases = JSON.stringify(entityDataForDb.aliases);
        }
        if (entityDataForDb.metadata && typeof entityDataForDb.metadata === 'object') {
          entityDataForDb.metadata = JSON.stringify(entityDataForDb.metadata);
        }
        
        // Supabaseに保存
        const { setDocViaDataSource } = await import('./dataSourceAdapter');
        await setDocViaDataSource('entities', id, entityDataForDb);
        console.log('✅ [createEntity] Supabase経由でエンティティを作成しました:', id);
        
        // ChromaDBに埋め込みを非同期で生成（エラーは無視）
        if (entity.organizationId) {
          saveEntityEmbeddingAsync(id, entity.organizationId).catch(error => {
            console.error('❌ [createEntity] エンティティ埋め込みの生成に失敗しました（続行します）:', {
              entityId: id,
              entityName: entity.name,
              organizationId: entity.organizationId,
              error: error?.message || String(error),
            });
          });
        } else if (entity.companyId) {
          console.log(`ℹ️ [createEntity] companyIdが設定されていますが、事業会社用の埋め込み生成は未実装です: ${entity.name} (${id})`);
        } else {
          console.warn(`⚠️ [createEntity] organizationIdもcompanyIdも設定されていないため、埋め込み生成をスキップ: ${entity.name} (${id})`);
        }
        
        return entityData;
      } catch (supabaseError: any) {
        console.error('❌ [createEntity] Supabase経由の作成に失敗:', supabaseError);
        throw supabaseError;
      }
    }

    // SQLite使用時は既存のロジック
    try {
      // Rust API経由で作成（未実装の場合はフォールバック）
      console.log('📝 [createEntity] Rust API経由でエンティティを作成します:', id, entityData.name);
      const result = await apiPost<Entity>('/api/entities', entityData);
      console.log('✅ [createEntity] Rust API経由でエンティティを作成しました:', id, result);
      return result;
    } catch (error) {
      // フォールバック: Tauriコマンド経由
      console.warn('⚠️ [createEntity] Rust API経由の作成に失敗、Tauriコマンドにフォールバック:', error);
      console.log('📝 [createEntity] Tauriコマンド経由でエンティティを作成します:', id, entityData.name);
      // aliasesとmetadataをJSON文字列に変換（データベースではTEXT型として保存）
      const entityDataForDb: any = {
        ...entityData,
      };
      
      // organizationIdとcompanyIdを明示的にnullに設定（undefinedを避ける）
      if (entityDataForDb.organizationId === undefined) {
        entityDataForDb.organizationId = null;
      }
      if (entityDataForDb.companyId === undefined) {
        entityDataForDb.companyId = null;
      }
      
      if (entityDataForDb.aliases && Array.isArray(entityDataForDb.aliases)) {
        entityDataForDb.aliases = JSON.stringify(entityDataForDb.aliases);
      }
      if (entityDataForDb.metadata && typeof entityDataForDb.metadata === 'object') {
        entityDataForDb.metadata = JSON.stringify(entityDataForDb.metadata);
      }

      try {
        const docSetResult = await callTauriCommand('doc_set', {
          collectionName: 'entities',
          docId: id,
          data: entityDataForDb,
        });
        console.log('✅ [createEntity] Tauriコマンド経由でエンティティを作成しました:', id, docSetResult);
      } catch (docSetError) {
        console.error('❌ [createEntity] Tauriコマンド経由の作成も失敗しました:', id, docSetError);
        throw docSetError;
      }

      // 埋め込みを非同期で生成（エラーは無視）
      if (entity.organizationId) {
        saveEntityEmbeddingAsync(id, entity.organizationId).catch(error => {
          console.error('❌ [createEntity] エンティティ埋め込みの生成に失敗しました（続行します）:', {
            entityId: id,
            entityName: entity.name,
            organizationId: entity.organizationId,
            error: error?.message || String(error),
            stack: error?.stack,
            timestamp: new Date().toISOString(),
          });
        });
      } else if (entity.companyId) {
        // 事業会社用の埋め込み生成（将来的に実装）
        console.log(`ℹ️ [createEntity] companyIdが設定されていますが、事業会社用の埋め込み生成は未実装です: ${entity.name} (${id})`);
      } else {
        console.warn(`⚠️ [createEntity] organizationIdもcompanyIdも設定されていないため、埋め込み生成をスキップ: ${entity.name} (${id})`);
      }

      return entityData;
    }
  } catch (error: any) {
    console.error('❌ [createEntity] エラー:', error);
    throw error;
  }
}

/**
 * 複数のエンティティIDで一括取得（並列処理、パフォーマンス最適化）
 * @param entityIds エンティティIDの配列
 * @param concurrencyLimit 並列実行数の制限（デフォルト: 5）
 * @returns エンティティの配列（存在しないIDは除外）
 */
export async function getEntitiesByIds(
  entityIds: string[],
  concurrencyLimit: number = 5
): Promise<Entity[]> {
  if (entityIds.length === 0) {
    return [];
  }

  // p-limitを使用して並列数を制限
  const pLimit = (await import('p-limit')).default;
  const limit = pLimit(concurrencyLimit);

  try {
    // 並列で取得
    const results = await Promise.allSettled(
      entityIds.map(id => 
        limit(async () => {
          try {
            return await getEntityById(id);
          } catch (error: any) {
            // 個別のエラーは無視してnullを返す（CORSエラーなど）
            const errorMessage = error?.message || String(error || '');
            if (!errorMessage.includes('access control checks') && 
                !errorMessage.includes('CORS') &&
                !errorMessage.includes('Tauri環境ではありません')) {
              console.warn(`[getEntitiesByIds] エンティティ ${id} の取得エラー:`, error);
            }
            return null;
          }
        })
      )
    );

    // 成功した結果のみを返す
    const entities: Entity[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        entities.push(result.value);
      }
    }

    return entities;
  } catch (error) {
    console.error('❌ [getEntitiesByIds] エラー:', error);
    return [];
  }
}

/**
 * エンティティIDで取得（Supabase対応）
 */
export async function getEntityById(entityId: string): Promise<Entity | null> {
  try {
    const { getDataSourceInstance } = await import('./dataSource');
    const dataSource = getDataSourceInstance();
    
    const data = await dataSource.doc_get('entities', entityId);
    
    if (!data) {
      // エンティティが見つからない場合は警告を出力しない
      return null;
    }
    
    // Supabaseから取得したデータをEntity形式に変換
    const entity: Entity = {
      id: data.id || entityId,
      name: data.name || '',
      type: data.type || 'other',
      organizationId: data.organizationId || data.organizationid || null,
      companyId: data.companyId || data.companyid || undefined,
      aliases: [],
      metadata: {},
      createdAt: data.createdAt || data.createdat || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updatedat || new Date().toISOString(),
    };
    
    // aliasesをパース
    if (data.aliases) {
      try {
        if (typeof data.aliases === 'string') {
          entity.aliases = JSON.parse(data.aliases);
        } else if (Array.isArray(data.aliases)) {
          entity.aliases = data.aliases;
        }
      } catch (e) {
        console.warn('⚠️ [getEntityById] aliasesのパースエラー:', e);
        entity.aliases = [];
      }
    }
    
    // metadataをパース
    if (data.metadata) {
      try {
        if (typeof data.metadata === 'string') {
          entity.metadata = JSON.parse(data.metadata);
        } else if (typeof data.metadata === 'object') {
          entity.metadata = data.metadata;
        }
      } catch (e) {
        console.warn('⚠️ [getEntityById] metadataのパースエラー:', e);
        entity.metadata = {};
      }
    }
    
    return entity;
  } catch (error: any) {
    // 「no rows」エラーは正常な状態として扱う
    const errorMessage = error?.message || String(error || '');
    const isNoRowsError = errorMessage.includes('no rows') || 
                          errorMessage.includes('Query returned no rows') ||
                          errorMessage.includes('PGRST116') ||
                          errorMessage.includes('ドキュメント取得エラー');
    
    if (!isNoRowsError) {
      console.warn('⚠️ [getEntityById] 取得に失敗:', entityId, error);
    }
    return null;
  }
}

/**
 * 組織IDでエンティティ一覧を取得
 */
/**
 * すべてのエンティティを取得（全組織横断）
 */
export async function getAllEntities(): Promise<Entity[]> {
  try {
    console.log('📖 [getAllEntities] 開始（Supabaseから取得）');
    
    const { getCollectionViaDataSource } = await import('./dataSourceAdapter');
    const result = await getCollectionViaDataSource('entities');
    
    // Supabaseから取得したデータは既に配列形式
    if (!Array.isArray(result)) {
      console.warn('⚠️ [getAllEntities] 結果が配列ではありません:', result);
      return [];
    }
    console.log('📖 [getAllEntities] Supabaseから取得:', result.length, '件');
    
    // デバッグ: companyIdを持つアイテムを事前に確認（全件チェック）
    let companyIdFoundCount = 0;
    const sampleWithCompanyId: any[] = [];
    for (const item of result) {
      // Supabaseの場合は直接オブジェクト
      const itemData = item;
      // companyIdが存在し、nullでも空文字列でもない場合
      if (itemData.companyId !== null && itemData.companyId !== undefined && itemData.companyId !== '' && itemData.companyId !== 'null') {
        companyIdFoundCount++;
        if (sampleWithCompanyId.length < 5) {
          sampleWithCompanyId.push({
            id: item.id,
            name: itemData.name,
            companyId: itemData.companyId,
            companyIdType: typeof itemData.companyId,
            rawCompanyId: itemData.companyId,
          });
        }
      }
    }
    if (companyIdFoundCount > 0) {
      console.log(`🔍 [getAllEntities] 全${result.length}件中、companyIdを持つエンティティ: ${companyIdFoundCount}件`, sampleWithCompanyId);
    } else {
      console.log(`⚠️ [getAllEntities] 全${result.length}件中、companyIdを持つエンティティが見つかりませんでした`);
    }
    
    const entities: Entity[] = result.map((item: any) => {
      // Supabaseの場合は直接オブジェクト
      const itemData = item;
      const itemId = item.id;
      
      // companyIdを正しく処理（null, undefined, 空文字列をnullに統一）
      let companyId: string | null = null;
      if (itemData.companyId !== null && itemData.companyId !== undefined && itemData.companyId !== '' && itemData.companyId !== 'null') {
        companyId = String(itemData.companyId);
      }
      
      const entity: Entity = {
        id: itemId,
        name: itemData.name || '',
        type: itemData.type || 'other',
        organizationId: itemData.organizationId || itemData.organizationid || null,
        companyId: companyId || undefined,
        aliases: [],
        metadata: {},
        createdAt: itemData.createdAt || itemData.createdat || new Date().toISOString(),
        updatedAt: itemData.updatedAt || itemData.updatedat || new Date().toISOString(),
      };
      
      // aliasesをパース
      if (itemData.aliases) {
        try {
          if (typeof itemData.aliases === 'string') {
            entity.aliases = JSON.parse(itemData.aliases);
          } else if (Array.isArray(itemData.aliases)) {
            entity.aliases = itemData.aliases;
          }
        } catch (e) {
          console.warn('⚠️ [getAllEntities] aliasesのパースエラー:', e);
        }
      }
      
      // metadataをパース
      if (itemData.metadata) {
        try {
          if (typeof itemData.metadata === 'string') {
            entity.metadata = JSON.parse(itemData.metadata);
          } else if (typeof itemData.metadata === 'object') {
            entity.metadata = itemData.metadata;
          }
        } catch (e) {
          console.warn('⚠️ [getAllEntities] metadataのパースエラー:', e);
        }
      }
      
      return entity;
    });
    
    // デバッグ: companyIdを持つエンティティの数を確認
    const entitiesWithCompanyId = entities.filter(e => e.companyId);
    console.log('✅ [getAllEntities] 取得成功:', entities.length, '件');
    console.log('📊 [getAllEntities] companyIdを持つエンティティ:', entitiesWithCompanyId.length, '件');
    if (entities.length > 0) {
      console.log('🔍 [getAllEntities] サンプルエンティティ:', {
        id: entities[0].id,
        name: entities[0].name,
        companyId: entities[0].companyId,
        organizationId: entities[0].organizationId,
      });
    }
    if (entitiesWithCompanyId.length > 0) {
      console.log('🔍 [getAllEntities] companyIdを持つエンティティのサンプル:', entitiesWithCompanyId.slice(0, 3).map(e => ({
        id: e.id,
        name: e.name,
        companyId: e.companyId,
      })));
    }
    return entities;
  } catch (error: any) {
    console.error('❌ [getAllEntities] エラー:', error);
    return [];
  }
}

export async function getEntitiesByOrganizationId(organizationId: string): Promise<Entity[]> {
  try {
    const { getCollectionViaDataSource } = await import('./dataSourceAdapter');
    // Supabaseではorganizationid（小文字）として保存されている
    const result = await getCollectionViaDataSource('entities', {
      filters: [
        { field: 'organizationid', operator: 'eq', value: organizationId }
      ]
    });
    
    // Supabaseから取得したデータは既に配列形式
    if (!Array.isArray(result)) {
      console.warn('⚠️ [getEntitiesByOrganizationId] 結果が配列ではありません:', result);
      return [];
    }
    
    // データをEntity形式に変換
    const items = result.map((item: any) => ({ id: item.id, data: item }));
    
    return items.map(item => {
      const entity: Entity = { ...item.data, id: item.id };
      // aliasesとmetadataをJSON文字列からオブジェクトに変換
      if (entity.aliases && typeof entity.aliases === 'string') {
        try {
          entity.aliases = JSON.parse(entity.aliases);
        } catch (e) {
          console.warn('⚠️ [getEntitiesByOrganizationId] aliasesのパースエラー:', e);
          entity.aliases = [];
        }
      }
      if (entity.metadata && typeof entity.metadata === 'string') {
        try {
          entity.metadata = JSON.parse(entity.metadata);
        } catch (e) {
          console.warn('⚠️ [getEntitiesByOrganizationId] metadataのパースエラー:', e);
          entity.metadata = {};
        }
      }
      return entity;
    }) as Entity[];
  } catch (error: any) {
    console.error('❌ [getEntitiesByOrganizationId] エラー:', error);
    return [];
  }
}

/**
 * 事業会社IDでエンティティ一覧を取得
 */
export async function getEntitiesByCompanyId(companyId: string): Promise<Entity[]> {
  try {
    const { getCollectionViaDataSource } = await import('./dataSourceAdapter');
    // Supabaseではcompanyid（小文字）として保存されている
    const result = await getCollectionViaDataSource('entities', {
      filters: [
        { field: 'companyid', operator: 'eq', value: companyId }
      ]
    });
    
    // Supabaseから取得したデータは既に配列形式
    if (!Array.isArray(result)) {
      console.warn('⚠️ [getEntitiesByCompanyId] 結果が配列ではありません:', result);
      return [];
    }
    
    // データをEntity形式に変換
    const items = result.map((item: any) => ({ id: item.id, data: item }));
    
    return items.map(item => {
      const entity: Entity = { ...item.data, id: item.id };
      // aliasesとmetadataをJSON文字列からオブジェクトに変換
      if (entity.aliases && typeof entity.aliases === 'string') {
        try {
          entity.aliases = JSON.parse(entity.aliases);
        } catch (e) {
          console.warn('⚠️ [getEntitiesByCompanyId] aliasesのパースエラー:', e);
          entity.aliases = [];
        }
      }
      if (entity.metadata && typeof entity.metadata === 'string') {
        try {
          entity.metadata = JSON.parse(entity.metadata);
        } catch (e) {
          console.warn('⚠️ [getEntitiesByCompanyId] metadataのパースエラー:', e);
          entity.metadata = {};
        }
      }
      return entity;
    }) as Entity[];
  } catch (error: any) {
    console.error('❌ [getEntitiesByCompanyId] エラー:', error);
    return [];
  }
}

/**
 * エンティティタイプでフィルタリングして取得
 */
export async function getEntitiesByType(
  type: EntityType,
  organizationId?: string,
  companyId?: string
): Promise<Entity[]> {
  try {
    const { queryGetViaDataSource } = await import('./dataSourceAdapter');
    
    const filters: any[] = [{ field: 'type', operator: 'eq', value: type }];
    if (organizationId) {
      filters.push({ field: 'organizationid', operator: 'eq', value: organizationId });
    }
    if (companyId) {
      filters.push({ field: 'companyid', operator: 'eq', value: companyId });
    }

    const result = await queryGetViaDataSource('entities', {
      filters
    });

    // query_getの結果は配列形式
    const items = (result || []) as Array<{id: string; data: any}>;
    return items.map(item => {
      const entity: Entity = { ...(item.data || item), id: item.id || item.data?.id };
      // aliasesとmetadataをJSON文字列からオブジェクトに変換
      if (entity.aliases && typeof entity.aliases === 'string') {
        try {
          entity.aliases = JSON.parse(entity.aliases);
        } catch (e) {
          console.warn('⚠️ [getEntitiesByOrganizationId] aliasesのパースエラー:', e);
          entity.aliases = [];
        }
      }
      if (entity.metadata && typeof entity.metadata === 'string') {
        try {
          entity.metadata = JSON.parse(entity.metadata);
        } catch (e) {
          console.warn('⚠️ [getEntitiesByOrganizationId] metadataのパースエラー:', e);
          entity.metadata = {};
        }
      }
      return entity;
    }) as Entity[];
  } catch (error: any) {
    console.error('❌ [getEntitiesByType] エラー:', error);
    return [];
  }
}

/**
 * YAMLファイルIDでエンティティ一覧を取得
 */
export async function getEntitiesByYamlFileId(yamlFileId: string, organizationId?: string): Promise<Entity[]> {
  try {
    // organizationIdが指定されている場合は、それでフィルタリングしてからyamlFileIdでフィルタリング（効率化）
    const conditions: any = {};
    if (organizationId) {
      conditions.organizationId = organizationId;
    }

    const result = await callTauriCommand('query_get', {
      collectionName: 'entities',
      conditions,
    });

    // query_getの結果は[{id: ..., data: ...}, ...]の形式
    const items = (result || []) as Array<{id: string; data: any}>;
    const allEntities = items.map(item => {
      const entity: Entity = { ...item.data, id: item.id };
      // aliasesとmetadataをJSON文字列からオブジェクトに変換
      if (entity.aliases && typeof entity.aliases === 'string') {
        try {
          entity.aliases = JSON.parse(entity.aliases);
        } catch (e) {
          console.warn('⚠️ [getEntitiesByYamlFileId] aliasesのパースエラー:', e);
          entity.aliases = [];
        }
      }
      if (entity.metadata && typeof entity.metadata === 'string') {
        try {
          entity.metadata = JSON.parse(entity.metadata);
        } catch (e) {
          console.warn('⚠️ [getEntitiesByYamlFileId] metadataのパースエラー:', e);
          entity.metadata = {};
        }
      }
      return entity;
    }) as Entity[];

    // metadata.yamlFileIdでフィルタリング
    const filteredEntities = allEntities.filter(entity => {
      if (entity.metadata && typeof entity.metadata === 'object' && entity.metadata.yamlFileId) {
        return entity.metadata.yamlFileId === yamlFileId;
      }
      return false;
    });

    console.log('✅ [getEntitiesByYamlFileId] エンティティ取得完了:', {
      yamlFileId,
      organizationId,
      total: allEntities.length,
      filtered: filteredEntities.length,
    });

    return filteredEntities;
  } catch (error: any) {
    console.error('❌ [getEntitiesByYamlFileId] エラー:', error);
    return [];
  }
}

/**
 * エンティティ名で検索
 */
export async function searchEntitiesByName(
  name: string,
  organizationId?: string,
  companyId?: string
): Promise<Entity[]> {
  try {
    // 簡易的な実装（完全一致・部分一致）
    // 将来的には全文検索やファジー検索を実装可能
    const filters: any = {};
    if (organizationId) {
      filters.organizationId = organizationId;
    }
    if (companyId) {
      filters.companyId = companyId;
    }

    const result = await callTauriCommand('query_get', {
      collectionName: 'entities',
      conditions: filters,
    });

    // query_getの結果は[{id: ..., data: ...}, ...]の形式
    const items = (result || []) as Array<{id: string; data: any}>;
    const entities = items.map(item => {
      const entity: Entity = { ...item.data, id: item.id };
      // aliasesとmetadataをJSON文字列からオブジェクトに変換
      if (entity.aliases && typeof entity.aliases === 'string') {
        try {
          entity.aliases = JSON.parse(entity.aliases);
        } catch (e) {
          console.warn('⚠️ [searchEntitiesByName] aliasesのパースエラー:', e);
          entity.aliases = [];
        }
      }
      if (entity.metadata && typeof entity.metadata === 'string') {
        try {
          entity.metadata = JSON.parse(entity.metadata);
        } catch (e) {
          console.warn('⚠️ [searchEntitiesByName] metadataのパースエラー:', e);
          entity.metadata = {};
        }
      }
      return entity;
    }) as Entity[];
    
    // 名前またはエイリアスでフィルタリング
    const searchLower = name.toLowerCase();
    return entities.filter(entity => {
      if (entity.name.toLowerCase().includes(searchLower)) {
        return true;
      }
      if (entity.aliases) {
        return entity.aliases.some(alias => 
          alias.toLowerCase().includes(searchLower)
        );
      }
      return false;
    });
  } catch (error: any) {
    console.error('❌ [searchEntitiesByName] エラー:', error);
    return [];
  }
}

/**
 * エンティティを更新
 */
export async function updateEntity(
  entityId: string,
  updates: UpdateEntityInput
): Promise<Entity | null> {
  try {
    const existing = await getEntityById(entityId);
    if (!existing) {
      throw new Error(`エンティティが見つかりません: ${entityId}`);
    }

    // organizationIdとcompanyIdは外部キー制約があるため、更新しない（既存の値を保持）
    // もしorganizationIdやcompanyIdを更新する必要がある場合は、別途バリデーションが必要
    const updatesWithoutIds = { ...updates };
    delete (updatesWithoutIds as any).organizationId;
    delete (updatesWithoutIds as any).companyId;
    
    const updated: Entity = {
      ...existing,
      ...updatesWithoutIds,
      // organizationIdとcompanyIdは既存の値を保持（外部キー制約のため）
      organizationId: existing.organizationId,
      companyId: existing.companyId,
      updatedAt: new Date().toISOString(),
    };
    
    // データベースに保存するためのデータ（aliasesとmetadataをJSON文字列に変換）
    const updatedForDb: any = {
      ...updated,
    };
    
    // organizationIdとcompanyIdは外部キー制約があるため、更新時には常に除外する
    // 既存のエンティティのorganizationIdやcompanyIdが存在しないIDを参照している可能性があるため、
    // 更新時にはこれらのフィールドを除外して、既存の値を保持する
    // これにより、外部キー制約エラーを回避
    delete updatedForDb.organizationId;
    delete updatedForDb.companyId;
    
    if (updatedForDb.aliases && Array.isArray(updatedForDb.aliases)) {
      updatedForDb.aliases = JSON.stringify(updatedForDb.aliases);
    } else if (updatedForDb.aliases === undefined && existing.aliases) {
      // 既存のaliasesを保持（JSON文字列のまま）
      updatedForDb.aliases = typeof existing.aliases === 'string' 
        ? existing.aliases 
        : JSON.stringify(existing.aliases);
    }
    
    if (updatedForDb.metadata && typeof updatedForDb.metadata === 'object') {
      updatedForDb.metadata = JSON.stringify(updatedForDb.metadata);
    } else if (updatedForDb.metadata === undefined && existing.metadata) {
      // 既存のmetadataを保持（JSON文字列のまま）
      updatedForDb.metadata = typeof existing.metadata === 'string'
        ? existing.metadata
        : JSON.stringify(existing.metadata);
    }

    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    
    // Supabase使用時はDataSource経由で更新
    if (useSupabase) {
      try {
        console.log('📝 [updateEntity] Supabase経由でエンティティを更新します:', entityId);
        
        // Supabaseに保存（doc_setは既存レコードがある場合は更新、ない場合は作成）
        const { setDocViaDataSource } = await import('./dataSourceAdapter');
        await setDocViaDataSource('entities', entityId, updatedForDb);
        console.log('✅ [updateEntity] Supabase経由でエンティティを更新しました:', entityId);
        
        // ChromaDB同期（改善版: 変更検知、リトライ、エラー通知付き）
        if (updated.organizationId) {
          try {
            const { syncEntityToChroma } = await import('./chromaSync');
            await syncEntityToChroma(
              entityId,
              updated.organizationId,
              updated,
              existing,
              updates
            );
          } catch (chromaError) {
            console.warn(`⚠️ [updateEntity] ChromaDB同期エラー（処理は続行）: ${entityId}`, chromaError);
          }
        } else if (updated.companyId) {
          console.log(`ℹ️ [updateEntity] companyIdが設定されていますが、事業会社用のChromaDB同期は未実装です: ${entityId}`);
        }
        
        return updated;
      } catch (supabaseError: any) {
        console.error('❌ [updateEntity] Supabase経由の更新に失敗:', supabaseError);
        throw supabaseError;
      }
    }
    
    // SQLite使用時は既存のロジック
    try {
      // Rust API経由で更新（未実装の場合はフォールバック）
      return await apiPut<Entity>(`/api/entities/${entityId}`, updates);
    } catch (error) {
      // フォールバック: Tauriコマンド経由
      console.warn('Rust API経由の更新に失敗、Tauriコマンドにフォールバック:', error);
      await callTauriCommand('doc_update', {
        collectionName: 'entities',
        docId: entityId,
        data: updatedForDb,
      });
      
      // ChromaDB同期（改善版: 変更検知、リトライ、エラー通知付き）
      if (updated.organizationId) {
        try {
          const { syncEntityToChroma } = await import('./chromaSync');
          await syncEntityToChroma(
            entityId,
            updated.organizationId,
            updated,
            existing,
            updates
          );
        } catch (error) {
          // エラーは既にsyncEntityToChroma内で処理されているため、ここではログのみ
          console.debug(`[updateEntity] ChromaDB同期エラー（処理は続行）: ${entityId}`, error);
        }
      } else if (updated.companyId) {
        // 事業会社用のChromaDB同期（将来的に実装）
        console.log(`ℹ️ [updateEntity] companyIdが設定されていますが、事業会社用のChromaDB同期は未実装です: ${entityId}`);
      } else {
        console.warn(`⚠️ [updateEntity] organizationIdもcompanyIdも設定されていないため、ChromaDB同期をスキップ: ${entityId}`);
      }
      
      return updated;
    }
  } catch (error: any) {
    console.error('❌ [updateEntity] エラー:', error);
    throw error;
  }
}

/**
 * エンティティを削除
 */
export async function deleteEntity(entityId: string): Promise<void> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    
    // 削除前にエンティティ情報を取得（ChromaDB削除用）
    const existing = await getEntityById(entityId);
    const organizationId = existing?.organizationId;
    const companyId = existing?.companyId;
    
    // Supabase使用時はDataSource経由で削除
    if (useSupabase) {
      try {
        console.log('📝 [deleteEntity] Supabase経由でエンティティを削除します:', entityId);
        
        const { deleteDocViaDataSource } = await import('./dataSourceAdapter');
        await deleteDocViaDataSource('entities', entityId);
        console.log('✅ [deleteEntity] Supabase経由でエンティティを削除しました:', entityId);
      } catch (supabaseError: any) {
        console.error('❌ [deleteEntity] Supabase経由の削除に失敗:', supabaseError);
        throw supabaseError;
      }
    } else {
      // SQLite使用時は既存のロジック
      try {
        // Rust API経由で削除（未実装の場合はフォールバック）
        await apiDelete(`/api/entities/${entityId}`);
      } catch (error) {
        // フォールバック: Tauriコマンド経由
        console.warn('Rust API経由の削除に失敗、Tauriコマンドにフォールバック:', error);
        await callTauriCommand('doc_delete', {
          collectionName: 'entities',
          docId: entityId,
        });
      }
    }
    
    // ChromaDBからも削除（改善版: リトライ、エラー通知付き）
    if (organizationId) {
      try {
        const { deleteEntityFromChroma } = await import('./chromaSync');
        await deleteEntityFromChroma(entityId, organizationId);
      } catch (error) {
        // エラーは既にdeleteEntityFromChroma内で処理されているため、ここではログのみ
        console.debug(`[deleteEntity] ChromaDB削除エラー（処理は続行）: ${entityId}`, error);
      }
    } else if (companyId) {
      // 事業会社用のChromaDB削除（将来的に実装）
      console.log(`ℹ️ [deleteEntity] companyIdが設定されていますが、事業会社用のChromaDB削除は未実装です: ${entityId}`);
    }
    
    // キャッシュを無効化
    try {
      const { invalidateCacheForEntity } = await import('./ragSearchCache');
      invalidateCacheForEntity(entityId);
    } catch (error) {
      // キャッシュ無効化エラーは無視
      console.debug(`[deleteEntity] キャッシュ無効化エラー（無視）: ${entityId}`, error);
    }
  } catch (error: any) {
    console.error('❌ [deleteEntity] エラー:', error);
    throw error;
  }
}

/**
 * エンティティをマージ（統合）
 * sourceIdのエンティティをtargetIdのエンティティに統合し、sourceIdを削除
 */
export async function mergeEntities(
  sourceId: string,
  targetId: string
): Promise<Entity> {
  try {
    const source = await getEntityById(sourceId);
    const target = await getEntityById(targetId);

    if (!source || !target) {
      throw new Error('マージ対象のエンティティが見つかりません');
    }

    // エイリアスを統合
    const mergedAliases = [
      ...(target.aliases || []),
      source.name,
      ...(source.aliases || []),
    ].filter((value, index, self) => self.indexOf(value) === index); // 重複除去

    // メタデータを統合
    const mergedMetadata = {
      ...target.metadata,
      ...source.metadata,
    };

    // ターゲットエンティティを更新
    const updated = await updateEntity(targetId, {
      aliases: mergedAliases,
      metadata: mergedMetadata,
    });

    if (!updated) {
      throw new Error('エンティティの更新に失敗しました');
    }

    // ソースエンティティを削除
    await deleteEntity(sourceId);

    return updated;
  } catch (error: any) {
    console.error('❌ [mergeEntities] エラー:', error);
    throw error;
  }
}

/**
 * 類似エンティティを検出（名前の類似度で判定）
 */
export async function findSimilarEntities(
  entityName: string,
  organizationId?: string,
  companyId?: string,
  threshold: number = 0.8
): Promise<Array<{ entity: Entity; similarity: number }>> {
  try {
    const entities = organizationId
      ? await getEntitiesByOrganizationId(organizationId)
      : companyId
      ? await getEntitiesByCompanyId(companyId)
      : await callTauriCommand('collection_get', {
          collectionName: 'entities',
        }).then(result => {
          // collection_getの結果は[{id: ..., data: ...}, ...]の形式
          const items = (result || []) as Array<{id: string; data: any}>;
          return items.map(item => {
            const entity: Entity = { ...item.data, id: item.id };
            // aliasesとmetadataをJSON文字列からオブジェクトに変換
            if (entity.aliases && typeof entity.aliases === 'string') {
              try {
                entity.aliases = JSON.parse(entity.aliases);
              } catch (e) {
                console.warn('⚠️ [findSimilarEntities] aliasesのパースエラー:', e);
                entity.aliases = [];
              }
            }
            if (entity.metadata && typeof entity.metadata === 'string') {
              try {
                entity.metadata = JSON.parse(entity.metadata);
              } catch (e) {
                console.warn('⚠️ [findSimilarEntities] metadataのパースエラー:', e);
                entity.metadata = {};
              }
            }
            return entity;
          }) as Entity[];
        });

    const results: Array<{ entity: Entity; similarity: number }> = [];

    for (const entity of entities) {
      // 簡易的な類似度計算（レーベンシュタイン距離ベース）
      const similarity = calculateStringSimilarity(
        entityName.toLowerCase(),
        entity.name.toLowerCase()
      );

      if (similarity >= threshold) {
        results.push({ entity, similarity });
      }

      // エイリアスもチェック
      if (entity.aliases) {
        for (const alias of entity.aliases) {
          const aliasSimilarity = calculateStringSimilarity(
            entityName.toLowerCase(),
            alias.toLowerCase()
          );
          if (aliasSimilarity >= threshold) {
            results.push({ entity, similarity: aliasSimilarity });
            break; // 1つのエンティティにつき1回だけ追加
          }
        }
      }
    }

    // 類似度でソート
    return results.sort((a, b) => b.similarity - a.similarity);
  } catch (error: any) {
    console.error('❌ [findSimilarEntities] エラー:', error);
    return [];
  }
}

/**
 * 文字列の類似度を計算（簡易版レーベンシュタイン距離）
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * レーベンシュタイン距離を計算
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
