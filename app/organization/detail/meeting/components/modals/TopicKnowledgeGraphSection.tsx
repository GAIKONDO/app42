'use client';

import type { Entity, EntityType } from '@/types/entity';
import type { Relation } from '@/types/relation';

interface TopicKnowledgeGraphSectionProps {
  topicEntities: Entity[];
  topicRelations: Relation[];
  pendingEntities: Entity[] | null;
  pendingRelations: Relation[] | null;
  isLoadingEntities: boolean;
  isLoadingRelations: boolean;
  replaceExistingEntities: boolean;
  entitySearchQuery: string;
  entityTypeFilter: EntityType | 'all';
  relationTypeLabels: Record<string, string>;
  entityTypeLabels: Record<string, string>;
  showDeleteEntitiesModal: boolean;
  showDeleteRelationsModal: boolean;
  showAddEntityModal: boolean;
  showAddRelationModal: boolean;
  editingEntity: Entity | null;
  editingRelation: Relation | null;
  showDeleteEntityModal: boolean;
  deleteTargetEntity: Entity | null;
  showDeleteRelationModal: boolean;
  deleteTargetRelation: Relation | null;
  setShowDeleteEntitiesModal: (value: boolean) => void;
  setShowDeleteRelationsModal: (value: boolean) => void;
  setShowAddEntityModal: (value: boolean) => void;
  setShowAddRelationModal: (value: boolean) => void;
  setEditingEntity: (value: Entity | null) => void;
  setEditingRelation: (value: Relation | null) => void;
  setReplaceExistingEntities: (value: boolean) => void;
  setDeleteTargetEntity: (value: Entity | null) => void;
  setShowDeleteEntityModal: (value: boolean) => void;
  setDeleteTargetRelation: (value: Relation | null) => void;
  setShowDeleteRelationModal: (value: boolean) => void;
  onDeleteEntity?: (entityId: string) => Promise<void>;
  onDeleteRelation?: (relationId: string) => Promise<void>;
}

