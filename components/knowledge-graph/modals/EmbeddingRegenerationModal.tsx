'use client';

import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { TopicInfo } from '@/lib/orgApi';
import { batchUpdateEntityEmbeddings } from '@/lib/entityEmbeddings';
import { batchUpdateRelationEmbeddings } from '@/lib/relationEmbeddings';
import { batchUpdateTopicEmbeddings } from '@/lib/topicEmbeddings';
import { syncAllEmbeddings } from '@/lib/embeddingSync';
import { callTauriCommand } from '@/lib/localFirebase';
import RegenerationSettings from './components/RegenerationSettings';
import RegenerationProgress from './components/RegenerationProgress';
import { devLog, devWarn, devDebug } from './utils/devLog';

interface EmbeddingRegenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  isCancelledRef: React.MutableRefObject<boolean>;
  organizations: Array<{ id: string; name: string; title?: string; type?: string }>;
  entities: Entity[];
  relations: Relation[];
  topics: TopicInfo[];
  updateMissingCountsOrganization: (selectedOrgId: string, selectedType: string) => Promise<void>;
  startRegeneration: () => void;
  completeRegeneration: () => void;
  cancelRegeneration: () => void;
}

export default function EmbeddingRegenerationModal({
  isOpen,
  onClose,
  regenerationProgress,
  setRegenerationProgress,
  regenerationType,
  setRegenerationType,
  missingCounts,
  setMissingCounts,
  isCountingMissing,
  setIsCountingMissing,
  isRegeneratingEmbeddings,
  setIsRegeneratingEmbeddings,
  isCancelledRef,
  organizations,
  entities,
  relations,
  topics,
  updateMissingCountsOrganization,
  startRegeneration,
  completeRegeneration,
  cancelRegeneration,
}: EmbeddingRegenerationModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        // 処理中は背景クリックで閉じない
        if (isRegeneratingEmbeddings) {
          return;
        }
        onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>
            埋め込み再生成
          </h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '4px 8px',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>
        </div>
        
        {regenerationProgress.status === 'idle' && (
          <div>
            <RegenerationSettings
              regenerationType={regenerationType}
              setRegenerationType={(newType) => {
                setRegenerationType(newType);
                if (newType === 'all') {
                  setMissingCounts({ 
                    entities: 0, 
                    relations: 0, 
                    topics: 0, 
                    total: 0,
                    totalEntities: 0,
                    totalRelations: 0,
                    totalTopics: 0,
                  });
                }
              }}
              organizations={organizations}
              missingCounts={missingCounts}
              isCountingMissing={isCountingMissing}
              updateMissingCountsOrganization={updateMissingCountsOrganization}
            />
            
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#6B7280',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={async () => {
                  const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement;
                  const selectedType = typeSelect?.value || 'all';
                  const forceRegenerate = regenerationType === 'all'; // 'all'の場合は強制再生成
                  
                  const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
                  const selectedId = orgSelect?.value || 'all';
                  
                  devLog(`🚀 [埋め込み再生成] 開始: regenerationType=${regenerationType}, forceRegenerate=${forceRegenerate}, selectedId=${selectedId}, selectedType=${selectedType}`);
                  devLog(`📊 [埋め込み再生成] 現在のentities.length=${entities.length}, relations.length=${relations.length}, topics.length=${topics.length}`);

                  // 停止フラグをリセット
                  isCancelledRef.current = false;
                  setIsRegeneratingEmbeddings(true);
                  // モーダルを閉じる（処理はバックグラウンドで続行）
                  onClose();
                  const initialProgress = {
                    current: 0,
                    total: 0,
                    status: 'processing' as const,
                    logs: [],
                    stats: { success: 0, skipped: 0, errors: 0 },
                  };
                  setRegenerationProgress(initialProgress);
                  // グローバル状態を開始
                  startRegeneration();

                  try {
                    let totalEntities = 0;
                    let totalRelations = 0;
                    let totalTopics = 0;

                    // 対象を決定（organizationIdでフィルタリング、typeで組織と事業会社を区別）
                    let targetEntities = selectedId === 'all'
                      ? entities.filter(e => e.organizationId)
                      : entities.filter(e => e.organizationId === selectedId);
                    // Graphvizのリレーション（yamlFileIdが設定されている）の場合はtopicIdがnullでもOK
                    let targetRelations = selectedId === 'all'
                      ? relations.filter(r => {
                          const orgId = r.organizationId || entities.find(e => e.id === r.sourceEntityId || e.id === r.targetEntityId)?.organizationId;
                          // topicIdまたはyamlFileIdがあるもののみ（Graphvizのリレーションも含む）
                          return orgId && (r.topicId || r.yamlFileId);
                        })
                      : relations.filter(r => {
                          const orgId = r.organizationId || entities.find(e => e.id === r.sourceEntityId || e.id === r.targetEntityId)?.organizationId;
                          // topicIdまたはyamlFileIdがあるもののみ（Graphvizのリレーションも含む）
                          return orgId === selectedId && (r.topicId || r.yamlFileId);
                        });
                    
                    devLog(`📊 [埋め込み再生成] targetRelationsフィルタリング後: ${targetRelations.length}件 (全リレーション: ${relations.length}件)`);
                    if (targetRelations.length > 0) {
                      const graphvizCount = targetRelations.filter(r => r.yamlFileId).length;
                      const normalCount = targetRelations.filter(r => r.topicId && !r.yamlFileId).length;
                      devLog(`📊 [埋め込み再生成] リレーション内訳: Graphviz=${graphvizCount}件, 通常=${normalCount}件`);
                    }
                    // topicsプロップが空の場合、query_getで直接取得
                    let targetTopics: TopicInfo[] = [];
                    if (topics.length === 0) {
                      try {
                        devLog(`📊 [埋め込み再生成] topicsプロップが空のため、query_getで直接取得します`);
                        const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
                        let allTopicDocs: Array<{ id: string; data: any }> = [];
                        
                        if (useSupabase) {
                          // Supabase経由で取得
                          const { queryGetViaDataSource } = await import('@/lib/dataSourceAdapter');
                          const results = await queryGetViaDataSource('topics', selectedId !== 'all' ? { organizationId: selectedId } : {});
                          allTopicDocs = results.map((r: any) => ({
                            id: r.id || r.data?.id,
                            data: r.data || r,
                          }));
                        } else {
                          // SQLite経由で取得
                          allTopicDocs = await callTauriCommand('query_get', {
                            collectionName: 'topics',
                            conditions: selectedId !== 'all' ? { organizationId: selectedId } : {},
                          }) as Array<{ id: string; data: any }>;
                        }
                        
                        // TopicInfo形式に変換
                        for (const doc of allTopicDocs) {
                          const topicData = doc.data || doc;
                          const topicId = doc.id || topicData.id;
                          
                          // ID形式が`${meetingNoteId}-topic-${topicId}`の場合、topicIdを抽出
                          const idMatch = topicId.match(/^(.+)-topic-(.+)$/);
                          const extractedTopicId = idMatch ? idMatch[2] : topicId;
                          const meetingNoteId = idMatch ? idMatch[1] : topicData.meetingNoteId;
                          
                          targetTopics.push({
                            id: extractedTopicId,
                            itemId: topicId, // 完全なIDをitemIdとして保存
                            title: topicData.title || '',
                            content: topicData.content || '',
                            meetingNoteId: meetingNoteId || topicData.meetingNoteId || '',
                            meetingNoteTitle: topicData.meetingNoteTitle || '',
                            organizationId: topicData.organizationId || '',
                            semanticCategory: topicData.semanticCategory,
                            importance: topicData.importance,
                            keywords: topicData.keywords ? (Array.isArray(topicData.keywords) ? topicData.keywords : JSON.parse(topicData.keywords)) : undefined,
                            summary: topicData.summary,
                          });
                        }
                        devLog(`📊 [埋め込み再生成] query_getで取得したトピック数: ${targetTopics.length}件`);
                      } catch (error) {
                        devWarn(`⚠️ [埋め込み再生成] query_getでのトピック取得エラー:`, error);
                        // フォールバック: topicsプロップを使用
                        targetTopics = selectedId === 'all'
                          ? topics.filter(t => t.organizationId)
                          : topics.filter(t => t.organizationId === selectedId);
                      }
                    } else {
                      targetTopics = selectedId === 'all'
                        ? topics.filter(t => t.organizationId)
                        : topics.filter(t => t.organizationId === selectedId);
                    }
                    
                    devLog(`📊 [埋め込み再生成] targetTopicsフィルタリング後: ${targetTopics.length}件 (全トピック: ${topics.length}件)`);
                    if (targetTopics.length > 0) {
                      const graphvizCount = targetTopics.filter(t => t.meetingNoteId?.startsWith('graphviz_')).length;
                      const normalCount = targetTopics.filter(t => !t.meetingNoteId?.startsWith('graphviz_')).length;
                      devLog(`📊 [埋め込み再生成] トピック内訳: Graphviz=${graphvizCount}件, 通常=${normalCount}件`);
                    }

                    // 未生成のみの場合は、ChromaDBに実際に埋め込みが存在するかどうかを確認
                    if (!forceRegenerate && regenerationType === 'missing') {
                      devLog(`🔍 [埋め込み再生成] 未生成のみモード: フィルタリング開始`);
                      devLog(`📊 [埋め込み再生成] フィルタリング前: エンティティ=${targetEntities.length}, リレーション=${targetRelations.length}, トピック=${targetTopics.length}`);
                      
                      const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
                      
                      // Supabase使用時は、ChromaDBに実際に埋め込みが存在するかどうかを確認（モーダルの件数計算と同じ方法）
                      if (useSupabase) {
                        // エンティティのフィルタリング（ChromaDBに実際に埋め込みが存在するか確認）
                        if (selectedType === 'all' || selectedType === 'entities') {
                          try {
                            const { getEntityEmbeddingFromChroma } = await import('@/lib/entityEmbeddingsChroma');
                            const missingEntities: Entity[] = [];
                            
                            for (const entity of targetEntities) {
                              if (!entity.organizationId) continue;
                              
                              try {
                                const embedding = await getEntityEmbeddingFromChroma(entity.id, entity.organizationId);
                                // 埋め込みが存在しない、または空の場合は未生成とみなす
                                if (!embedding || !embedding.combinedEmbedding || !Array.isArray(embedding.combinedEmbedding) || embedding.combinedEmbedding.length === 0) {
                                  missingEntities.push(entity);
                                }
                              } catch (error: any) {
                                // エラーは埋め込みが存在しないとみなす
                                const errorMessage = error?.message || String(error || '');
                                if (!errorMessage.includes('ChromaDBクライアントが初期化されていません') && 
                                    !errorMessage.includes('no such table') &&
                                    !errorMessage.includes('Database error')) {
                                  // 予期しないエラーのみログに出力
                                  devDebug(`エンティティ ${entity.id} のChromaDB確認エラー:`, error);
                                }
                                missingEntities.push(entity);
                              }
                            }
                            
                            devLog(`📊 [埋め込み再生成] エンティティフィルタリング後: ${missingEntities.length}件`);
                            targetEntities = missingEntities;
                          } catch (error) {
                            devWarn(`⚠️ [埋め込み再生成] エンティティのChromaDB確認エラー:`, error);
                            // エラーが発生した場合は、すべてを未生成とみなす（安全側に倒す）
                            // targetEntitiesはそのまま使用
                          }
                        }
                        
                        // リレーションのフィルタリング（ChromaDBに実際に埋め込みが存在するか確認）
                        if (selectedType === 'all' || selectedType === 'relations') {
                          try {
                            const { getRelationEmbeddingFromChroma } = await import('@/lib/relationEmbeddingsChroma');
                            const missingRelations: Relation[] = [];
                            
                            for (const relation of targetRelations) {
                              // organizationIdを取得
                              let organizationId = relation.organizationId;
                              if (!organizationId) {
                                const relatedEntity = entities.find(e => e.id === relation.sourceEntityId || e.id === relation.targetEntityId);
                                organizationId = relatedEntity?.organizationId;
                              }
                              
                              if (!organizationId) continue;
                              
                              try {
                                const embedding = await getRelationEmbeddingFromChroma(relation.id, organizationId);
                                // 埋め込みが存在しない、または空の場合は未生成とみなす
                                if (!embedding || !embedding.combinedEmbedding || !Array.isArray(embedding.combinedEmbedding) || embedding.combinedEmbedding.length === 0) {
                                  missingRelations.push(relation);
                                }
                              } catch (error: any) {
                                // エラーは埋め込みが存在しないとみなす
                                const errorMessage = error?.message || String(error || '');
                                if (!errorMessage.includes('ChromaDBクライアントが初期化されていません') && 
                                    !errorMessage.includes('no such table') &&
                                    !errorMessage.includes('Database error')) {
                                  // 予期しないエラーのみログに出力
                                  devDebug(`リレーション ${relation.id} のChromaDB確認エラー:`, error);
                                }
                                missingRelations.push(relation);
                              }
                            }
                            
                            devLog(`📊 [埋め込み再生成] リレーションフィルタリング後: ${missingRelations.length}件`);
                            targetRelations = missingRelations;
                          } catch (error) {
                            devWarn(`⚠️ [埋め込み再生成] リレーションのChromaDB確認エラー:`, error);
                            // エラーが発生した場合は、すべてを未生成とみなす（安全側に倒す）
                            // targetRelationsはそのまま使用
                          }
                        }
                        
                        // トピックのフィルタリング（ChromaDBに実際に埋め込みが存在するか確認）
                        if (selectedType === 'all' || selectedType === 'topics') {
                          try {
                            const { getTopicEmbeddingFromChroma } = await import('@/lib/topicEmbeddingsChroma');
                            const missingTopics: TopicInfo[] = [];
                            
                            for (const topic of targetTopics) {
                              if (!topic.organizationId) continue;
                              
                              try {
                                const embedding = await getTopicEmbeddingFromChroma(topic.id, topic.organizationId);
                                // 埋め込みが存在しない、または空の場合は未生成とみなす
                                if (!embedding || !embedding.combinedEmbedding || !Array.isArray(embedding.combinedEmbedding) || embedding.combinedEmbedding.length === 0) {
                                  missingTopics.push(topic);
                                }
                              } catch (error: any) {
                                // エラーは埋め込みが存在しないとみなす
                                const errorMessage = error?.message || String(error || '');
                                if (!errorMessage.includes('ChromaDBクライアントが初期化されていません') && 
                                    !errorMessage.includes('no such table') &&
                                    !errorMessage.includes('Database error')) {
                                  // 予期しないエラーのみログに出力
                                  devDebug(`トピック ${topic.id} のChromaDB確認エラー:`, error);
                                }
                                missingTopics.push(topic);
                              }
                            }
                            
                            devLog(`📊 [埋め込み再生成] トピックフィルタリング後: ${missingTopics.length}件`);
                            targetTopics = missingTopics;
                          } catch (error) {
                            devWarn(`⚠️ [埋め込み再生成] トピックのChromaDB確認エラー:`, error);
                            // エラーが発生した場合は、すべてを未生成とみなす（安全側に倒す）
                            // targetTopicsはそのまま使用
                          }
                        }
                      } else {
                        // SQLite使用時は従来の方法（chromaSyncedフラグを使用）
                        const { callTauriCommand } = await import('@/lib/localFirebase');
                        
                        // エンティティのフィルタリング（SQLiteのchromaSyncedフラグを使用）
                        if (selectedType === 'all' || selectedType === 'entities') {
                          try {
                            const allEntityDocs = await callTauriCommand('query_get', {
                              collectionName: 'entities',
                              conditions: {},
                            }) as Array<{ id: string; data: any }>;
                            
                            const missingEntityDocs = allEntityDocs.filter(doc => {
                              const entityData = doc.data || doc;
                              const chromaSyncedValue = entityData.chromaSynced;
                              return chromaSyncedValue === 0 || chromaSyncedValue === null || chromaSyncedValue === undefined;
                            });
                            
                            const missingEntityIds = new Set(missingEntityDocs.map(doc => doc.id || doc.data?.id));
                            const missingEntities = targetEntities.filter(entity => missingEntityIds.has(entity.id));
                            
                            devLog(`📊 [埋め込み再生成] エンティティフィルタリング後: ${missingEntities.length}件`);
                            targetEntities = missingEntities;
                          } catch (error) {
                            devWarn(`⚠️ [埋め込み再生成] エンティティの一括取得エラー:`, error);
                          }
                        }
                        
                        // リレーションのフィルタリング（SQLiteのchromaSyncedフラグを使用）
                        if (selectedType === 'all' || selectedType === 'relations') {
                          try {
                            const allRelationDocs = await callTauriCommand('query_get', {
                              collectionName: 'relations',
                              conditions: {},
                            }) as Array<{ id: string; data: any }>;
                            
                            const missingRelationDocs = allRelationDocs.filter(doc => {
                              const relationData = doc.data || doc;
                              const chromaSyncedValue = relationData.chromaSynced;
                              return chromaSyncedValue === 0 || chromaSyncedValue === null || chromaSyncedValue === undefined;
                            });
                            
                            const missingRelationIds = new Set(missingRelationDocs.map(doc => doc.id || doc.data?.id));
                            const missingRelations = targetRelations.filter(relation => missingRelationIds.has(relation.id));
                            
                            devLog(`📊 [埋め込み再生成] リレーションフィルタリング後: ${missingRelations.length}件`);
                            targetRelations = missingRelations;
                          } catch (error) {
                            devWarn(`⚠️ [埋め込み再生成] リレーションの一括取得エラー:`, error);
                          }
                        }
                        
                        // トピックのフィルタリング（SQLiteのchromaSyncedフラグを使用）
                        if (selectedType === 'all' || selectedType === 'topics') {
                          try {
                            const allTopicDocs = await callTauriCommand('query_get', {
                              collectionName: 'topics',
                              conditions: selectedId !== 'all' ? { organizationId: selectedId } : {},
                            }) as Array<{ id: string; data: any }>;
                            
                            const missingTopicDocs = allTopicDocs.filter(doc => {
                              const topicData = doc.data || doc;
                              const chromaSyncedValue = topicData.chromaSynced;
                              return chromaSyncedValue === 0 || chromaSyncedValue === null || chromaSyncedValue === undefined;
                            });
                            
                            const missingTopicIdSet = new Set<string>();
                            for (const doc of missingTopicDocs) {
                              const topicId = doc.id || doc.data?.id;
                              if (topicId) {
                                const idMatch = topicId.match(/^(.+)-topic-(.+)$/);
                                if (idMatch) {
                                  const extractedTopicId = idMatch[2];
                                  missingTopicIdSet.add(extractedTopicId);
                                  missingTopicIdSet.add(topicId);
                                } else {
                                  missingTopicIdSet.add(topicId);
                                }
                              }
                            }
                            
                            const missingTopics = targetTopics.filter(topic => missingTopicIdSet.has(topic.id));
                            
                            devLog(`📊 [埋め込み再生成] トピックフィルタリング後: ${missingTopics.length}件`);
                            targetTopics = missingTopics;
                          } catch (error) {
                            devWarn(`⚠️ [埋め込み再生成] トピックの一括取得エラー:`, error);
                          }
                        }
                      }
                      
                      devLog(`✅ [埋め込み再生成] フィルタリング完了: エンティティ=${targetEntities.length}, リレーション=${targetRelations.length}, トピック=${targetTopics.length}`);
                    }

                    if (selectedType === 'all' || selectedType === 'entities') {
                      totalEntities = targetEntities.length;
                    }
                    if (selectedType === 'all' || selectedType === 'relations') {
                      totalRelations = targetRelations.length;
                    }
                    if (selectedType === 'all' || selectedType === 'topics') {
                      totalTopics = targetTopics.length;
                    }

                    const total = totalEntities + totalRelations + totalTopics;
                    devLog(`📊 [埋め込み再生成] 最終的な件数: エンティティ=${totalEntities}, リレーション=${totalRelations}, トピック=${totalTopics}, 合計=${total}`);
                    setRegenerationProgress(prev => ({ ...prev, total }));
                    
                    if (total === 0) {
                      devWarn(`⚠️ [埋め込み再生成] 処理対象が0件です。フィルタリング処理を確認してください。`);
                      setRegenerationProgress(prev => ({
                        ...prev,
                        status: 'completed',
                        logs: [
                          ...prev.logs,
                          {
                            type: 'info',
                            message: '処理対象が0件でした。すべてのアイテムが既に埋め込み済みの可能性があります。',
                            timestamp: new Date(),
                          },
                        ],
                      }));
                      setIsRegeneratingEmbeddings(false);
                      completeRegeneration();
                      return;
                    }

                    // エンティティの再生成
                    if (selectedType === 'all' || selectedType === 'entities') {
                      for (const entity of targetEntities) {
                        // 停止チェック
                        if (isCancelledRef.current) {
                          setRegenerationProgress(prev => ({
                            ...prev,
                            status: 'cancelled',
                            logs: [
                              ...prev.logs,
                              {
                                type: 'info',
                                message: '処理が中止されました',
                                timestamp: new Date(),
                              },
                            ],
                          }));
                          break;
                        }
                        
                        // organizationIdが必要
                        if (!entity.organizationId) {
                          devWarn(`⚠️ エンティティ ${entity.id} (${entity.name}) にorganizationIdがありません。スキップします。`);
                          continue;
                        }
                        
                        // 未生成のみの場合は、既にフィルタリング済みなのでチェック不要
                        // batchUpdateEntityEmbeddings内でもSQLiteのchromaSyncedフラグをチェックするため、ここではスキップ
                        
                        const entityIds = [entity.id];
                        // organizationIdを使用（typeで組織と事業会社を区別）
                        const orgOrCompanyId = entity.organizationId || '';
                        await batchUpdateEntityEmbeddings(
                          entityIds,
                          orgOrCompanyId,
                          forceRegenerate, // 選択されたモードに応じて設定
                          (current, total, entityId, status) => {
                            setRegenerationProgress(prev => ({
                              ...prev,
                              // success, skipped, errorのすべての場合にcurrentを増やす（処理が完了したことを示す）
                              current: prev.current + (status === 'success' || status === 'skipped' || status === 'error' ? 1 : 0),
                              logs: [
                                ...prev.logs,
                                {
                                  type: status === 'success' ? 'success' : status === 'error' ? 'error' : 'skip',
                                  message: `エンティティ: ${entity.name} (${status === 'success' ? '成功' : status === 'error' ? 'エラー' : 'スキップ'})`,
                                  timestamp: new Date(),
                                },
                              ],
                              stats: {
                                ...prev.stats,
                                success: prev.stats.success + (status === 'success' ? 1 : 0),
                                skipped: prev.stats.skipped + (status === 'skipped' ? 1 : 0),
                                errors: prev.stats.errors + (status === 'error' ? 1 : 0),
                              },
                            }));
                          },
                          () => isCancelledRef.current // shouldCancelコールバック
                        );
                        
                        // 停止チェック（バッチ処理後）
                        if (isCancelledRef.current) {
                          break;
                        }
                      }
                    }

                    // リレーションの再生成
                    if (selectedType === 'all' || selectedType === 'relations') {
                      for (const relation of targetRelations) {
                        // 停止チェック
                        if (isCancelledRef.current) {
                          setRegenerationProgress(prev => ({
                            ...prev,
                            status: 'cancelled',
                            logs: [
                              ...prev.logs,
                              {
                                type: 'info',
                                message: '処理が中止されました',
                                timestamp: new Date(),
                              },
                            ],
                          }));
                          break;
                        }
                        
                        // organizationIdを取得（リレーション自体のorganizationIdを優先、なければ関連エンティティから取得）
                        let organizationId = relation.organizationId;
                        if (!organizationId) {
                          const relatedEntity = entities.find(e => e.id === relation.sourceEntityId || e.id === relation.targetEntityId);
                          organizationId = relatedEntity?.organizationId;
                        }
                        
                        // organizationIdが必要
                        if (!organizationId) {
                          devWarn(`⚠️ リレーション ${relation.id} (${relation.relationType}) にorganizationIdがありません。スキップします。`);
                          continue;
                        }
                        
                        // organizationIdを使用（typeで組織と事業会社を区別）
                        const orgOrCompanyId = organizationId || '';

                        // Graphvizのリレーション（yamlFileIdが設定されている）の場合はtopicIdがnullでもOK
                        // topicIdもyamlFileIdもない場合はスキップ
                        if (!relation.topicId && !relation.yamlFileId) {
                          devWarn(`⚠️ リレーション ${relation.id} (${relation.relationType}) にtopicIdもyamlFileIdもありません。スキップします。`);
                          continue;
                        }
                        
                        // Graphvizのリレーションの場合、ログに出力
                        if (relation.yamlFileId) {
                          devLog(`📊 Graphvizリレーションの埋め込み生成: ${relation.id} (yamlFileId: ${relation.yamlFileId}, topicId: ${relation.topicId || 'null'})`);
                        }

                        // 未生成のみの場合は、既にフィルタリング済みなのでチェック不要
                        // batchUpdateRelationEmbeddings内でもチェックが行われるため、ここではスキップ

                        const relationIds = [relation.id];
                        await batchUpdateRelationEmbeddings(
                          relationIds,
                          orgOrCompanyId,
                          forceRegenerate, // 選択されたモードに応じて設定
                          (current, total, relationId, status) => {
                            setRegenerationProgress(prev => ({
                              ...prev,
                              // success, skipped, errorのすべての場合にcurrentを増やす（処理が完了したことを示す）
                              current: prev.current + (status === 'success' || status === 'skipped' || status === 'error' ? 1 : 0),
                              logs: [
                                ...prev.logs,
                                {
                                  type: status === 'success' ? 'success' : status === 'error' ? 'error' : 'skip',
                                  message: `リレーション: ${relation.relationType} (${status === 'success' ? '成功' : status === 'error' ? 'エラー' : 'スキップ'})`,
                                  timestamp: new Date(),
                                },
                              ],
                              stats: {
                                ...prev.stats,
                                success: prev.stats.success + (status === 'success' ? 1 : 0),
                                skipped: prev.stats.skipped + (status === 'skipped' ? 1 : 0),
                                errors: prev.stats.errors + (status === 'error' ? 1 : 0),
                              },
                            }));
                          },
                          () => isCancelledRef.current // shouldCancelコールバック
                        );
                        
                        // 停止チェック（バッチ処理後）
                        if (isCancelledRef.current) {
                          break;
                        }
                      }
                    }

                    // トピックの再生成
                    if (selectedType === 'all' || selectedType === 'topics') {
                      // トピックをmeetingNoteIdごとにグループ化
                      const topicsByMeetingNote = new Map<string, Array<{ id: string; title: string; content: string; metadata?: any }>>();
                      
                      for (const topic of targetTopics) {
                        if (!topic.organizationId || !topic.meetingNoteId) {
                          devWarn(`⚠️ トピック ${topic.id} (${topic.title}) にorganizationIdまたはmeetingNoteIdがありません。スキップします。`);
                          continue;
                        }

                        // 未生成のみの場合は、既にフィルタリング済みなのでチェック不要
                        // batchUpdateTopicEmbeddings内でもチェックが行われるため、ここではスキップ

                        if (!topicsByMeetingNote.has(topic.meetingNoteId)) {
                          topicsByMeetingNote.set(topic.meetingNoteId, []);
                        }

                        const topicData = {
                          id: topic.id,
                          title: topic.title,
                          content: topic.content || '',
                          metadata: {
                            keywords: topic.keywords,
                            semanticCategory: topic.semanticCategory,
                            summary: topic.summary,
                            importance: topic.importance,
                          },
                        };

                        topicsByMeetingNote.get(topic.meetingNoteId)!.push(topicData);
                      }

                      // 各議事録ごとにトピック埋め込みを再生成
                      for (const [meetingNoteId, topicList] of topicsByMeetingNote.entries()) {
                        // 停止チェック
                        if (isCancelledRef.current) {
                          setRegenerationProgress(prev => ({
                            ...prev,
                            status: 'cancelled',
                            logs: [
                              ...prev.logs,
                              {
                                type: 'info',
                                message: '処理が中止されました',
                                timestamp: new Date(),
                              },
                            ],
                          }));
                          break;
                        }
                        
                        const firstTopic = topicList[0];
                        if (!firstTopic) continue;

                        // 組織IDを取得（最初のトピックから）
                        const orgTopic = targetTopics.find(t => t.meetingNoteId === meetingNoteId);
                        if (!orgTopic?.organizationId) {
                          devWarn(`⚠️ 議事録 ${meetingNoteId} のトピックにorganizationIdがありません。スキップします。`);
                          continue;
                        }

                        await batchUpdateTopicEmbeddings(
                          topicList,
                          meetingNoteId,
                          orgTopic.organizationId,
                          forceRegenerate, // 選択されたモードに応じて設定
                          (current, total, topicId, status) => {
                            const topic = topicList.find(t => t.id === topicId);
                            setRegenerationProgress(prev => ({
                              ...prev,
                              // success, skipped, errorのすべての場合にcurrentを増やす（処理が完了したことを示す）
                              current: prev.current + (status === 'success' || status === 'skipped' || status === 'error' ? 1 : 0),
                              logs: [
                                ...prev.logs,
                                {
                                  type: status === 'success' ? 'success' : status === 'error' ? 'error' : 'skip',
                                  message: `トピック: ${topic?.title || topicId} (${status === 'success' ? '成功' : status === 'error' ? 'エラー' : 'スキップ'})`,
                                  timestamp: new Date(),
                                },
                              ],
                              stats: {
                                ...prev.stats,
                                success: prev.stats.success + (status === 'success' ? 1 : 0),
                                skipped: prev.stats.skipped + (status === 'skipped' ? 1 : 0),
                                errors: prev.stats.errors + (status === 'error' ? 1 : 0),
                              },
                            }));
                          },
                          () => isCancelledRef.current // shouldCancelコールバック
                        );
                        
                        // 停止チェック（バッチ処理後）
                        if (isCancelledRef.current) {
                          break;
                        }
                      }
                    }

                    // 停止されていない場合のみ完了ステータスを設定
                    if (!isCancelledRef.current) {
                      setRegenerationProgress(prev => ({ ...prev, status: 'completed' }));
                      // 完了ステータスを設定した後、グローバル状態も更新
                      completeRegeneration();
                    }
                  } catch (error: any) {
                    console.error('埋め込み再生成エラー:', error);
                    setRegenerationProgress(prev => ({
                      ...prev,
                      status: isCancelledRef.current ? 'cancelled' : 'completed',
                      logs: [
                        ...prev.logs,
                        {
                          type: 'error',
                          message: `エラー: ${error.message || '不明なエラー'}`,
                          timestamp: new Date(),
                        },
                      ],
                    }));
                    // エラー時も完了ステータスを設定した場合はグローバル状態を更新
                    if (!isCancelledRef.current) {
                      completeRegeneration();
                    } else {
                      cancelRegeneration();
                    }
                  } finally {
                    setIsRegeneratingEmbeddings(false);
                  }
                }}
                disabled={isRegeneratingEmbeddings}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isRegeneratingEmbeddings ? '#9CA3AF' : '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: isRegeneratingEmbeddings ? 'not-allowed' : 'pointer',
                  opacity: isRegeneratingEmbeddings ? 0.6 : 1,
                }}
              >
                開始
              </button>
              {isRegeneratingEmbeddings && (
                <button
                  onClick={() => {
                    isCancelledRef.current = true;
                    setRegenerationProgress(prev => ({
                      ...prev,
                      status: 'cancelled',
                      logs: [
                        ...prev.logs,
                        {
                          type: 'info',
                          message: '停止がリクエストされました。処理を完了して停止します...',
                          timestamp: new Date(),
                        },
                      ],
                    }));
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    marginLeft: '8px',
                  }}
                >
                  停止
                </button>
              )}
            </div>
          </div>
        )}

        <RegenerationProgress
          regenerationProgress={regenerationProgress}
          setRegenerationProgress={setRegenerationProgress}
          isCancelledRef={isCancelledRef}
          setIsRegeneratingEmbeddings={setIsRegeneratingEmbeddings}
          cancelRegeneration={cancelRegeneration}
        />
      </div>
    </div>
  );
}
