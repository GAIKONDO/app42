'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useEmbeddingRegeneration } from '@/components/EmbeddingRegenerationContext';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { TopicInfo } from '@/lib/orgApi';

// 開発環境でのみログを有効化するヘルパー関数
const isDev = process.env.NODE_ENV === 'development';
const devWarn = (...args: any[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

interface UseEmbeddingRegenerationStateProps {
  entities: Entity[];
  relations: Relation[];
  topics: TopicInfo[];
}

interface UseEmbeddingRegenerationStateReturn {
  showRegenerationModal: boolean;
  setShowRegenerationModal: (show: boolean) => void;
  selectedTypeFilter: 'all' | 'organization' | 'company' | 'person';
  setSelectedTypeFilter: (filter: 'all' | 'organization' | 'company' | 'person') => void;
  regenerationType: 'missing' | 'all';
  setRegenerationType: (type: 'missing' | 'all') => void;
  missingCounts: { 
    entities: number; 
    relations: number; 
    topics: number; 
    total: number;
    totalEntities: number;
    totalRelations: number;
    totalTopics: number;
  };
  setMissingCounts: React.Dispatch<React.SetStateAction<{ 
    entities: number; 
    relations: number; 
    topics: number; 
    total: number;
    totalEntities: number;
    totalRelations: number;
    totalTopics: number;
  }>>;
  isCountingMissing: boolean;
  setIsCountingMissing: (value: boolean) => void;
  isRegeneratingEmbeddings: boolean;
  setIsRegeneratingEmbeddings: (value: boolean) => void;
  regenerationProgress: {
    current: number;
    total: number;
    status: 'idle' | 'processing' | 'completed' | 'cancelled';
    logs: Array<{ type: 'info' | 'success' | 'error' | 'skip'; message: string; timestamp: Date }>;
    stats: { success: number; skipped: number; errors: number };
  };
  setRegenerationProgress: React.Dispatch<React.SetStateAction<{
    current: number;
    total: number;
    status: 'idle' | 'processing' | 'completed' | 'cancelled';
    logs: Array<{ type: 'info' | 'success' | 'error' | 'skip'; message: string; timestamp: Date }>;
    stats: { success: number; skipped: number; errors: number };
  }>>;
  isCancelledRef: React.MutableRefObject<boolean>;
  updateMissingCountsOrganization: (selectedOrgId: string, selectedType: string) => Promise<void>;
}

export function useEmbeddingRegenerationState({
  entities,
  relations,
  topics,
  organizations = [],
}: UseEmbeddingRegenerationStateProps & { organizations?: Array<{ id: string; name: string; title?: string; type?: string }> }): UseEmbeddingRegenerationStateReturn {
  // 埋め込み再生成のグローバル状態管理
  const { startRegeneration, updateProgress, completeRegeneration, cancelRegeneration } = useEmbeddingRegeneration();
  
  const [showRegenerationModal, setShowRegenerationModal] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'organization' | 'company' | 'person'>('all');
  const [regenerationType, setRegenerationType] = useState<'missing' | 'all'>('missing');
  const [missingCounts, setMissingCounts] = useState<{ 
    entities: number; 
    relations: number; 
    topics: number; 
    total: number;
    totalEntities: number;
    totalRelations: number;
    totalTopics: number;
  }>({ 
    entities: 0, 
    relations: 0, 
    topics: 0, 
    total: 0,
    totalEntities: 0,
    totalRelations: 0,
    totalTopics: 0,
  });
  const [isCountingMissing, setIsCountingMissing] = useState(false);
  const [isRegeneratingEmbeddings, setIsRegeneratingEmbeddings] = useState(false);
  const [regenerationProgress, setRegenerationProgress] = useState<{
    current: number;
    total: number;
    status: 'idle' | 'processing' | 'completed' | 'cancelled';
    logs: Array<{ type: 'info' | 'success' | 'error' | 'skip'; message: string; timestamp: Date }>;
    stats: { success: number; skipped: number; errors: number };
  }>({
    current: 0,
    total: 0,
    status: 'idle',
    logs: [],
    stats: { success: 0, skipped: 0, errors: 0 },
  });
  const isCancelledRef = useRef<boolean>(false);

  // モーダルを開くイベントをリッスン
  useEffect(() => {
    const handleOpenModal = () => {
      setShowRegenerationModal(true);
    };
    
    window.addEventListener('openEmbeddingRegenerationModal', handleOpenModal);
    
    return () => {
      window.removeEventListener('openEmbeddingRegenerationModal', handleOpenModal);
    };
  }, []);

  // ローカル状態とグローバル状態を同期
  useEffect(() => {
    if (isRegeneratingEmbeddings && regenerationProgress.status === 'processing') {
      updateProgress(regenerationProgress);
    } else if (regenerationProgress.status === 'completed' && isRegeneratingEmbeddings) {
      setIsRegeneratingEmbeddings(false);
      completeRegeneration();
    } else if (regenerationProgress.status === 'cancelled' && isRegeneratingEmbeddings) {
      setIsRegeneratingEmbeddings(false);
      cancelRegeneration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegeneratingEmbeddings, regenerationProgress.status]);

  // 未生成件数を計算する関数（組織用）
  const updateMissingCountsOrganization = useCallback(async (selectedOrgId: string, selectedType: string) => {
    if (regenerationType !== 'missing') {
      return; // すべて再生成モードの場合は計算不要
    }

    // Supabase使用時は、ChromaDBとの実際の比較を使用（正確な方法）
    if (process.env.NEXT_PUBLIC_USE_SUPABASE === 'true') {
      setIsCountingMissing(true);
      try {
        console.log(`[updateMissingCountsOrganization] 開始: selectedOrgId=${selectedOrgId}, selectedType=${selectedType}`);
        
        const { compareEntityEmbeddings, compareRelationEmbeddings, compareTopicEmbeddings } = await import('@/lib/embeddingSync');
        
        // 全組織の場合は、各組織を個別に比較して合計
        if (selectedOrgId === 'all') {
          console.log('[updateMissingCountsOrganization] 全組織の比較を開始...');
          
          // 組織一覧を取得（organizationsが空の場合は、getAllOrganizationsFromTreeを使用）
          let orgIds: string[] = [];
          if (organizations && organizations.length > 0) {
            orgIds = organizations
              .filter(org => org.id && org.id !== 'all')
              .map(org => org.id);
          } else {
            // organizationsが空の場合は、getAllOrganizationsFromTreeを使用
            try {
              const { getOrgTreeFromDb, getAllOrganizationsFromTree } = await import('@/lib/orgApi');
              const orgTree = await getOrgTreeFromDb();
              if (orgTree) {
                const allOrgs = getAllOrganizationsFromTree(orgTree);
                orgIds = allOrgs
                  .filter(org => org.id && org.id !== 'all')
                  .map(org => org.id);
              }
            } catch (error) {
              console.error('[updateMissingCountsOrganization] 組織一覧の取得エラー:', error);
            }
          }
          
          console.log(`[updateMissingCountsOrganization] 対象組織数: ${orgIds.length}件`);
          
          if (orgIds.length === 0) {
            console.warn('[updateMissingCountsOrganization] 組織が存在しません');
            setMissingCounts({
              entities: 0,
              relations: 0,
              topics: 0,
              total: 0,
              totalEntities: 0,
              totalRelations: 0,
              totalTopics: 0,
            });
            setIsCountingMissing(false);
            return;
          }
          
          // 各組織について比較処理を実行（並列処理、タイムアウト付き）
          const comparisonPromises = orgIds.map(async (orgId) => {
            try {
              // タイムアウトを設定（各組織の比較に最大60秒）
              const timeoutPromise = new Promise<{ entityComparison: any; relationComparison: any; topicComparison: any }>((_, reject) => {
                setTimeout(() => reject(new Error(`組織 ${orgId} の比較がタイムアウトしました（60秒）`)), 60000);
              });
              
              const comparisonPromise = Promise.all([
                compareEntityEmbeddings(orgId).catch(() => ({ totalInSupabase: 0, totalInChromaDB: 0, missingInChromaDB: [], extraInChromaDB: [], synced: 0, errors: 0 })),
                compareRelationEmbeddings(orgId).catch(() => ({ totalInSupabase: 0, totalInChromaDB: 0, missingInChromaDB: [], extraInChromaDB: [], synced: 0, errors: 0 })),
                compareTopicEmbeddings(orgId).catch(() => ({ totalInSupabase: 0, totalInChromaDB: 0, missingInChromaDB: [], extraInChromaDB: [], synced: 0, errors: 0 })),
              ]).then(([entityComparison, relationComparison, topicComparison]) => ({
                entityComparison,
                relationComparison,
                topicComparison,
              }));
              
              return await Promise.race([comparisonPromise, timeoutPromise]);
            } catch (error) {
              console.error(`[updateMissingCountsOrganization] 組織 ${orgId} の比較エラー:`, error);
              return {
                entityComparison: { totalInSupabase: 0, totalInChromaDB: 0, missingInChromaDB: [], extraInChromaDB: [], synced: 0, errors: 0 },
                relationComparison: { totalInSupabase: 0, totalInChromaDB: 0, missingInChromaDB: [], extraInChromaDB: [], synced: 0, errors: 0 },
                topicComparison: { totalInSupabase: 0, totalInChromaDB: 0, missingInChromaDB: [], extraInChromaDB: [], synced: 0, errors: 0 },
              };
            }
          });
          
          // 全体のタイムアウトを設定（全組織の比較に最大5分）
          const allComparisonsPromise = Promise.all(comparisonPromises);
          const overallTimeoutPromise = new Promise<typeof allComparisonsPromise>((_, reject) => {
            setTimeout(() => reject(new Error('全組織の比較がタイムアウトしました（5分）')), 300000);
          });
          
          const allComparisons = await Promise.race([allComparisonsPromise, overallTimeoutPromise]).catch((error) => {
            console.error('[updateMissingCountsOrganization] 全組織の比較エラー:', error);
            // タイムアウトした場合は空の結果を返す
            return orgIds.map(() => ({
              entityComparison: { totalInSupabase: 0, totalInChromaDB: 0, missingInChromaDB: [], extraInChromaDB: [], synced: 0, errors: 0 },
              relationComparison: { totalInSupabase: 0, totalInChromaDB: 0, missingInChromaDB: [], extraInChromaDB: [], synced: 0, errors: 0 },
              topicComparison: { totalInSupabase: 0, totalInChromaDB: 0, missingInChromaDB: [], extraInChromaDB: [], synced: 0, errors: 0 },
            }));
          });
          
          // 結果を合計
          let totalEntities = 0;
          let totalRelations = 0;
          let totalTopics = 0;
          let missingEntities = 0;
          let missingRelations = 0;
          let missingTopics = 0;
          
          for (const comparison of allComparisons) {
            totalEntities += comparison.entityComparison.totalInSupabase;
            totalRelations += comparison.relationComparison.totalInSupabase;
            totalTopics += comparison.topicComparison.totalInSupabase;
            missingEntities += comparison.entityComparison.missingInChromaDB.length;
            missingRelations += comparison.relationComparison.missingInChromaDB.length;
            missingTopics += comparison.topicComparison.missingInChromaDB.length;
          }
          
          // タイプフィルタリングを適用
          let entities = missingEntities;
          let relations = missingRelations;
          let topics = missingTopics;
          let finalTotalEntities = totalEntities;
          let finalTotalRelations = totalRelations;
          let finalTotalTopics = totalTopics;
          
          if (selectedType === 'entities') {
            relations = 0;
            topics = 0;
            finalTotalRelations = 0;
            finalTotalTopics = 0;
          } else if (selectedType === 'relations') {
            entities = 0;
            topics = 0;
            finalTotalEntities = 0;
            finalTotalTopics = 0;
          } else if (selectedType === 'topics') {
            entities = 0;
            relations = 0;
            finalTotalEntities = 0;
            finalTotalRelations = 0;
          }
          
          console.log('[updateMissingCountsOrganization] 全組織の比較結果:', {
            entities: `${entities}件 / ${finalTotalEntities}件`,
            relations: `${relations}件 / ${finalTotalRelations}件`,
            topics: `${topics}件 / ${finalTotalTopics}件`,
            total: `${entities + relations + topics}件`,
          });
          
          setMissingCounts({
            entities,
            relations,
            topics,
            total: entities + relations + topics,
            totalEntities: finalTotalEntities,
            totalRelations: finalTotalRelations,
            totalTopics: finalTotalTopics,
          });
          
          setIsCountingMissing(false);
          return;
        }

        console.log(`[updateMissingCountsOrganization] 比較処理を開始: organizationId=${selectedOrgId}`);
        
        // 特定の組織の比較（タイムアウト付き）
        const comparisonPromise = Promise.all([
          compareEntityEmbeddings(selectedOrgId).catch((error) => {
            console.error('[updateMissingCountsOrganization] エンティティ比較エラー:', error);
            console.error('[updateMissingCountsOrganization] エラースタック:', error instanceof Error ? error.stack : String(error));
            return { totalInSupabase: 0, totalInChromaDB: 0, missingInChromaDB: [], extraInChromaDB: [], synced: 0, errors: 0 };
          }),
          compareRelationEmbeddings(selectedOrgId).catch((error) => {
            console.error('[updateMissingCountsOrganization] リレーション比較エラー:', error);
            console.error('[updateMissingCountsOrganization] エラースタック:', error instanceof Error ? error.stack : String(error));
            return { totalInSupabase: 0, totalInChromaDB: 0, missingInChromaDB: [], extraInChromaDB: [], synced: 0, errors: 0 };
          }),
          compareTopicEmbeddings(selectedOrgId).catch((error) => {
            console.error('[updateMissingCountsOrganization] トピック比較エラー:', error);
            console.error('[updateMissingCountsOrganization] エラースタック:', error instanceof Error ? error.stack : String(error));
            return { totalInSupabase: 0, totalInChromaDB: 0, missingInChromaDB: [], extraInChromaDB: [], synced: 0, errors: 0 };
          }),
        ]);
        
        // タイムアウトを設定（最大2分）
        const timeoutPromise = new Promise<typeof comparisonPromise>((_, reject) => {
          setTimeout(() => reject(new Error('比較処理がタイムアウトしました（2分）')), 120000);
        });
        
        const [entityComparison, relationComparison, topicComparison] = await Promise.race([
          comparisonPromise,
          timeoutPromise,
        ]).catch((error) => {
          console.error('[updateMissingCountsOrganization] 比較処理のタイムアウトまたはエラー:', error);
          return [
            { totalInSupabase: 0, totalInChromaDB: 0, missingInChromaDB: [], extraInChromaDB: [], synced: 0, errors: 0 },
            { totalInSupabase: 0, totalInChromaDB: 0, missingInChromaDB: [], extraInChromaDB: [], synced: 0, errors: 0 },
            { totalInSupabase: 0, totalInChromaDB: 0, missingInChromaDB: [], extraInChromaDB: [], synced: 0, errors: 0 },
          ] as const;
        });
        
        console.log(`[updateMissingCountsOrganization] 比較結果:`, {
          entities: {
            totalInSupabase: entityComparison.totalInSupabase,
            missingInChromaDB: entityComparison.missingInChromaDB.length,
          },
          relations: {
            totalInSupabase: relationComparison.totalInSupabase,
            missingInChromaDB: relationComparison.missingInChromaDB.length,
          },
          topics: {
            totalInSupabase: topicComparison.totalInSupabase,
            missingInChromaDB: topicComparison.missingInChromaDB.length,
          },
        });

        // タイプフィルタリングを適用
        let entities = entityComparison.missingInChromaDB.length;
        let relations = relationComparison.missingInChromaDB.length;
        let topics = topicComparison.missingInChromaDB.length;
        let totalEntities = entityComparison.totalInSupabase;
        let totalRelations = relationComparison.totalInSupabase;
        let totalTopics = topicComparison.totalInSupabase;

        if (selectedType === 'entities') {
          relations = 0;
          topics = 0;
          totalRelations = 0;
          totalTopics = 0;
        } else if (selectedType === 'relations') {
          entities = 0;
          topics = 0;
          totalEntities = 0;
          totalTopics = 0;
        } else if (selectedType === 'topics') {
          entities = 0;
          relations = 0;
          totalEntities = 0;
          totalRelations = 0;
        }

        setMissingCounts({
          entities,
          relations,
          topics,
          total: entities + relations + topics,
          totalEntities,
          totalRelations,
          totalTopics,
        });

        console.log('[updateMissingCountsOrganization] Supabase/ChromaDB比較結果:', {
          entities: `${entities}件 / ${totalEntities}件`,
          relations: `${relations}件 / ${totalRelations}件`,
          topics: `${topics}件 / ${totalTopics}件`,
          total: `${entities + relations + topics}件`,
        });
        
        setMissingCounts({
          entities,
          relations,
          topics,
          total: entities + relations + topics,
          totalEntities,
          totalRelations,
          totalTopics,
        });
        
        console.log('[updateMissingCountsOrganization] missingCountsを更新しました:', {
          entities,
          relations,
          topics,
          total: entities + relations + topics,
          totalEntities,
          totalRelations,
          totalTopics,
        });
        setIsCountingMissing(false);
        return;
      } catch (error) {
        console.error('[updateMissingCountsOrganization] Supabase/ChromaDB比較エラー:', error);
        console.error('[updateMissingCountsOrganization] エラーの詳細:', error instanceof Error ? error.stack : String(error));
        setMissingCounts({
          entities: 0,
          relations: 0,
          topics: 0,
          total: 0,
          totalEntities: 0,
          totalRelations: 0,
          totalTopics: 0,
        });
        setIsCountingMissing(false);
        return;
      } finally {
        // 念のため、finallyでも確実にfalseに設定
        setIsCountingMissing(false);
        console.log('[updateMissingCountsOrganization] 処理完了');
      }
    }

    // SQLite使用時は従来の方法（chromaSyncedフラグを使用）
    setIsCountingMissing(true);
    
    try {
      // 対象を決定（organizationIdでフィルタリング、typeで判断）
      const targetEntities = selectedOrgId === 'all'
        ? entities.filter(e => e.organizationId)
        : entities.filter(e => e.organizationId === selectedOrgId);
      // Graphvizのリレーション（yamlFileIdが設定されている）の場合はtopicIdがnullでもOK
      const targetRelations = selectedOrgId === 'all'
        ? relations.filter(r => {
            const orgId = r.organizationId || entities.find(e => e.id === r.sourceEntityId || e.id === r.targetEntityId)?.organizationId;
            // topicIdまたはyamlFileIdがあるもののみ（Graphvizのリレーションも含む）
            return orgId && (r.topicId || r.yamlFileId);
          })
        : relations.filter(r => {
            const orgId = r.organizationId || entities.find(e => e.id === r.sourceEntityId || e.id === r.targetEntityId)?.organizationId;
            // topicIdまたはyamlFileIdがあるもののみ（Graphvizのリレーションも含む）
            return orgId === selectedOrgId && (r.topicId || r.yamlFileId);
          });
      const targetTopics = selectedOrgId === 'all'
        ? topics.filter(t => t.organizationId)
        : topics.filter(t => t.organizationId === selectedOrgId);

      let entityCount = 0;
      let relationCount = 0;
      let topicCount = 0;
      let totalEntityCount = 0;
      let totalRelationCount = 0;
      let totalTopicCount = 0;

      // エンティティの未生成件数をカウント（query_getで一括取得）
      if (selectedType === 'all' || selectedType === 'entities') {
        try {
          const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
          let allEntityDocs: Array<{ id: string; data: any }> = [];
          
          if (useSupabase) {
            // Supabase経由で取得
            const { queryGetViaDataSource } = await import('@/lib/dataSourceAdapter');
            const results = await queryGetViaDataSource('entities', selectedOrgId !== 'all' ? { organizationId: selectedOrgId } : {});
            allEntityDocs = results.map((r: any) => ({
              id: r.id || r.data?.id,
              data: r.data || r,
            }));
          } else {
            // SQLite経由で取得
            const { callTauriCommand } = await import('@/lib/localFirebase');
            allEntityDocs = await callTauriCommand('query_get', {
              collectionName: 'entities',
              conditions: selectedOrgId !== 'all' ? { organizationId: selectedOrgId } : {},
            }) as Array<{ id: string; data: any }>;
          }
          
          totalEntityCount = allEntityDocs.length;
          console.log(`📊 [未生成件数計算] 全エンティティ数: ${totalEntityCount}件`);
          
          const missingEntityDocs = allEntityDocs.filter(doc => {
            const entityData = doc.data || doc;
            const chromaSyncedValue = entityData.chromaSynced;
            return chromaSyncedValue === 0 || chromaSyncedValue === null || chromaSyncedValue === undefined;
          });
          
          console.log(`📊 [未生成件数計算] chromaSynced=0またはnullのエンティティ: ${missingEntityDocs.length}件`);
          
          // targetEntitiesとデータベースのIDを照合
          const missingEntityIds = new Set(missingEntityDocs.map(doc => {
            const docId = doc.id || doc.data?.id;
            return docId;
          }));
          
          // targetEntitiesのIDと照合
          entityCount = targetEntities.filter(entity => missingEntityIds.has(entity.id)).length;
          
          // targetEntitiesが空の場合、またはIDが一致しない場合は、データベースから直接カウント
          if (targetEntities.length === 0 || entityCount === 0) {
            if (selectedOrgId === 'all') {
              entityCount = missingEntityDocs.length;
            } else {
              const filteredMissing = missingEntityDocs.filter(doc => {
                const entityData = doc.data || doc;
                return entityData.organizationId === selectedOrgId;
              });
              entityCount = filteredMissing.length;
            }
            console.log(`📊 [未生成件数計算] データベースから直接カウント: ${entityCount}件`);
          }
          
          console.log(`📊 [未生成件数計算] 最終エンティティ未生成件数: ${entityCount}件 / 全体: ${totalEntityCount}件`);
        } catch (error) {
          devWarn(`⚠️ [未生成件数計算] エンティティの一括取得エラー:`, error);
          entityCount = 0;
          totalEntityCount = 0;
        }
      } else {
        // エンティティが選択されていない場合でも、全体件数は取得
        try {
          const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
          let allEntityDocs: Array<{ id: string; data: any }> = [];
          
          if (useSupabase) {
            // Supabase経由で取得
            const { queryGetViaDataSource } = await import('@/lib/dataSourceAdapter');
            const results = await queryGetViaDataSource('entities', selectedOrgId !== 'all' ? { organizationId: selectedOrgId } : {});
            allEntityDocs = results.map((r: any) => ({
              id: r.id || r.data?.id,
              data: r.data || r,
            }));
          } else {
            // SQLite経由で取得
            const { callTauriCommand } = await import('@/lib/localFirebase');
            allEntityDocs = await callTauriCommand('query_get', {
              collectionName: 'entities',
              conditions: selectedOrgId !== 'all' ? { organizationId: selectedOrgId } : {},
            }) as Array<{ id: string; data: any }>;
          }
          totalEntityCount = allEntityDocs.length;
        } catch (error) {
          // エラーは無視
        }
      }

      // リレーションの未生成件数をカウント
      if (selectedType === 'all' || selectedType === 'relations') {
        try {
          const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
          let allRelationDocs: Array<{ id: string; data: any }> = [];
          
          if (useSupabase) {
            // Supabase経由で取得
            const { queryGetViaDataSource } = await import('@/lib/dataSourceAdapter');
            const results = await queryGetViaDataSource('relations', {});
            allRelationDocs = results.map((r: any) => ({
              id: r.id || r.data?.id,
              data: r.data || r,
            }));
          } else {
            // SQLite経由で取得
            const { callTauriCommand } = await import('@/lib/localFirebase');
            allRelationDocs = await callTauriCommand('query_get', {
              collectionName: 'relations',
              conditions: {},
            }) as Array<{ id: string; data: any }>;
          }
          
          totalRelationCount = allRelationDocs.length;
          console.log(`📊 [未生成件数計算] 全リレーション数: ${totalRelationCount}件`);
          
          const missingRelationDocs = allRelationDocs.filter(doc => {
            const relationData = doc.data || doc;
            const chromaSyncedValue = relationData.chromaSynced;
            return chromaSyncedValue === 0 || chromaSyncedValue === null || chromaSyncedValue === undefined;
          });
          
          console.log(`📊 [未生成件数計算] chromaSynced=0またはnullのリレーション: ${missingRelationDocs.length}件`);
          
          // 組織フィルタリングを考慮
          // Graphvizのリレーション（yamlFileIdが設定されている）の場合はtopicIdがnullでもOK
          let filteredMissingRelations = missingRelationDocs;
          if (selectedOrgId !== 'all') {
            filteredMissingRelations = missingRelationDocs.filter(doc => {
              const relationData = doc.data || doc;
              // organizationIdが直接設定されているか、エンティティから取得
              const orgId = relationData.organizationId || 
                entities.find(e => e.id === relationData.sourceEntityId || e.id === relationData.targetEntityId)?.organizationId;
              // topicIdまたはyamlFileIdがあるもののみ（Graphvizのリレーションも含む）
              return orgId === selectedOrgId && (relationData.topicId || relationData.yamlFileId);
            });
          } else {
            filteredMissingRelations = missingRelationDocs.filter(doc => {
              const relationData = doc.data || doc;
              // topicIdまたはyamlFileIdがあるもののみ（Graphvizのリレーションも含む）
              return relationData.topicId || relationData.yamlFileId;
            });
          }
          
          const missingRelationIds = new Set(filteredMissingRelations.map(doc => doc.id || doc.data?.id));
          relationCount = targetRelations.filter(relation => missingRelationIds.has(relation.id)).length;
          
          // targetRelationsが空の場合、またはIDが一致しない場合は、データベースから直接カウント
          if (targetRelations.length === 0 || relationCount === 0) {
            relationCount = filteredMissingRelations.length;
            console.log(`📊 [未生成件数計算] データベースから直接カウント: ${relationCount}件`);
          }
          
          console.log(`📊 [未生成件数計算] 最終リレーション未生成件数: ${relationCount}件 / 全体: ${totalRelationCount}件`);
        } catch (error) {
          devWarn(`⚠️ [未生成件数計算] リレーションの一括取得エラー:`, error);
          relationCount = 0;
          totalRelationCount = 0;
        }
      } else {
        // リレーションが選択されていない場合でも、全体件数は取得
        try {
          const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
          let allRelationDocs: Array<{ id: string; data: any }> = [];
          
          if (useSupabase) {
            // Supabase経由で取得
            const { queryGetViaDataSource } = await import('@/lib/dataSourceAdapter');
            const results = await queryGetViaDataSource('relations', {});
            allRelationDocs = results.map((r: any) => ({
              id: r.id || r.data?.id,
              data: r.data || r,
            }));
          } else {
            // SQLite経由で取得
            const { callTauriCommand } = await import('@/lib/localFirebase');
            allRelationDocs = await callTauriCommand('query_get', {
              collectionName: 'relations',
              conditions: {},
            }) as Array<{ id: string; data: any }>;
          }
          totalRelationCount = allRelationDocs.length;
        } catch (error) {
          // エラーは無視
        }
      }

      // トピックの未生成件数をカウント
      if (selectedType === 'all' || selectedType === 'topics') {
        try {
          const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
          let allTopicDocs: Array<{ id: string; data: any }> = [];
          
          if (useSupabase) {
            // Supabase経由で取得
            const { queryGetViaDataSource } = await import('@/lib/dataSourceAdapter');
            const results = await queryGetViaDataSource('topics', {});
            allTopicDocs = results.map((r: any) => ({
              id: r.id || r.data?.id,
              data: r.data || r,
            }));
          } else {
            // SQLite経由で取得
            const { callTauriCommand } = await import('@/lib/localFirebase');
            // すべてのトピックを取得（組織フィルタリングは後で行う）
            allTopicDocs = await callTauriCommand('query_get', {
              collectionName: 'topics',
              conditions: {},
            }) as Array<{ id: string; data: any }>;
          }
          
          // 組織フィルタリング
          let filteredTopicDocs = allTopicDocs;
          if (selectedOrgId !== 'all') {
            filteredTopicDocs = allTopicDocs.filter(doc => {
              const topicData = doc.data || doc;
              return topicData.organizationId === selectedOrgId;
            });
          }
          
          totalTopicCount = filteredTopicDocs.length;
          console.log(`📊 [未生成件数計算] 全トピック数: ${totalTopicCount}件（組織フィルタ後）`);
          
          const missingTopicDocs = filteredTopicDocs.filter(doc => {
            const topicData = doc.data || doc;
            const chromaSyncedValue = topicData.chromaSynced;
            return chromaSyncedValue === 0 || chromaSyncedValue === null || chromaSyncedValue === undefined;
          });
          
          console.log(`📊 [未生成件数計算] chromaSynced=0またはnullのトピック: ${missingTopicDocs.length}件`);
          
          // トピックIDのマッチング（複数の形式に対応）
          const missingTopicIdSet = new Set<string>();
          for (const doc of missingTopicDocs) {
            const docId = doc.id || doc.data?.id;
            const topicData = doc.data || doc;
            const topicId = topicData.topicId || docId;
            
            if (topicId) {
              // 形式1: {meetingNoteId}-topic-{topicId}
              const idMatch = topicId.match(/^(.+)-topic-(.+)$/);
              if (idMatch) {
                const extractedTopicId = idMatch[2];
                missingTopicIdSet.add(extractedTopicId);
                missingTopicIdSet.add(topicId);
              } else {
                missingTopicIdSet.add(topicId);
              }
              
              // docIdも追加（Graphvizカードの場合）
              if (docId && docId !== topicId) {
                missingTopicIdSet.add(docId);
              }
            }
          }
          
          // targetTopicsと照合
          topicCount = targetTopics.filter(topic => {
            // topic.idと照合
            if (missingTopicIdSet.has(topic.id)) {
              return true;
            }
            // Graphvizカードの場合、meetingNoteIdも照合
            if (topic.meetingNoteId && topic.meetingNoteId.startsWith('graphviz_')) {
              const graphvizTopicId = topic.meetingNoteId.replace('graphviz_', '');
              if (missingTopicIdSet.has(graphvizTopicId)) {
                return true;
              }
            }
            return false;
          }).length;
          
          // targetTopicsが空の場合、またはIDが一致しない場合は、データベースから直接カウント
          if (targetTopics.length === 0 || topicCount === 0) {
            topicCount = missingTopicDocs.length;
            console.log(`📊 [未生成件数計算] データベースから直接カウント: ${topicCount}件`);
          }
          
          console.log(`📊 [未生成件数計算] 最終トピック未生成件数: ${topicCount}件 / 全体: ${totalTopicCount}件`);
        } catch (error) {
          devWarn(`⚠️ [未生成件数計算] トピックの一括取得エラー:`, error);
          topicCount = 0;
          totalTopicCount = 0;
        }
      } else {
        // トピックが選択されていない場合でも、全体件数は取得
        try {
          const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
          let allTopicDocs: Array<{ id: string; data: any }> = [];
          
          if (useSupabase) {
            // Supabase経由で取得
            const { queryGetViaDataSource } = await import('@/lib/dataSourceAdapter');
            const results = await queryGetViaDataSource('topics', selectedOrgId !== 'all' ? { organizationId: selectedOrgId } : {});
            allTopicDocs = results.map((r: any) => ({
              id: r.id || r.data?.id,
              data: r.data || r,
            }));
          } else {
            // SQLite経由で取得
            const { callTauriCommand } = await import('@/lib/localFirebase');
            allTopicDocs = await callTauriCommand('query_get', {
              collectionName: 'topics',
              conditions: selectedOrgId !== 'all' ? { organizationId: selectedOrgId } : {},
            }) as Array<{ id: string; data: any }>;
          }
          totalTopicCount = allTopicDocs.length;
        } catch (error) {
          // エラーは無視
        }
      }

      setMissingCounts({
        entities: entityCount,
        relations: relationCount,
        topics: topicCount,
        total: entityCount + relationCount + topicCount,
        totalEntities: totalEntityCount,
        totalRelations: totalRelationCount,
        totalTopics: totalTopicCount,
      });
    } catch (error) {
      console.error('未生成件数の計算エラー:', error);
      setMissingCounts({ 
        entities: 0, 
        relations: 0, 
        topics: 0, 
        total: 0,
        totalEntities: 0,
        totalRelations: 0,
        totalTopics: 0,
      });
    } finally {
      setIsCountingMissing(false);
    }
  }, [regenerationType, entities, relations, topics]);

  // モーダルが開かれたときに未生成件数を計算
  useEffect(() => {
    if (showRegenerationModal && regenerationType === 'missing') {
      setTimeout(() => {
        const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
        const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement;
        if (orgSelect && typeSelect) {
          updateMissingCountsOrganization(orgSelect.value || 'all', typeSelect.value || 'all');
        }
      }, 100);
    }
  }, [showRegenerationModal, regenerationType, updateMissingCountsOrganization]);

  return {
    showRegenerationModal,
    setShowRegenerationModal,
    selectedTypeFilter,
    setSelectedTypeFilter,
    regenerationType,
    setRegenerationType,
    missingCounts,
    setMissingCounts,
    isCountingMissing,
    setIsCountingMissing,
    isRegeneratingEmbeddings,
    setIsRegeneratingEmbeddings,
    regenerationProgress,
    setRegenerationProgress,
    isCancelledRef,
    updateMissingCountsOrganization,
  };
}
