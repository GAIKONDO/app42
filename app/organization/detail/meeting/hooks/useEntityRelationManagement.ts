import { useState, useEffect, useCallback } from 'react';
import type { Entity, EntityType } from '@/types/entity';
import type { Relation, RelationType } from '@/types/relation';
import { getRelationsByTopicId } from '@/lib/relationApi';
import { getEntityById, getEntitiesByOrganizationId } from '@/lib/entityApi';
import { devWarn } from '../utils';

interface UseEntityRelationManagementProps {
  showTopicModal: boolean;
  editingTopicId: string | null;
  organizationId: string;
  meetingId: string;
}

export function useEntityRelationManagement({
  showTopicModal,
  editingTopicId,
  organizationId,
  meetingId,
}: UseEntityRelationManagementProps) {
  // ナレッジグラフ関連のstate
  const [topicEntities, setTopicEntities] = useState<Entity[]>([]);
  const [topicRelations, setTopicRelations] = useState<Relation[]>([]);
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);
  const [isLoadingRelations, setIsLoadingRelations] = useState(false);
  const [pendingEntities, setPendingEntities] = useState<Entity[] | null>(null);
  const [pendingRelations, setPendingRelations] = useState<Relation[] | null>(null);
  const [replaceExistingEntities, setReplaceExistingEntities] = useState(false); // 既存のエンティティ・リレーションを置き換えるか
  // エンティティ・リレーション一括削除確認モーダル
  const [showDeleteEntitiesModal, setShowDeleteEntitiesModal] = useState(false);
  const [showDeleteRelationsModal, setShowDeleteRelationsModal] = useState(false);
  const [showAddEntityModal, setShowAddEntityModal] = useState(false);
  const [showAddRelationModal, setShowAddRelationModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [editingRelation, setEditingRelation] = useState<Relation | null>(null);
  const [entitySearchQuery, setEntitySearchQuery] = useState('');
  const [relationSearchQuery, setRelationSearchQuery] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType | 'all'>('all');
  const [relationTypeFilter, setRelationTypeFilter] = useState<RelationType | 'all'>('all');
  const [bulkOperationMode, setBulkOperationMode] = useState<'none' | 'entities' | 'relations'>('none');
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());
  const [selectedRelationIds, setSelectedRelationIds] = useState<Set<string>>(new Set());
  const [showMergeEntityModal, setShowMergeEntityModal] = useState(false);
  const [mergeSourceEntity, setMergeSourceEntity] = useState<Entity | null>(null);
  const [showPathSearchModal, setShowPathSearchModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // トピック編集モーダルを開いたときにエンティティとリレーションを読み込む
  useEffect(() => {
    if (!showTopicModal || !editingTopicId || !organizationId) {
      return;
    }

    const loadKnowledgeGraph = async () => {
      try {
        setIsLoadingEntities(true);
        setIsLoadingRelations(true);

        const topicEmbeddingId = `${meetingId}-topic-${editingTopicId}`;
        
        // エンティティとリレーションを並列で取得（パフォーマンス最適化）
        const [entities, relations] = await Promise.all([
          getEntitiesByOrganizationId(organizationId),
          getRelationsByTopicId(topicEmbeddingId),
        ]);
        
        // トピックに関連するエンティティをフィルタリング
        const topicEntities = entities.filter(e => 
          e.metadata && typeof e.metadata === 'object' && 'topicId' in e.metadata && e.metadata.topicId === editingTopicId
        );
        setTopicRelations(relations);
        
        // リレーションに関連するエンティティも取得
        const relationEntityIds = new Set<string>();
        relations.forEach(r => {
          if (r.sourceEntityId) relationEntityIds.add(r.sourceEntityId);
          if (r.targetEntityId) relationEntityIds.add(r.targetEntityId);
        });
        
        // エンティティを並列で取得（パフォーマンス最適化）
        const { getEntitiesByIds } = await import('@/lib/entityApi');
        const entityIdsArray = Array.from(relationEntityIds);
        const relationEntities = entityIdsArray.length > 0
          ? await getEntitiesByIds(entityIdsArray, 10) // 並列数制限: 10
          : [];
        
        // トピック内のエンティティに含まれていないもののみ追加
        const newRelationEntities = relationEntities.filter(
          entity => !topicEntities.find(e => e.id === entity.id)
        );
        
        // エンティティリストに追加
        if (newRelationEntities.length > 0) {
          setTopicEntities([...topicEntities, ...newRelationEntities]);
        } else {
          setTopicEntities(topicEntities);
        }
      } catch (error: any) {
        console.error('❌ ナレッジグラフ読み込みエラー:', error);
      } finally {
        setIsLoadingEntities(false);
        setIsLoadingRelations(false);
      }
    };

    loadKnowledgeGraph();
  }, [showTopicModal, editingTopicId, organizationId, meetingId]);

  return {
    // エンティティ・リレーション状態
    topicEntities,
    setTopicEntities,
    topicRelations,
    setTopicRelations,
    isLoadingEntities,
    setIsLoadingEntities,
    isLoadingRelations,
    setIsLoadingRelations,
    pendingEntities,
    setPendingEntities,
    pendingRelations,
    setPendingRelations,
    replaceExistingEntities,
    setReplaceExistingEntities,
    
    // モーダル状態
    showDeleteEntitiesModal,
    setShowDeleteEntitiesModal,
    showDeleteRelationsModal,
    setShowDeleteRelationsModal,
    showAddEntityModal,
    setShowAddEntityModal,
    showAddRelationModal,
    setShowAddRelationModal,
    editingEntity,
    setEditingEntity,
    editingRelation,
    setEditingRelation,
    
    // 検索・フィルター状態
    entitySearchQuery,
    setEntitySearchQuery,
    relationSearchQuery,
    setRelationSearchQuery,
    entityTypeFilter,
    setEntityTypeFilter,
    relationTypeFilter,
    setRelationTypeFilter,
    
    // 一括操作状態
    bulkOperationMode,
    setBulkOperationMode,
    selectedEntityIds,
    setSelectedEntityIds,
    selectedRelationIds,
    setSelectedRelationIds,
    
    // その他のモーダル状態
    showMergeEntityModal,
    setShowMergeEntityModal,
    mergeSourceEntity,
    setMergeSourceEntity,
    showPathSearchModal,
    setShowPathSearchModal,
    showStatsModal,
    setShowStatsModal,
    isExporting,
    setIsExporting,
    exportSuccess,
    setExportSuccess,
  };
}

