/**
 * YAMLファイル用メタデータ抽出コンポーネント
 * AIを使ってエンティティとリレーションを抽出・表示
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiZap, FiChevronDown, FiChevronUp, FiX, FiSave, FiEdit2, FiXCircle, FiTrash2 } from 'react-icons/fi';
import { extractAndSaveYamlMetadata } from '@/lib/graphvizMetadataGeneration';
import { getAvailableOllamaModels } from '@/lib/pageGeneration';
import { updateGraphvizYamlFile } from '@/lib/graphvizApi';
import { updateEntity, getEntitiesByYamlFileId, deleteEntity } from '@/lib/entityApi';
import { updateRelation, getRelationsByYamlFileId, deleteRelation } from '@/lib/relationApi';
import type { Entity, Relation } from '@/types/entity';

const GPT_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

interface MetadataExtractorProps {
  yamlFileId: string | null; // 保存済みYAMLファイルID（nullの場合は未保存）
  yamlName: string; // YAMLファイル名
  yamlContent: string; // YAMLコンテンツ
  dotContent?: string; // Graphviz DOTコード（オプション、リレーション抽出に使用）
  organizationId?: string; // 組織ID（オプション）
  semanticCategory?: string; // セマンティックカテゴリ
  keywords?: string[]; // キーワード配列
  contentSummary?: string; // 要約
  onMetadataExtracted?: (entities: Entity[], relations: Relation[]) => void; // 抽出完了時のコールバック
  onMetadataUpdated?: () => void; // メタデータ更新完了時のコールバック
}

export function MetadataExtractor({
  yamlFileId,
  yamlName,
  yamlContent,
  dotContent,
  organizationId,
  semanticCategory,
  keywords = [],
  contentSummary,
  onMetadataExtracted,
  onMetadataUpdated,
}: MetadataExtractorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [extractedEntities, setExtractedEntities] = useState<Entity[]>([]);
  const [extractedRelations, setExtractedRelations] = useState<Relation[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // メタデータ編集状態
  const [editingSemanticCategory, setEditingSemanticCategory] = useState(false);
  const [editingKeywords, setEditingKeywords] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);
  const [editedSemanticCategory, setEditedSemanticCategory] = useState(semanticCategory || '');
  const [editedKeywords, setEditedKeywords] = useState<string[]>(keywords || []);
  const [editedSummary, setEditedSummary] = useState(contentSummary || '');
  const [isSaving, setIsSaving] = useState(false);
  
  // エンティティとリレーションの編集状態
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [editingRelationId, setEditingRelationId] = useState<string | null>(null);
  const [editedEntities, setEditedEntities] = useState<Entity[]>([]);
  const [editedRelations, setEditedRelations] = useState<Relation[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // propsが変更されたら編集値を更新
  useEffect(() => {
    setEditedSemanticCategory(semanticCategory || '');
    setEditedKeywords(keywords || []);
    setEditedSummary(contentSummary || '');
  }, [semanticCategory, keywords, contentSummary]);
  
  // 抽出されたエンティティとリレーションを編集用の状態にコピー
  useEffect(() => {
    setEditedEntities([...extractedEntities]);
    setEditedRelations([...extractedRelations]);
  }, [extractedEntities, extractedRelations]);

  // yamlFileIdが変更されたら、データベースからエンティティとリレーションを読み込む
  useEffect(() => {
    const loadEntitiesAndRelations = async () => {
      if (!yamlFileId) {
        return;
      }

      try {
        console.log('📊 [MetadataExtractor] エンティティとリレーションを読み込み中...', yamlFileId);
        
        // エンティティとリレーションを並列で取得
        const [entities, relations] = await Promise.all([
          getEntitiesByYamlFileId(yamlFileId, organizationId),
          getRelationsByYamlFileId(yamlFileId),
        ]);

        console.log('✅ [MetadataExtractor] 読み込み完了:', {
          entities: entities.length,
          relations: relations.length,
        });

        // 取得したエンティティとリレーションを状態に設定
        setExtractedEntities(entities);
        setExtractedRelations(relations);
        setEditedEntities(entities);
        setEditedRelations(relations);
      } catch (error: any) {
        console.error('❌ [MetadataExtractor] エンティティとリレーションの読み込みに失敗:', error);
      }
    };

    loadEntitiesAndRelations();
  }, [yamlFileId]);
  
  // モデル選択関連
  const [modelType, setModelType] = useState<'gpt' | 'local'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('graphvizMetadataModelType');
      return (saved as 'gpt' | 'local') || 'gpt';
    }
    return 'gpt';
  });
  const [selectedModel, setSelectedModel] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('graphvizMetadataModel');
      return saved || 'gpt-4o-mini';
    }
    return 'gpt-4o-mini';
  });
  const [localModels, setLocalModels] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingLocalModels, setLoadingLocalModels] = useState(false);

  const availableModels = modelType === 'gpt' ? GPT_MODELS : localModels;

  // ローカルモデルを読み込む
  const loadLocalModels = useCallback(async () => {
    if (modelType !== 'local' || localModels.length > 0) return;
    
    setLoadingLocalModels(true);
    try {
      const models = await getAvailableOllamaModels();
      setLocalModels(models.map(m => ({ value: m, label: m })));
    } catch (error: any) {
      console.error('ローカルモデルの読み込みに失敗:', error);
    } finally {
      setLoadingLocalModels(false);
    }
  }, [modelType, localModels.length]);

  useEffect(() => {
    if (modelType === 'local') {
      loadLocalModels();
    }
  }, [modelType, loadLocalModels]);

  // メタデータ抽出
  const handleExtractMetadata = useCallback(async () => {
    if (!yamlName.trim() || !yamlContent.trim()) {
      alert('YAMLファイル名とコンテンツを入力してからAI生成を実行してください。');
      return;
    }

    if (!yamlFileId) {
      alert('メタデータを抽出するには、まずYAMLファイルを保存してください。');
      return;
    }

    if (!organizationId) {
      alert('メタデータを抽出するには、組織IDが必要です。現在、Graphvizページでは組織IDが取得できません。\n\n組織ページからGraphviz機能を使用するか、組織IDを手動で設定してください。');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setExtractedEntities([]);
    setExtractedRelations([]);

    try {
      const result = await extractAndSaveYamlMetadata(
        yamlFileId,
        yamlName,
        yamlContent,
        organizationId,
        selectedModel,
        dotContent
      );

      setExtractedEntities(result.entities);
      setExtractedRelations(result.relations);

      if (onMetadataExtracted) {
        onMetadataExtracted(result.entities, result.relations);
      }

      // 展開状態にする
      setIsExpanded(true);
    } catch (error: any) {
      console.error('❌ メタデータ抽出エラー:', error);
      setError(error.message || 'メタデータの抽出に失敗しました。');
      alert(`メタデータの抽出に失敗しました: ${error.message || '不明なエラー'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [yamlFileId, yamlName, yamlContent, dotContent, organizationId, selectedModel, onMetadataExtracted]);

  // メタデータとエンティティ・リレーションを保存（確認ダイアログ付き）
  const handleSaveMetadata = useCallback(async () => {
    if (!yamlFileId) {
      alert('ファイルが保存されていません。先にファイルを保存してください。');
      return;
    }

    // 既存のエンティティ・リレーションがある場合は確認
    const hasExistingEntities = extractedEntities.length > 0;
    const hasExistingRelations = extractedRelations.length > 0;
    
    if (hasExistingEntities || hasExistingRelations) {
      setShowSaveConfirm(true);
      return;
    }

    // 既存のデータがない場合は直接保存
    await performSave(false);
  }, [yamlFileId, extractedEntities.length, extractedRelations.length]);

  // 実際の保存処理
  const performSave = useCallback(async (replace: boolean) => {
    if (!yamlFileId) {
      return;
    }

    setIsSaving(true);
    try {
      // 置き換えモードの場合、既存のエンティティ・リレーションを削除
      if (replace) {
        // 既存のエンティティを削除
        for (const entity of extractedEntities) {
          try {
            await deleteEntity(entity.id);
          } catch (error: any) {
            console.error(`エンティティ ${entity.id} の削除に失敗:`, error);
          }
        }

        // 既存のリレーションを削除
        for (const relation of extractedRelations) {
          try {
            await deleteRelation(relation.id);
          } catch (error: any) {
            console.error(`リレーション ${relation.id} の削除に失敗:`, error);
          }
        }

        // 状態をクリア
        setExtractedEntities([]);
        setExtractedRelations([]);
        setEditedEntities([]);
        setEditedRelations([]);
      }

      // メタデータを保存
      await updateGraphvizYamlFile(yamlFileId, {
        semanticCategory: editedSemanticCategory.trim() || undefined,
        keywords: editedKeywords.length > 0 ? JSON.stringify(editedKeywords) : undefined,
        contentSummary: editedSummary.trim() || undefined,
      });

      // エンティティを更新（置き換えモードでない場合のみ）
      if (!replace) {
        for (const entity of editedEntities) {
          try {
            await updateEntity(entity.id, {
              name: entity.name,
              type: entity.type,
              description: entity.description,
              aliases: entity.aliases,
            });
          } catch (error: any) {
            console.error(`エンティティ ${entity.id} の更新に失敗:`, error);
          }
        }
      }

      // リレーションを更新（置き換えモードでない場合のみ）
      if (!replace) {
        for (const relation of editedRelations) {
          try {
            await updateRelation(relation.id, {
              relationType: relation.relationType,
              description: relation.description,
            });
          } catch (error: any) {
            console.error(`リレーション ${relation.id} の更新に失敗:`, error);
          }
        }
      }

      // 編集状態を解除
      setEditingSemanticCategory(false);
      setEditingKeywords(false);
      setEditingSummary(false);
      setEditingEntityId(null);
      setEditingRelationId(null);
      setShowSaveConfirm(false);

      // 親コンポーネントに通知
      if (onMetadataUpdated) {
        onMetadataUpdated();
      }

      // データを再読み込み
      if (yamlFileId) {
        const [entities, relations] = await Promise.all([
          getEntitiesByYamlFileId(yamlFileId, organizationId),
          getRelationsByYamlFileId(yamlFileId),
        ]);
        setExtractedEntities(entities);
        setExtractedRelations(relations);
        setEditedEntities(entities);
        setEditedRelations(relations);
      }

      alert(replace 
        ? '既存のエンティティ・リレーションを削除してメタデータを保存しました。' 
        : 'メタデータとエンティティ・リレーションを保存しました。');
    } catch (error: any) {
      console.error('保存に失敗:', error);
      alert(`保存に失敗しました: ${error.message || '不明なエラー'}`);
    } finally {
      setIsSaving(false);
    }
  }, [yamlFileId, organizationId, editedSemanticCategory, editedKeywords, editedSummary, editedEntities, editedRelations, extractedEntities, extractedRelations, onMetadataUpdated]);

  // エンティティとリレーションを一括削除（確認モーダルを表示）
  const handleDeleteAllClick = useCallback(() => {
    if (!yamlFileId) {
      return;
    }

    const entityCount = editedEntities.length;
    const relationCount = editedRelations.length;

    if (entityCount === 0 && relationCount === 0) {
      alert('削除するエンティティまたはリレーションがありません。');
      return;
    }

    setShowDeleteConfirm(true);
  }, [yamlFileId, editedEntities.length, editedRelations.length]);

  // エンティティとリレーションを一括削除（実際の削除処理）
  const handleDeleteAll = useCallback(async () => {
    if (!yamlFileId) {
      return;
    }

    const entityCount = editedEntities.length;
    const relationCount = editedRelations.length;

    setIsDeleting(true);
    setShowDeleteConfirm(false);
    
    try {
      // エンティティを削除
      for (const entity of editedEntities) {
        try {
          await deleteEntity(entity.id);
        } catch (error: any) {
          console.error(`エンティティ ${entity.id} の削除に失敗:`, error);
        }
      }

      // リレーションを削除
      for (const relation of editedRelations) {
        try {
          await deleteRelation(relation.id);
        } catch (error: any) {
          console.error(`リレーション ${relation.id} の削除に失敗:`, error);
        }
      }

      // 状態をクリア
      setExtractedEntities([]);
      setExtractedRelations([]);
      setEditedEntities([]);
      setEditedRelations([]);

      // 親コンポーネントに通知
      if (onMetadataUpdated) {
        onMetadataUpdated();
      }

      alert(`${entityCount}件のエンティティと${relationCount}件のリレーションを削除しました。`);
    } catch (error: any) {
      console.error('削除に失敗:', error);
      alert(`削除に失敗しました: ${error.message || '不明なエラー'}`);
    } finally {
      setIsDeleting(false);
    }
  }, [yamlFileId, editedEntities, editedRelations, onMetadataUpdated]);

  // キーワードを追加
  const handleAddKeyword = useCallback(() => {
    const newKeyword = prompt('新しいキーワードを入力してください:');
    if (newKeyword && newKeyword.trim()) {
      setEditedKeywords([...editedKeywords, newKeyword.trim()]);
    }
  }, [editedKeywords]);

  // キーワードを削除
  const handleRemoveKeyword = useCallback((index: number) => {
    setEditedKeywords(editedKeywords.filter((_, i) => i !== index));
  }, [editedKeywords]);

  // エンティティを更新（編集中の値変更）
  const handleUpdateEntityField = useCallback((entityId: string, field: keyof Entity, value: any) => {
    setEditedEntities(editedEntities.map(e => 
      e.id === entityId ? { ...e, [field]: value } : e
    ));
  }, [editedEntities]);

  // リレーションを更新（編集中の値変更）
  const handleUpdateRelationField = useCallback((relationId: string, field: keyof Relation, value: any) => {
    setEditedRelations(editedRelations.map(r => 
      r.id === relationId ? { ...r, [field]: value } : r
    ));
  }, [editedRelations]);

  return (
    <>
      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '480px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '20px',
              fontWeight: '700',
              color: '#111827',
            }}>
              削除の確認
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              color: '#6B7280',
              lineHeight: '1.6',
            }}>
              以下のデータを削除しますか？
            </p>
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
            }}>
              <div style={{
                fontSize: '14px',
                color: '#991B1B',
                marginBottom: '8px',
                fontWeight: 600,
              }}>
                エンティティ: {editedEntities.length}件
              </div>
              <div style={{
                fontSize: '14px',
                color: '#991B1B',
                marginBottom: '8px',
                fontWeight: 600,
              }}>
                リレーション: {editedRelations.length}件
              </div>
              <div style={{
                fontSize: '12px',
                color: '#DC2626',
                marginTop: '12px',
                fontWeight: 500,
              }}>
                ⚠️ この操作は取り消せません。
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6B7280',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={isDeleting}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isDeleting ? '#9CA3AF' : '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <FiTrash2 size={14} />
                {isDeleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 保存確認ダイアログ */}
      {showSaveConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setShowSaveConfirm(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '480px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '20px',
              fontWeight: '700',
              color: '#111827',
            }}>
              保存方法を選択
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              color: '#6B7280',
              lineHeight: '1.6',
            }}>
              既存のエンティティ（{extractedEntities.length}件）とリレーション（{extractedRelations.length}件）があります。
              <br />
              保存方法を選択してください。
            </p>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '24px',
            }}>
              <button
                onClick={() => performSave(false)}
                disabled={isSaving}
                style={{
                  padding: '12px 20px',
                  backgroundColor: isSaving ? '#9CA3AF' : '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>既存に追加（推奨）</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                  既存のエンティティ・リレーションを更新し、編集内容を保存します。
                </div>
              </button>
              <button
                onClick={() => performSave(true)}
                disabled={isSaving}
                style={{
                  padding: '12px 20px',
                  backgroundColor: isSaving ? '#9CA3AF' : '#F59E0B',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>既存を置き換え</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                  既存のエンティティ・リレーションをすべて削除してから、メタデータのみを保存します。
                </div>
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowSaveConfirm(false)}
                disabled={isSaving}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6B7280',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{
      border: '1px solid #E5E7EB',
      borderRadius: '8px',
      backgroundColor: '#FFFFFF',
      marginBottom: '16px',
    }}>
      {/* ヘッダー */}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          borderBottom: isExpanded ? '1px solid #E5E7EB' : 'none',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiZap size={16} color="#4262FF" />
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>
            AIメタデータ抽出
          </span>
          {((extractedEntities.length > 0 || extractedRelations.length > 0) || semanticCategory || keywords.length > 0 || contentSummary) && (
            <span style={{
              fontSize: '12px',
              color: '#666',
              marginLeft: '8px',
            }}>
              ({extractedEntities.length}件のエンティティ, {extractedRelations.length}件のリレーション
              {semanticCategory || keywords.length > 0 || contentSummary ? ', メタデータあり' : ''})
            </span>
          )}
        </div>
        {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
      </div>

      {/* コンテンツ */}
      {isExpanded && (
        <div style={{ padding: '16px' }}>
          {/* モデル選択 */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
          }}>
            <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>プロバイダー:</span>
              <select
                value={modelType}
                onChange={(e) => {
                  const newType = e.target.value as 'gpt' | 'local';
                  setModelType(newType);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('graphvizMetadataModelType', newType);
                  }
                  if (newType === 'local') {
                    loadLocalModels();
                  }
                }}
                disabled={isGenerating}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  backgroundColor: '#FFFFFF',
                  color: '#1a1a1a',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                }}
              >
                <option value="gpt">GPT</option>
                <option value="local">ローカル</option>
              </select>
            </label>
            <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>AIモデル:</span>
              <select
                value={selectedModel}
                onChange={(e) => {
                  const newModel = e.target.value;
                  setSelectedModel(newModel);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('graphvizMetadataModel', newModel);
                  }
                }}
                disabled={isGenerating || loadingLocalModels}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  backgroundColor: '#FFFFFF',
                  color: '#1a1a1a',
                  cursor: isGenerating || loadingLocalModels ? 'not-allowed' : 'pointer',
                  minWidth: '140px',
                }}
              >
                {loadingLocalModels ? (
                  <option>読み込み中...</option>
                ) : (
                  availableModels.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))
                )}
              </select>
            </label>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExtractMetadata();
              }}
              disabled={isGenerating || !yamlFileId || !yamlName.trim() || !yamlContent.trim()}
              style={{
                padding: '6px 12px',
                backgroundColor: isGenerating || !yamlFileId ? '#9CA3AF' : '#4262FF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                cursor: isGenerating || !yamlFileId ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title={!yamlFileId ? 'メタデータを抽出するには、まずYAMLファイルを保存してください。' : 'AIを使ってエンティティとリレーションを抽出します'}
            >
              <FiZap size={14} />
              {isGenerating ? '抽出中...' : 'メタデータ抽出'}
            </button>
          </div>

          {/* エラー表示 */}
          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '4px',
              color: '#991B1B',
              fontSize: '12px',
              marginBottom: '16px',
            }}>
              <strong>エラー:</strong> {error}
            </div>
          )}

          {/* AI生成メタデータ表示（セマンティックカテゴリ、キーワード、要約） */}
          {(editedSemanticCategory || editedKeywords.length > 0 || editedSummary) && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: '6px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0369A1',
                }}>
                  AI生成メタデータ
                </div>
                {yamlFileId && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {(editedEntities.length > 0 || editedRelations.length > 0) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAllClick();
                        }}
                        disabled={isDeleting}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: isDeleting ? '#9CA3AF' : '#EF4444',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: isDeleting ? 'not-allowed' : 'pointer',
                          fontSize: '11px',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <FiTrash2 size={12} />
                        {isDeleting ? '削除中...' : 'すべて削除'}
                      </button>
                    )}
                    {(editedSemanticCategory || editedKeywords.length > 0 || editedSummary || editedEntities.length > 0 || editedRelations.length > 0) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveMetadata();
                        }}
                        disabled={isSaving}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: isSaving ? '#9CA3AF' : '#10B981',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: isSaving ? 'not-allowed' : 'pointer',
                          fontSize: '11px',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <FiSave size={12} />
                        {isSaving ? '保存中...' : 'すべて保存'}
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* セマンティックカテゴリ */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#075985',
                  }}>
                    セマンティックカテゴリ
                  </div>
                  {!editingSemanticCategory && yamlFileId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSemanticCategory(true);
                      }}
                      style={{
                        padding: '2px 6px',
                        backgroundColor: 'transparent',
                        border: '1px solid #BAE6FD',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        color: '#0369A1',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <FiEdit2 size={10} />
                      編集
                    </button>
                  )}
                </div>
                {editingSemanticCategory ? (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={editedSemanticCategory}
                      onChange={(e) => setEditedSemanticCategory(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setEditingSemanticCategory(false);
                        } else if (e.key === 'Escape') {
                          setEditedSemanticCategory(semanticCategory || '');
                          setEditingSemanticCategory(false);
                        }
                      }}
                      onBlur={() => setEditingSemanticCategory(false)}
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '4px 12px',
                        fontSize: '13px',
                        border: '2px solid #4262FF',
                        borderRadius: '6px',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditedSemanticCategory(semanticCategory || '');
                        setEditingSemanticCategory(false);
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#EF4444',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '10px',
                      }}
                    >
                      <FiXCircle size={12} />
                    </button>
                  </div>
                ) : (
                  editedSemanticCategory && (
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      fontSize: '13px',
                      backgroundColor: '#E0F2FE',
                      color: '#0C4A6E',
                      borderRadius: '6px',
                      fontWeight: 500,
                    }}>
                      {editedSemanticCategory}
                    </div>
                  )
                )}
              </div>
              
              {/* キーワード */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#075985',
                  }}>
                    キーワード
                  </div>
                  {!editingKeywords && yamlFileId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingKeywords(true);
                      }}
                      style={{
                        padding: '2px 6px',
                        backgroundColor: 'transparent',
                        border: '1px solid #BAE6FD',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        color: '#0369A1',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <FiEdit2 size={10} />
                      編集
                    </button>
                  )}
                </div>
                {editingKeywords ? (
                  <div>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginBottom: '8px',
                    }}>
                      {editedKeywords.map((keyword, index) => (
                        <span
                          key={index}
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            backgroundColor: '#FFFFFF',
                            color: '#0369A1',
                            borderRadius: '4px',
                            border: '1px solid #BAE6FD',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {keyword}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveKeyword(index);
                            }}
                            style={{
                              padding: 0,
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#EF4444',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <FiX size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddKeyword();
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#4262FF',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        + 追加
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditedKeywords(keywords || []);
                          setEditingKeywords(false);
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#EF4444',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  editedKeywords.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                    }}>
                      {editedKeywords.map((keyword, index) => (
                        <span
                          key={index}
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            backgroundColor: '#FFFFFF',
                            color: '#0369A1',
                            borderRadius: '4px',
                            border: '1px solid #BAE6FD',
                          }}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )
                )}
              </div>
              
              {/* 要約 */}
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#075985',
                  }}>
                    要約
                  </div>
                  {!editingSummary && yamlFileId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSummary(true);
                      }}
                      style={{
                        padding: '2px 6px',
                        backgroundColor: 'transparent',
                        border: '1px solid #BAE6FD',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        color: '#0369A1',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <FiEdit2 size={10} />
                      編集
                    </button>
                  )}
                </div>
                {editingSummary ? (
                  <div>
                    <textarea
                      value={editedSummary}
                      onChange={(e) => setEditedSummary(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setEditedSummary(contentSummary || '');
                          setEditingSummary(false);
                        }
                      }}
                      onBlur={() => setEditingSummary(false)}
                      autoFocus
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        border: '2px solid #4262FF',
                        borderRadius: '6px',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        lineHeight: '1.6',
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditedSummary(contentSummary || '');
                        setEditingSummary(false);
                      }}
                      style={{
                        marginTop: '6px',
                        padding: '4px 8px',
                        backgroundColor: '#EF4444',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      キャンセル
                    </button>
                  </div>
                ) : (
                  editedSummary && (
                    <div style={{
                      fontSize: '13px',
                      color: '#0C4A6E',
                      lineHeight: '1.6',
                      padding: '8px 12px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                      border: '1px solid #BAE6FD',
                    }}>
                      {editedSummary}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* 抽出結果表示 */}
          {(editedEntities.length > 0 || editedRelations.length > 0) && (
            <div style={{ marginTop: '16px' }}>
              {/* エンティティ一覧 */}
              {editedEntities.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#1a1a1a',
                    marginBottom: '8px',
                  }}>
                    抽出されたエンティティ ({editedEntities.length}件)
                  </h4>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                  }}>
                    {editedEntities.map((entity) => (
                      <div
                        key={entity.id}
                        style={{
                          padding: '10px 12px',
                          backgroundColor: editingEntityId === entity.id ? '#F0F9FF' : '#F9FAFB',
                          border: editingEntityId === entity.id ? '2px solid #4262FF' : '1px solid #E5E7EB',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      >
                        {editingEntityId === entity.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '10px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                                名前
                              </label>
                              <input
                                type="text"
                                value={entity.name}
                                onChange={(e) => handleUpdateEntityField(entity.id, 'name', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '4px',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                                タイプ
                              </label>
                              <input
                                type="text"
                                value={entity.type}
                                onChange={(e) => handleUpdateEntityField(entity.id, 'type', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '4px',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                                説明
                              </label>
                              <textarea
                                value={entity.description || ''}
                                onChange={(e) => handleUpdateEntityField(entity.id, 'description', e.target.value)}
                                style={{
                                  width: '100%',
                                  minHeight: '60px',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '4px',
                                  resize: 'vertical',
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingEntityId(null);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#6B7280',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                }}
                              >
                                完了
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                              <div style={{ fontWeight: 500, color: '#1a1a1a' }}>
                                {entity.name}
                              </div>
                              {yamlFileId && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingEntityId(entity.id);
                                  }}
                                  style={{
                                    padding: '2px 6px',
                                    backgroundColor: 'transparent',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    color: '#6B7280',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <FiEdit2 size={10} />
                                  編集
                                </button>
                              )}
                            </div>
                            <div style={{ color: '#666', fontSize: '11px', marginBottom: '4px' }}>
                              タイプ: {entity.type}
                            </div>
                            {entity.description && (
                              <div style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>
                                {entity.description}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* リレーション一覧 */}
              {editedRelations.length > 0 && (
                <div>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#1a1a1a',
                    marginBottom: '8px',
                  }}>
                    抽出されたリレーション ({editedRelations.length}件)
                  </h4>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                  }}>
                    {editedRelations.map((relation) => (
                      <div
                        key={relation.id}
                        style={{
                          padding: '10px 12px',
                          backgroundColor: editingRelationId === relation.id ? '#F0F9FF' : '#F9FAFB',
                          border: editingRelationId === relation.id ? '2px solid #4262FF' : '1px solid #E5E7EB',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      >
                        {editingRelationId === relation.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '10px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                                リレーションタイプ
                              </label>
                              <input
                                type="text"
                                value={relation.relationType}
                                onChange={(e) => handleUpdateRelationField(relation.id, 'relationType', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '4px',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                                説明
                              </label>
                              <textarea
                                value={relation.description || ''}
                                onChange={(e) => handleUpdateRelationField(relation.id, 'description', e.target.value)}
                                style={{
                                  width: '100%',
                                  minHeight: '60px',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '4px',
                                  resize: 'vertical',
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingRelationId(null);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#6B7280',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                }}
                              >
                                完了
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                              <div style={{ fontWeight: 500, color: '#1a1a1a' }}>
                                {relation.relationType}
                              </div>
                              {yamlFileId && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingRelationId(relation.id);
                                  }}
                                  style={{
                                    padding: '2px 6px',
                                    backgroundColor: 'transparent',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    color: '#6B7280',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <FiEdit2 size={10} />
                                  編集
                                </button>
                              )}
                            </div>
                            <div style={{ color: '#666', fontSize: '11px' }}>
                              {relation.description || '説明なし'}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 未保存の場合のメッセージ */}
          {!yamlFileId && (
            <div style={{
              padding: '12px',
              backgroundColor: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: '4px',
              color: '#92400E',
              fontSize: '12px',
            }}>
              <strong>注意:</strong> メタデータを抽出するには、まず「保存・読み込み」ボタンからYAMLファイルを保存してください。
            </div>
          )}

          {/* organizationIdが未設定の場合のメッセージ */}
          {yamlFileId && !organizationId && (
            <div style={{
              padding: '12px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '4px',
              color: '#991B1B',
              fontSize: '12px',
            }}>
              <strong>エラー:</strong> メタデータを抽出するには、組織IDが必要です。現在、Graphvizページでは組織IDが取得できません。
              <br />
              <br />
              組織ページからGraphviz機能を使用するか、組織IDを手動で設定してください。
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}

