'use client';

import { useState, useEffect } from 'react';
import type { TopicSemanticCategory, TopicImportance } from '@/types/topicMetadata';
import type { Entity, EntityType } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { TabType, MeetingNoteData } from '../../types';
import { generateUniqueId } from '@/lib/orgApi';
import { extractEntities, extractRelations } from '@/lib/topicMetadataGeneration';
import { devLog } from '../../utils';
import DeleteEntitiesConfirmModal from './DeleteEntitiesConfirmModal';
import DeleteRelationsConfirmModal from './DeleteRelationsConfirmModal';
import DeleteEntityConfirmModal from './DeleteEntityConfirmModal';
import DeleteRelationConfirmModal from './DeleteRelationConfirmModal';
import AddEntityModal from './AddEntityModal';
import AddRelationModal from './AddRelationModal';
import TopicFileSection from './TopicFileSection';
import TopicMetadataSection from './TopicMetadataSection';
import TopicKnowledgeGraphSection from './TopicKnowledgeGraphSection';

interface TopicModalProps {
  isOpen: boolean;
  editingTopicItemId: string | null;
  editingTopicId: string | null;
  activeTab: TabType;
  monthContents: MeetingNoteData;
  topicTitle: string;
  topicContent: string;
  topicSemanticCategory: TopicSemanticCategory | '';
  topicKeywords: string;
  topicSummary: string;
  topicImportance: TopicImportance | '';
  pendingMetadata: {
    semanticCategory?: TopicSemanticCategory;
    importance?: TopicImportance;
    keywords?: string[];
    summary?: string;
  } | null;
  topicMetadataModelType: 'gpt' | 'local' | 'local-lfm';
  topicMetadataSelectedModel: string;
  topicMetadataMode: 'overwrite' | 'merge';
  topicMetadataLocalModels: Array<{ value: string; label: string }>;
  loadingTopicMetadataLocalModels: boolean;
  isGeneratingMetadata: boolean;
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
  organizationId: string;
  meetingId: string;
  savingStatus?: 'idle' | 'saving' | 'saved';
  // Setters
  setTopicTitle: (value: string) => void;
  setTopicContent: (value: string) => void;
  setTopicSemanticCategory: (value: TopicSemanticCategory | '') => void;
  setTopicKeywords: (value: string) => void;
  setTopicSummary: (value: string) => void;
  setTopicImportance: (value: TopicImportance | '') => void;
  setPendingMetadata: (value: {
    semanticCategory?: TopicSemanticCategory;
    importance?: TopicImportance;
    keywords?: string[];
    summary?: string;
  } | null) => void;
  setTopicMetadataModelType: (value: 'gpt' | 'local' | 'local-lfm') => void;
  setTopicMetadataSelectedModel: (value: string) => void;
  setTopicMetadataMode: (value: 'overwrite' | 'merge') => void;
  setIsGeneratingMetadata: (value: boolean) => void;
  setPendingEntities: (value: Entity[] | null) => void;
  setPendingRelations: (value: Relation[] | null) => void;
  setReplaceExistingEntities: (value: boolean) => void;
  setEntitySearchQuery?: (value: string) => void;
  setEntityTypeFilter?: (value: EntityType | 'all') => void;
  // Sub-modals
  showDeleteEntitiesModal: boolean;
  showDeleteRelationsModal: boolean;
  showAddEntityModal: boolean;
  showAddRelationModal: boolean;
  editingEntity: Entity | null;
  editingRelation: Relation | null;
  setShowDeleteEntitiesModal: (value: boolean) => void;
  setShowDeleteRelationsModal: (value: boolean) => void;
  setShowAddEntityModal: (value: boolean) => void;
  setShowAddRelationModal: (value: boolean) => void;
  setEditingEntity: (value: Entity | null) => void;
  setEditingRelation: (value: Relation | null) => void;
  // Callbacks
  onClose: () => void;
  onSave: (updatedContents: MeetingNoteData) => void;
  onCancel?: () => void;
  onDeleteEntities?: () => Promise<void>;
  onDeleteRelations?: () => Promise<void>;
  onDeleteEntity?: (entityId: string) => Promise<void>;
  onDeleteRelation?: (relationId: string) => Promise<void>;
  onSaveEntity?: (name: string, type: EntityType) => Promise<void>;
  onSaveRelation?: (sourceEntityId: string, targetEntityId: string, relationType: string, description?: string) => Promise<void>;
}