export default function TopicKnowledgeGraphSection({
  topicEntities,
  topicRelations,
  pendingEntities,
  pendingRelations,
  isLoadingEntities,
  isLoadingRelations,
  replaceExistingEntities,
  entitySearchQuery,
  entityTypeFilter,
  relationTypeLabels,
  entityTypeLabels,
  showDeleteEntitiesModal,
  showDeleteRelationsModal,
  showAddEntityModal,
  showAddRelationModal,
  editingEntity,
  editingRelation,
  showDeleteEntityModal,
  deleteTargetEntity,
  showDeleteRelationModal,
  deleteTargetRelation,
  setShowDeleteEntitiesModal,
  setShowDeleteRelationsModal,
  setShowAddEntityModal,
  setShowAddRelationModal,
  setEditingEntity,
  setEditingRelation,
  setReplaceExistingEntities,
  setDeleteTargetEntity,
  setShowDeleteEntityModal,
  setDeleteTargetRelation,
  setShowDeleteRelationModal,
  onDeleteEntity,
  onDeleteRelation,
}: TopicKnowledgeGraphSectionProps) {
  return (
    <div style={{ marginBottom: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '16px', color: '#1a1a1a', fontWeight: 600 }}>
            📊 ナレッジグラフ
          </div>
        </div>
      </div>
      
      {/* リスト表示 */}
      <>
        {/* エンティティ表示 */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600 }}>
              エンティティ
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {((pendingEntities && pendingEntities.length > 0) || topicEntities.length > 0) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteEntitiesModal(true);
                  }}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  一括削除
                </button>
              )}
              <button
                onClick={() => {
                  setEditingEntity(null);
                  setShowAddEntityModal(true);
                }}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                + 追加
              </button>
            </div>
          </div>
          {isLoadingEntities ? (
            <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontSize: '14px', color: '#6B7280' }}>
              読み込み中...
            </div>
          ) : (pendingEntities && pendingEntities.length > 0) || topicEntities.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {((pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities)
                .filter((entity) => {
                  if (entitySearchQuery) {
                    const query = entitySearchQuery.toLowerCase();
                    const matchesName = entity.name.toLowerCase().includes(query);
                    const matchesAliases = entity.aliases?.some(alias => 
                      alias.toLowerCase().includes(query)
                    ) || false;
                    if (!matchesName && !matchesAliases) {
                      return false;
                    }
                  }
                  if (entityTypeFilter !== 'all' && entity.type !== entityTypeFilter) {
                    return false;
                  }
                  return true;
                })
                .map((entity) => {
                  return (
                    <div
                      key={entity.id}
                      style={{
                        padding: '12px',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        fontSize: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#1a1a1a', fontWeight: 600 }}>
                            {entityTypeLabels[entity.type] || '📌 その他'} {entity.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => {
                              setEditingEntity(entity);
                              setShowAddEntityModal(true);
                            }}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: 'transparent',
                              color: '#6B7280',
                              border: '1px solid #D1D5DB',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            編集
                          </button>
                          {onDeleteEntity && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTargetEntity(entity);
                                setShowDeleteEntityModal(true);
                              }}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#EF4444',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              削除
                            </button>
                          )}
                        </div>
                      </div>
                      {entity.aliases && entity.aliases.length > 0 && (
                        <div style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px' }}>
                          別名: {entity.aliases.join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontSize: '14px', color: '#9CA3AF', fontStyle: 'italic' }}>
              登録なし（AI生成で自動追加されます）
            </div>
          )}
        </div>
        
        {/* リレーション表示 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600 }}>
              リレーション
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {((pendingRelations && pendingRelations.length > 0) || topicRelations.length > 0) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteRelationsModal(true);
                  }}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  一括削除
                </button>
              )}
              <button
                onClick={() => {
                  setEditingRelation(null);
                  setShowAddRelationModal(true);
                }}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                + 追加
              </button>
            </div>
          </div>
          {isLoadingRelations ? (
            <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontSize: '14px', color: '#6B7280' }}>
              読み込み中...
            </div>
          ) : (pendingRelations && pendingRelations.length > 0) || topicRelations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {((pendingRelations && pendingRelations.length > 0) ? pendingRelations : topicRelations)
                .map((relation) => {
                  const allEntities = (pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities;
                  const sourceEntity = allEntities.find(e => e.id === relation.sourceEntityId);
                  const targetEntity = allEntities.find(e => e.id === relation.targetEntityId);
                  const sourceName = sourceEntity?.name || relation.sourceEntityId || '不明';
                  const targetName = targetEntity?.name || relation.targetEntityId || '不明';
                  return (
                    <div
                      key={relation.id}
                      style={{
                        padding: '12px',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        fontSize: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <div style={{ color: '#1a1a1a', fontWeight: 500 }}>
                          <span style={{ color: '#0066CC', fontWeight: 600 }}>{sourceName}</span>{' '}
                          <span style={{ color: '#6B7280' }}>→ [{relationTypeLabels[relation.relationType] || relation.relationType}]</span>{' '}
                          <span style={{ color: '#0066CC', fontWeight: 600 }}>{targetName}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => {
                              setEditingRelation(relation);
                              setShowAddRelationModal(true);
                            }}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: 'transparent',
                              color: '#6B7280',
                              border: '1px solid #D1D5DB',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            編集
                          </button>
                          {onDeleteRelation && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTargetRelation(relation);
                                setShowDeleteRelationModal(true);
                              }}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#EF4444',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              削除
                            </button>
                          )}
                        </div>
                      </div>
                      {relation.description && (
                        <div style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px' }}>
                          {relation.description}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontSize: '14px', color: '#9CA3AF', fontStyle: 'italic' }}>
              登録なし（AI生成で自動追加されます）
            </div>
          )}
        </div>
      </>
      
      {/* エンティティ・リレーション保存オプション */}
      {(pendingEntities && pendingEntities.length > 0) || (pendingRelations && pendingRelations.length > 0) ? (
        <div style={{
          padding: '16px',
          backgroundColor: '#F0F9FF',
          borderRadius: '8px',
          border: '1px solid #BFDBFE',
          marginTop: '24px',
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#1E40AF',
          }}>
            <input
              type="checkbox"
              checked={replaceExistingEntities}
              onChange={(e) => setReplaceExistingEntities(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
              }}
            />
            <span>
              <strong>既存のエンティティ・リレーションを置き換える</strong>
              <br />
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                チェックを入れると、このトピックに関連する既存のエンティティとリレーションを削除してから新しいものを追加します。
                チェックを外すと、既存のものに追加されます。
              </span>
            </span>
          </label>
        </div>
      ) : null}
    </div>
  );
}

