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
  showCleanupConfirm: boolean;
  setShowCleanupConfirm: (value: boolean) => void;
  showRepairEntityConfirm: boolean;
  setShowRepairEntityConfirm: (value: boolean) => void;
  showRepairRelationConfirm: boolean;
  setShowRepairRelationConfirm: (value: boolean) => void;
  showRepairTopicConfirm: boolean;
  setShowRepairTopicConfirm: (value: boolean) => void;
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
}: UseEmbeddingRegenerationStateProps): UseEmbeddingRegenerationStateReturn {
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
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [showRepairEntityConfirm, setShowRepairEntityConfirm] = useState(false);
  const [showRepairRelationConfirm, setShowRepairRelationConfirm] = useState(false);
  const [showRepairTopicConfirm, setShowRepairTopicConfirm] = useState(false);
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
    
    setIsCountingMissing(true);
    
    try {
      // 対象を決定（organizationIdでフィルタリング、typeで判断）
      const targetEntities = selectedOrgId === 'all'
        ? entities.filter(e => e.organizationId)
        : entities.filter(e => e.organizationId === selectedOrgId);
      const targetRelations = selectedOrgId === 'all'
        ? relations.filter(r => {
            const orgId = r.organizationId || entities.find(e => e.id === r.sourceEntityId || e.id === r.targetEntityId)?.organizationId;
            return orgId && r.topicId;
          })
        : relations.filter(r => {
            const orgId = r.organizationId || entities.find(e => e.id === r.sourceEntityId || e.id === r.targetEntityId)?.organizationId;
            return orgId === selectedOrgId && r.topicId;
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
          const { callTauriCommand } = await import('@/lib/localFirebase');
          const allEntityDocs = await callTauriCommand('query_get', {
            collectionName: 'entities',
            conditions: selectedOrgId !== 'all' ? { organizationId: selectedOrgId } : {},
          }) as Array<{ id: string; data: any }>;
          
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
          const { callTauriCommand } = await import('@/lib/localFirebase');
          const allEntityDocs = await callTauriCommand('query_get', {
            collectionName: 'entities',
            conditions: selectedOrgId !== 'all' ? { organizationId: selectedOrgId } : {},
          }) as Array<{ id: string; data: any }>;
          totalEntityCount = allEntityDocs.length;
        } catch (error) {
          // エラーは無視
        }
      }

      // リレーションの未生成件数をカウント
      if (selectedType === 'all' || selectedType === 'relations') {
        try {
          const { callTauriCommand } = await import('@/lib/localFirebase');
          const allRelationDocs = await callTauriCommand('query_get', {
            collectionName: 'relations',
            conditions: {},
          }) as Array<{ id: string; data: any }>;
          
          totalRelationCount = allRelationDocs.length;
          console.log(`📊 [未生成件数計算] 全リレーション数: ${totalRelationCount}件`);
          
          const missingRelationDocs = allRelationDocs.filter(doc => {
            const relationData = doc.data || doc;
            const chromaSyncedValue = relationData.chromaSynced;
            return chromaSyncedValue === 0 || chromaSyncedValue === null || chromaSyncedValue === undefined;
          });
          
          console.log(`📊 [未生成件数計算] chromaSynced=0またはnullのリレーション: ${missingRelationDocs.length}件`);
          
          // 組織フィルタリングを考慮
          let filteredMissingRelations = missingRelationDocs;
          if (selectedOrgId !== 'all') {
            filteredMissingRelations = missingRelationDocs.filter(doc => {
              const relationData = doc.data || doc;
              // organizationIdが直接設定されているか、エンティティから取得
              const orgId = relationData.organizationId || 
                entities.find(e => e.id === relationData.sourceEntityId || e.id === relationData.targetEntityId)?.organizationId;
              return orgId === selectedOrgId && relationData.topicId;
            });
          } else {
            filteredMissingRelations = missingRelationDocs.filter(doc => {
              const relationData = doc.data || doc;
              return relationData.topicId; // topicIdがあるもののみ
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
          const { callTauriCommand } = await import('@/lib/localFirebase');
          const allRelationDocs = await callTauriCommand('query_get', {
            collectionName: 'relations',
            conditions: {},
          }) as Array<{ id: string; data: any }>;
          totalRelationCount = allRelationDocs.length;
        } catch (error) {
          // エラーは無視
        }
      }

      // トピックの未生成件数をカウント
      if (selectedType === 'all' || selectedType === 'topics') {
        try {
          const { callTauriCommand } = await import('@/lib/localFirebase');
          // すべてのトピックを取得（組織フィルタリングは後で行う）
          const allTopicDocs = await callTauriCommand('query_get', {
            collectionName: 'topics',
            conditions: {},
          }) as Array<{ id: string; data: any }>;
          
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
          const { callTauriCommand } = await import('@/lib/localFirebase');
          const allTopicDocs = await callTauriCommand('query_get', {
            collectionName: 'topics',
            conditions: selectedOrgId !== 'all' ? { organizationId: selectedOrgId } : {},
          }) as Array<{ id: string; data: any }>;
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
    showCleanupConfirm,
    setShowCleanupConfirm,
    showRepairEntityConfirm,
    setShowRepairEntityConfirm,
    showRepairRelationConfirm,
    setShowRepairRelationConfirm,
    showRepairTopicConfirm,
    setShowRepairTopicConfirm,
    isRegeneratingEmbeddings,
    setIsRegeneratingEmbeddings,
    regenerationProgress,
    setRegenerationProgress,
    isCancelledRef,
    updateMissingCountsOrganization,
  };
}