export default function TopicModal({
  isOpen,
  editingTopicItemId,
  editingTopicId,
  activeTab,
  monthContents,
  topicTitle,
  topicContent,
  topicSemanticCategory,
  topicKeywords,
  topicSummary,
  topicImportance,
  pendingMetadata,
  topicMetadataModelType,
  topicMetadataSelectedModel,
  topicMetadataMode,
  topicMetadataLocalModels,
  loadingTopicMetadataLocalModels,
  isGeneratingMetadata,
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
  organizationId,
  meetingId,
  savingStatus = 'idle',
  setTopicTitle,
  setTopicContent,
  setTopicSemanticCategory,
  setTopicKeywords,
  setTopicSummary,
  setTopicImportance,
  setPendingMetadata,
  setTopicMetadataModelType,
  setTopicMetadataSelectedModel,
  setTopicMetadataMode,
  setIsGeneratingMetadata,
  setPendingEntities,
  setPendingRelations,
  setReplaceExistingEntities,
  setEntitySearchQuery,
  setEntityTypeFilter,
  showDeleteEntitiesModal,
  showDeleteRelationsModal,
  showAddEntityModal,
  showAddRelationModal,
  editingEntity,
  editingRelation,
  setShowDeleteEntitiesModal,
  setShowDeleteRelationsModal,
  setShowAddEntityModal,
  setShowAddRelationModal,
  setEditingEntity,
  setEditingRelation,
  onClose,
  onSave,
  onCancel,
  onDeleteEntities,
  onDeleteRelations,
  onDeleteEntity,
  onDeleteRelation,
  onSaveEntity,
  onSaveRelation,
}: TopicModalProps) {
  // 個別削除モーダルの状態
  const [showDeleteEntityModal, setShowDeleteEntityModal] = useState(false);
  const [deleteTargetEntity, setDeleteTargetEntity] = useState<Entity | null>(null);
  const [showDeleteRelationModal, setShowDeleteRelationModal] = useState(false);
  const [deleteTargetRelation, setDeleteTargetRelation] = useState<Relation | null>(null);



  if (!isOpen || !editingTopicItemId) {
    return null;
  }

  const currentItem = monthContents[activeTab]?.items?.find(i => i.id === editingTopicItemId);
  const displayTopicId = editingTopicId 
    ? `${editingTopicItemId}-topic-${editingTopicId}`
    : `${editingTopicItemId}-topic-${generateUniqueId()}`;

  // エンティティとリレーションを生成する関数（メタデータ生成時に呼び出される）
  const handleGenerateEntitiesAndRelations = async () => {
    if (!topicTitle.trim() || !topicContent.trim()) {
      return;
    }
    
    try {
      // エンティティとリレーションを生成
      devLog('🤖 エンティティ・リレーション抽出を開始...');
      const extractedEntities = await extractEntities(topicTitle, topicContent, topicMetadataSelectedModel);
      devLog('✅ エンティティ抽出完了:', extractedEntities.length, '件');
      
      const extractedRelations = extractedEntities.length > 0
        ? await extractRelations(topicTitle, topicContent, extractedEntities, topicMetadataSelectedModel)
        : [];
      devLog('✅ リレーション抽出完了:', extractedRelations.length, '件');
      
      // エンティティにorganizationIdを設定
      const entitiesWithOrgId = extractedEntities.map(entity => ({
        ...entity,
        organizationId: organizationId,
      }));
      
      // リレーションにtopicIdとorganizationIdを設定
      const topicEmbeddingId = editingTopicId 
        ? `${meetingId}-topic-${editingTopicId}`
        : `${meetingId}-topic-${generateUniqueId()}`;
      const relationsWithIds = extractedRelations.map(relation => ({
        ...relation,
        topicId: editingTopicId || topicEmbeddingId,
        organizationId: organizationId,
      }));
      
      // 生成されたエンティティとリレーションを一時的に保持
      setPendingEntities(entitiesWithOrgId);
      setPendingRelations(relationsWithIds);
    } catch (error: any) {
      console.error('❌ エンティティ・リレーション抽出エラー:', error);
      alert(`エンティティ・リレーションの抽出に失敗しました: ${error?.message || '不明なエラー'}`);
    }
  };


  return (
    <>
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(44, 62, 80, 0.4) 0%, rgba(30, 41, 59, 0.35) 100%)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2001,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '1200px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            position: 'relative',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
              {editingTopicId ? '個別トピックを編集' : '個別トピックを追加'}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '28px',
                cursor: 'pointer',
                color: '#6B7280',
                padding: '4px 8px',
                lineHeight: 1,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#1a1a1a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#6B7280';
              }}
            >
              ×
            </button>
          </div>
          
          {/* コンテンツ */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
            {/* ID表示 */}
            <div style={{
              marginBottom: '28px',
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              borderLeft: '4px solid #0066CC',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span style={{ fontSize: '18px' }}>🆔</span>
                  トピックID:
                </span>
                <code 
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(displayTopicId);
                      alert('トピックIDをコピーしました: ' + displayTopicId);
                    } catch (error) {
                      console.error('コピーに失敗しました:', error);
                      // フォールバック: テキストエリアを使用
                      const textArea = document.createElement('textarea');
                      textArea.value = displayTopicId;
                      document.body.appendChild(textArea);
                      textArea.select();
                      try {
                        document.execCommand('copy');
                        alert('トピックIDをコピーしました: ' + displayTopicId);
                      } catch (err) {
                        alert('コピーに失敗しました');
                      }
                      document.body.removeChild(textArea);
                    }
                  }}
                  style={{
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    color: '#0066CC',
                    backgroundColor: '#EFF6FF',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                    border: '1px solid #DBEAFE',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s, transform 0.1s',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#DBEAFE';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#EFF6FF';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  title="クリックしてコピー"
                >
                  {displayTopicId} 📋
                </code>
                {!editingTopicId && (
                  <span style={{
                    fontSize: '12px',
                    color: '#64748B',
                    fontStyle: 'italic',
                    padding: '4px 8px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '6px',
                  }}>
                    (保存時に確定)
                  </span>
                )}
              </div>
            </div>
            
            {/* トピックタイトル */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                トピックタイトル <span style={{ color: '#DC2626' }}>*</span>
              </div>
              <input
                type="text"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="例: プロジェクト進捗報告、課題の共有など"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  fontSize: '16px',
                  backgroundColor: '#FFFFFF',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            
            {/* 内容 */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                内容
              </div>
              <textarea
                value={topicContent}
                onChange={(e) => setTopicContent(e.target.value)}
                placeholder="トピックの詳細な内容を入力してください。Markdown形式で記述できます。"
                style={{
                  width: '100%',
                  minHeight: '200px',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  lineHeight: '1.6',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>
            
            {/* ファイルセクション */}
            {editingTopicId && (
              <TopicFileSection
                editingTopicId={editingTopicId}
                meetingId={meetingId}
                organizationId={organizationId}
              />
            )}
            
            {/* メタデータセクション */}
            <TopicMetadataSection
              topicTitle={topicTitle}
              topicContent={topicContent}
              topicSemanticCategory={topicSemanticCategory}
              topicKeywords={topicKeywords}
              topicSummary={topicSummary}
              topicImportance={topicImportance}
              pendingMetadata={pendingMetadata}
              topicMetadataModelType={topicMetadataModelType}
              topicMetadataSelectedModel={topicMetadataSelectedModel}
              topicMetadataMode={topicMetadataMode}
              topicMetadataLocalModels={topicMetadataLocalModels}
              loadingTopicMetadataLocalModels={loadingTopicMetadataLocalModels}
              isGeneratingMetadata={isGeneratingMetadata}
              setTopicSemanticCategory={setTopicSemanticCategory}
              setTopicKeywords={setTopicKeywords}
              setTopicSummary={setTopicSummary}
              setTopicImportance={setTopicImportance}
              setPendingMetadata={setPendingMetadata}
              setTopicMetadataModelType={setTopicMetadataModelType}
              setTopicMetadataSelectedModel={setTopicMetadataSelectedModel}
              setTopicMetadataMode={setTopicMetadataMode}
              setIsGeneratingMetadata={setIsGeneratingMetadata}
              onGenerateEntitiesAndRelations={handleGenerateEntitiesAndRelations}
            />
            
            {/* ナレッジグラフ: エンティティとリレーション */}
            <TopicKnowledgeGraphSection
              topicEntities={topicEntities}
              topicRelations={topicRelations}
              pendingEntities={pendingEntities}
              pendingRelations={pendingRelations}
              isLoadingEntities={isLoadingEntities}
              isLoadingRelations={isLoadingRelations}
              replaceExistingEntities={replaceExistingEntities}
              entitySearchQuery={entitySearchQuery}
              entityTypeFilter={entityTypeFilter}
              relationTypeLabels={relationTypeLabels}
              entityTypeLabels={entityTypeLabels}
              showDeleteEntitiesModal={showDeleteEntitiesModal}
              showDeleteRelationsModal={showDeleteRelationsModal}
              showAddEntityModal={showAddEntityModal}
              showAddRelationModal={showAddRelationModal}
              editingEntity={editingEntity}
              editingRelation={editingRelation}
              showDeleteEntityModal={showDeleteEntityModal}
              deleteTargetEntity={deleteTargetEntity}
              showDeleteRelationModal={showDeleteRelationModal}
              deleteTargetRelation={deleteTargetRelation}
              setShowDeleteEntitiesModal={setShowDeleteEntitiesModal}
              setShowDeleteRelationsModal={setShowDeleteRelationsModal}
              setShowAddEntityModal={setShowAddEntityModal}
              setShowAddRelationModal={setShowAddRelationModal}
              setEditingEntity={setEditingEntity}
              setEditingRelation={setEditingRelation}
              setReplaceExistingEntities={setReplaceExistingEntities}
              setDeleteTargetEntity={setDeleteTargetEntity}
              setShowDeleteEntityModal={setShowDeleteEntityModal}
              setDeleteTargetRelation={setDeleteTargetRelation}
              setShowDeleteRelationModal={setShowDeleteRelationModal}
              onDeleteEntity={onDeleteEntity}
              onDeleteRelation={onDeleteRelation}
            />
            
            {/* ボタン */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '16px',
              paddingTop: '32px',
              marginTop: '32px',
              borderTop: '2px solid #E5E7EB',
            }}>
              <button
                onClick={onClose}
                style={{
                  padding: '14px 28px',
                  background: '#F3F4F6',
                  color: '#374151',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#E5E7EB';
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#F3F4F6';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                }}
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (!topicTitle.trim()) {
                    alert('トピックタイトルを入力してください。');
                    return;
                  }
                  
                  const updatedContents = { ...monthContents };
                  const tabData = updatedContents[activeTab];
                  if (tabData) {
                    const itemIndex = tabData.items.findIndex(i => i.id === editingTopicItemId);
                    if (itemIndex !== -1) {
                      const updatedItems = [...tabData.items];
                      const currentItem = updatedItems[itemIndex];
                      const currentTopics = currentItem.topics || [];
                      
                      const now = new Date().toISOString();
                      
                      // キーワードを配列に変換（カンマ区切り）
                      const keywordsArray = topicKeywords
                        .split(',')
                        .map(k => k.trim())
                        .filter(k => k.length > 0);
                      
                      if (editingTopicId) {
                        // 編集モード
                        const topicIndex = currentTopics.findIndex(t => t.id === editingTopicId);
                        if (topicIndex !== -1) {
                          const existingTopic = currentTopics[topicIndex];
                          const updatedTopics = [...currentTopics];
                          updatedTopics[topicIndex] = {
                            ...existingTopic,
                            id: existingTopic.id,
                            title: topicTitle.trim(),
                            content: topicContent.trim(),
                            semanticCategory: topicSemanticCategory || undefined,
                            importance: topicImportance || undefined,
                            keywords: keywordsArray.length > 0 ? keywordsArray : undefined,
                            summary: topicSummary.trim() || undefined,
                            updatedAt: now,
                            createdAt: existingTopic.createdAt || now,
                          };
                          updatedItems[itemIndex] = {
                            ...currentItem,
                            topics: updatedTopics,
                          };
                        }
                      } else {
                        // 新規追加モード
                        const newTopicId = generateUniqueId();
                        updatedItems[itemIndex] = {
                          ...currentItem,
                          topics: [
                            ...currentTopics,
                            {
                              id: newTopicId,
                              title: topicTitle.trim(),
                              content: topicContent.trim(),
                              semanticCategory: topicSemanticCategory || undefined,
                              importance: topicImportance || undefined,
                              keywords: keywordsArray.length > 0 ? keywordsArray : undefined,
                              summary: topicSummary.trim() || undefined,
                              mentionedDate: currentItem.date || undefined,
                              createdAt: now,
                              updatedAt: now,
                            },
                          ],
                        };
                      }
                      
                      updatedContents[activeTab] = {
                        ...tabData,
                        items: updatedItems,
                      };
                      onSave(updatedContents);
                    }
                  }
                }}
                style={{
                  padding: '14px 28px',
                  background: 'linear-gradient(135deg, #0066CC 0%, #0051a8 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 102, 204, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #0051a8 0%, #004080 100%)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 102, 204, 0.4), 0 4px 8px rgba(0, 0, 0, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #0066CC 0%, #0051a8 100%)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 102, 204, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {editingTopicId ? '💾 変更を保存' : '✨ トピックを追加'}
              </button>
              {savingStatus === 'saving' && (
                <span
                  style={{
                    marginLeft: '12px',
                    color: '#0066CC',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      border: '2px solid #0066CC',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  保存中
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      {onDeleteEntities && (
        <DeleteEntitiesConfirmModal
          isOpen={showDeleteEntitiesModal}
          entities={(pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities}
          onConfirm={async () => {
            await onDeleteEntities();
            setShowDeleteEntitiesModal(false);
          }}
          onCancel={() => setShowDeleteEntitiesModal(false)}
        />
      )}
      {onDeleteRelations && (
        <DeleteRelationsConfirmModal
          isOpen={showDeleteRelationsModal}
          relations={(pendingRelations && pendingRelations.length > 0) ? pendingRelations : topicRelations}
          entities={(pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities}
          onConfirm={async () => {
            await onDeleteRelations();
            setShowDeleteRelationsModal(false);
          }}
          onCancel={() => setShowDeleteRelationsModal(false)}
        />
      )}
      {onSaveEntity && (
        <AddEntityModal
          isOpen={showAddEntityModal}
          editingEntity={editingEntity}
          onSave={onSaveEntity}
          onCancel={() => {
            setShowAddEntityModal(false);
            setEditingEntity(null);
          }}
        />
      )}
      {onSaveRelation && (
        <AddRelationModal
          isOpen={showAddRelationModal}
          editingRelation={editingRelation}
          entities={(pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities}
          onSave={onSaveRelation}
          onCancel={() => {
            setShowAddRelationModal(false);
            setEditingRelation(null);
          }}
        />
      )}
      {/* エンティティ個別削除確認モーダル */}
      {onDeleteEntity && (
        <DeleteEntityConfirmModal
          isOpen={showDeleteEntityModal}
          entity={deleteTargetEntity}
          onConfirm={async () => {
            if (deleteTargetEntity) {
              try {
                await onDeleteEntity(deleteTargetEntity.id);
                // エンティティをリストから削除（親コンポーネントで更新されるため、ここでは削除のみ）
                if (pendingEntities) {
                  setPendingEntities(pendingEntities.filter(e => e.id !== deleteTargetEntity.id));
                }
                // topicEntitiesの場合は親コンポーネントで更新される
                setShowDeleteEntityModal(false);
                setDeleteTargetEntity(null);
              } catch (error: any) {
                console.error('エンティティ削除エラー:', error);
                alert(`エンティティの削除に失敗しました: ${error?.message || '不明なエラー'}`);
                setShowDeleteEntityModal(false);
                setDeleteTargetEntity(null);
              }
            }
          }}
          onCancel={() => {
            setShowDeleteEntityModal(false);
            setDeleteTargetEntity(null);
          }}
        />
      )}
      
      {/* リレーション個別削除確認モーダル */}
      {onDeleteRelation && (
        <DeleteRelationConfirmModal
          isOpen={showDeleteRelationModal}
          relation={deleteTargetRelation}
          sourceEntity={deleteTargetRelation ? ((pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities).find(e => e.id === deleteTargetRelation.sourceEntityId) || null : null}
          targetEntity={deleteTargetRelation ? ((pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities).find(e => e.id === deleteTargetRelation.targetEntityId) || null : null}
          relationTypeLabel={deleteTargetRelation ? (relationTypeLabels[deleteTargetRelation.relationType] || deleteTargetRelation.relationType) : ''}
          onConfirm={async () => {
            if (deleteTargetRelation) {
              try {
                await onDeleteRelation(deleteTargetRelation.id);
                // リレーションをリストから削除（親コンポーネントで更新されるため、ここでは削除のみ）
                if (pendingRelations) {
                  setPendingRelations(pendingRelations.filter(r => r.id !== deleteTargetRelation.id));
                }
                // topicRelationsの場合は親コンポーネントで更新される
                setShowDeleteRelationModal(false);
                setDeleteTargetRelation(null);
              } catch (error: any) {
                console.error('リレーション削除エラー:', error);
                alert(`リレーションの削除に失敗しました: ${error?.message || '不明なエラー'}`);
                setShowDeleteRelationModal(false);
                setDeleteTargetRelation(null);
              }
            }
          }}
          onCancel={() => {
            setShowDeleteRelationModal(false);
            setDeleteTargetRelation(null);
          }}
        />
      )}
    </>
  );
}
