'use client';

import { useState, useEffect } from 'react';
import type { TopicSemanticCategory, TopicImportance } from '@/types/topicMetadata';
import type { Entity, EntityType } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { TabType, MeetingNoteData } from '../../types';
import { generateUniqueId } from '@/lib/orgApi';
import { generateTopicMetadata, extractEntities, extractRelations } from '@/lib/topicMetadataGeneration';
import { devLog } from '../../utils';
import { saveTopicFile, getTopicImagePaths, deleteTopicImage, generateDescriptionForExistingImage, updateTopicFileDescription } from '@/lib/topicImages';
import DeleteEntitiesConfirmModal from './DeleteEntitiesConfirmModal';
import DeleteRelationsConfirmModal from './DeleteRelationsConfirmModal';
import AddEntityModal from './AddEntityModal';
import AddRelationModal from './AddRelationModal';

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
  topicMetadataModelType: 'gpt' | 'local';
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
  setTopicMetadataModelType: (value: 'gpt' | 'local') => void;
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
  onSaveEntity,
  onSaveRelation,
}: TopicModalProps) {
  // ファイル管理の状態
  const [topicFiles, setTopicFiles] = useState<Array<{ path: string; description?: string; detailedDescription?: string; id?: string; fileName?: string; mimeType?: string; fileSize?: number }>>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileDescription, setFileDescription] = useState('');
  const [autoGenerateDescription, setAutoGenerateDescription] = useState(false);
  const [useLocalVLM, setUseLocalVLM] = useState(false);
  const [useDirectLFM2, setUseDirectLFM2] = useState(false);
  const [vlmModel, setVlmModel] = useState<string>('gpt-4o');
  const [availableVlmModels, setAvailableVlmModels] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingVlmModels, setLoadingVlmModels] = useState(false);
  const [generatingDescriptionFor, setGeneratingDescriptionFor] = useState<string | null>(null);
  const [showDeleteFileModal, setShowDeleteFileModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ path: string; fileName: string } | null>(null);
  const [editingFileDescription, setEditingFileDescription] = useState<{ path: string; description: string; detailedDescription: string } | null>(null);


  // トピックIDが確定したらファイルを読み込む
  useEffect(() => {
    if (isOpen && editingTopicId) {
      loadTopicFiles();
    } else {
      setTopicFiles([]);
    }
  }, [isOpen, editingTopicId]);

  // VLMモデルリストを読み込む
  useEffect(() => {
    const loadVlmModels = async () => {
      // GPT Vision対応モデル
      const gptVisionModels = [
        { value: 'gpt-4o', label: 'GPT-4o (Vision)' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Vision)' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Vision)' },
      ];

      // ローカルVLMモデルを取得
      if (useLocalVLM) {
        setLoadingVlmModels(true);
        try {
          const { getAvailableOllamaModels } = await import('@/lib/pageGeneration');
          const localModels = await getAvailableOllamaModels();
          const vlmModels = localModels
            .filter(model => {
              const nameLower = model.name.toLowerCase();
              return nameLower.includes('llava') || 
                     nameLower.includes('vision') ||
                     nameLower.includes('vlm') ||
                     nameLower.includes('bakllava') ||
                     nameLower.includes('moondream') ||
                     nameLower.includes('lfm2') ||
                     nameLower.includes('lfm');
            })
            .map(model => ({ value: model.name, label: model.name }));
          
          setAvailableVlmModels(vlmModels.length > 0 ? vlmModels : [{ value: 'llava:latest', label: 'llava:latest' }]);
        } catch (error) {
          console.error('ローカルVLMモデルの取得エラー:', error);
          setAvailableVlmModels([{ value: 'llava:latest', label: 'llava:latest' }]);
        } finally {
          setLoadingVlmModels(false);
        }
      } else {
        setAvailableVlmModels(gptVisionModels);
      }
    };

    loadVlmModels();
  }, [useLocalVLM]);

  // モデルタイプが変更されたら、デフォルトモデルを設定
  useEffect(() => {
    if (useLocalVLM) {
      // ローカルVLMの場合、最初のモデルを選択
      if (availableVlmModels.length > 0) {
        setVlmModel(availableVlmModels[0].value);
      } else {
        setVlmModel('llava:latest');
      }
    } else {
      // GPT Visionの場合
      setVlmModel('gpt-4o');
    }
  }, [useLocalVLM, availableVlmModels]);

  const loadTopicFiles = async () => {
    if (!editingTopicId || !meetingId) return;
    setIsLoadingFiles(true);
    try {
      const files = await getTopicImagePaths(editingTopicId, meetingId);
      console.log('読み込んだファイル:', files); // デバッグ用
      setTopicFiles(files);
    } catch (error) {
      console.error('ファイルの読み込みエラー:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingTopicId || !meetingId) return;

    setUploadingFile(true);
    try {
      // ファイルを子トピックとして扱う場合、現在編集中のトピックIDを親トピックIDとして設定
      // ファイル自体もトピックとして扱うため、新しいトピックIDを生成するか、ファイルIDをトピックIDとして使用
      // 現在は、ファイルを子トピックとして扱う機能は将来の拡張として、parentTopicIdにeditingTopicIdを設定
      const result = await saveTopicFile(
        organizationId,
        editingTopicId, // ファイルはこのトピックに紐づく
        meetingId,
        file,
        fileDescription.trim() || undefined,
        autoGenerateDescription,
        useLocalVLM,
        vlmModel,
        useDirectLFM2,
        editingTopicId // 親トピックIDとして現在編集中のトピックIDを設定（ファイルを子トピックとして扱う）
      );

      if (result.success) {
        // ファイルリストを再読み込み
        await loadTopicFiles();
        
        // 自動生成された説明がある場合は表示（アラートのみ、フォームには残さない）
        if (result.generatedDescription) {
          const detailMsg = result.generatedDetailedDescription 
            ? `\n\n詳細解説:\n${result.generatedDetailedDescription}`
            : '';
          alert(`ファイルを保存しました。\n\n自動生成された説明（RAG検索用）:\n${result.generatedDescription}${detailMsg}`);
        } else {
          alert('ファイルを保存しました。');
        }
        
        // 説明文入力フォームをクリア（次のアップロードに影響しないように）
        setFileDescription('');
        
        // ファイル入力のリセット
        event.target.value = '';
      } else {
        alert(`ファイルの保存に失敗しました: ${result.error}`);
      }
    } catch (error: any) {
      console.error('ファイルアップロードエラー:', error);
      alert(`ファイルのアップロードに失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteFileClick = (filePath: string) => {
    const fileName = filePath.split('/').pop() || filePath;
    setFileToDelete({ path: filePath, fileName });
    setShowDeleteFileModal(true);
  };

  const handleConfirmDeleteFile = async () => {
    if (!fileToDelete || !editingTopicId || !meetingId) return;

    try {
      await deleteTopicImage(organizationId, editingTopicId, meetingId, fileToDelete.path);
      await loadTopicFiles();
      setShowDeleteFileModal(false);
      setFileToDelete(null);
      alert('ファイルを削除しました。');
    } catch (error: any) {
      console.error('ファイル削除エラー:', error);
      alert(`ファイルの削除に失敗しました: ${error?.message || '不明なエラー'}`);
    }
  };

  const handleCancelDeleteFile = () => {
    setShowDeleteFileModal(false);
    setFileToDelete(null);
  };

  const handleGenerateDescription = async (filePath: string) => {
    if (!editingTopicId || !meetingId) return;

    setGeneratingDescriptionFor(filePath);
    try {
      const result = await generateDescriptionForExistingImage(
        organizationId,
        editingTopicId,
        meetingId,
        filePath,
        useLocalVLM,
        vlmModel,
        useDirectLFM2
      );

      if (result.success && result.description) {
        // 詳細解説も取得して表示
        const files = await getTopicImagePaths(editingTopicId, meetingId);
        const fileInfo = files.find(f => f.path === filePath);
        const detailMsg = fileInfo?.detailedDescription 
          ? `\n\n詳細解説:\n${fileInfo.detailedDescription}`
          : '';
        alert(`説明を生成しました:\n\n説明文（RAG検索用）:\n${result.description}${detailMsg}`);
        await loadTopicFiles(); // ファイルリストを再読み込み
      } else {
        alert(`説明の生成に失敗しました: ${result.error || '不明なエラー'}`);
      }
    } catch (error: any) {
      console.error('説明生成エラー:', error);
      alert(`説明の生成中にエラーが発生しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setGeneratingDescriptionFor(null);
    }
  };

  const handleOpenFile = async (filePath: string) => {
    try {
      // Tauri環境でファイルを開く
      const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
      if (isTauri) {
        // Rustコマンドでファイルを開く
        const { callTauriCommand } = await import('@/lib/localFirebase');
        const result = await callTauriCommand('open_file', { filePath });
        
        if (result && !result.success) {
          throw new Error(result.error || 'ファイルを開けませんでした');
        }
      } else {
        alert('Tauri環境でのみファイルを開くことができます。');
      }
    } catch (error: any) {
      console.error('ファイルを開くエラー:', error);
      alert(`ファイルを開けませんでした: ${error?.message || '不明なエラー'}`);
    }
  };

  if (!isOpen || !editingTopicItemId) {
    return null;
  }

  const currentItem = monthContents[activeTab]?.items?.find(i => i.id === editingTopicItemId);
  const displayTopicId = editingTopicId 
    ? `${editingTopicItemId}-topic-${editingTopicId}`
    : `${editingTopicItemId}-topic-${generateUniqueId()}`;

  const handleGenerateMetadata = async () => {
    if (!topicTitle.trim() || !topicContent.trim()) {
      alert('タイトルと内容を入力してからAI生成を実行してください。');
      return;
    }
    
    setIsGeneratingMetadata(true);
    try {
      const metadata = await generateTopicMetadata(topicTitle, topicContent, topicMetadataSelectedModel);
      
      let finalMetadata = metadata;
      if (topicMetadataMode === 'merge') {
        finalMetadata = {
          semanticCategory: topicSemanticCategory || metadata.semanticCategory,
          importance: topicImportance || metadata.importance,
          keywords: topicKeywords && topicKeywords.trim() ? topicKeywords.split(',').map(k => k.trim()) : metadata.keywords,
          summary: topicSummary || metadata.summary,
        };
      }
      
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
      
      // 生成されたメタデータを一時的に保持
      setPendingMetadata(finalMetadata);
      setPendingEntities(entitiesWithOrgId);
      setPendingRelations(relationsWithIds);
      devLog('✅ AI生成完了:', finalMetadata);
    } catch (error: any) {
      console.error('❌ AI生成エラー:', error);
      alert(`メタデータの生成に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setIsGeneratingMetadata(false);
    }
  };


  return (
    <>
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
              <div style={{ marginBottom: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
                <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600, marginBottom: '12px' }}>
                  📎 ファイル
                </div>
                
                {/* ファイルアップロード */}
                <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                      ファイルの説明文（RAG検索用）
                    </label>
                    <input
                      type="text"
                      value={fileDescription}
                      onChange={(e) => setFileDescription(e.target.value)}
                      placeholder="例: プロジェクト進捗のグラフ、会議資料のPDF、Excelデータなど"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  
                  {/* 自動生成オプション */}
                  <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={autoGenerateDescription}
                        onChange={(e) => setAutoGenerateDescription(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>画像の場合、VLMで説明を自動生成</span>
                    </label>
                    {autoGenerateDescription && (
                      <>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6B7280', cursor: 'pointer', marginLeft: '24px' }}>
                          <input
                            type="checkbox"
                            checked={useLocalVLM}
                            onChange={(e) => setUseLocalVLM(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span>ローカルVLM（Liquid AI）を使用（未チェック時はGPT-4 Visionを使用）</span>
                        </label>
                        {loadingVlmModels ? (
                          <div style={{ marginLeft: '24px', fontSize: '12px', color: '#6B7280' }}>
                            🔄 モデルを読み込み中...
                          </div>
                        ) : availableVlmModels.length > 0 && (
                          <div style={{ marginLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '12px', color: '#6B7280' }}>
                                VLMモデル:
                              </label>
                              <select
                                value={vlmModel}
                                onChange={(e) => setVlmModel(e.target.value)}
                                style={{
                                  padding: '6px 10px',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  backgroundColor: '#FFFFFF',
                                  color: '#374151',
                                  cursor: 'pointer',
                                  minWidth: '200px',
                                }}
                              >
                                {availableVlmModels.map((model) => (
                                  <option key={model.value} value={model.value}>
                                    {model.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {(vlmModel.includes('lfm2') || vlmModel.includes('LFM2')) && (
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6B7280', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={useDirectLFM2}
                                  onChange={(e) => setUseDirectLFM2(e.target.checked)}
                                  style={{ cursor: 'pointer' }}
                                />
                                <span>Ollama経由ではなく直接使用（Pythonスクリプト経由）</span>
                              </label>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  <label
                    style={{
                      display: 'inline-block',
                      padding: '8px 16px',
                      backgroundColor: uploadingFile ? '#94A3B8' : '#3B82F6',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: uploadingFile ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    {uploadingFile ? 'アップロード中...' : '📎 ファイルを選択'}
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                
                {/* アップロード済みファイルの表示 */}
                {isLoadingFiles ? (
                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontSize: '14px', color: '#6B7280' }}>
                    読み込み中...
                  </div>
                ) : topicFiles.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {topicFiles.map((file, index) => {
                      // ファイル名を抽出
                      const fileName = file.path.split('/').pop() || file.path;
                      // ファイルタイプに応じたアイコンを決定
                      const getFileIcon = (name: string) => {
                        const ext = name.split('.').pop()?.toLowerCase() || '';
                        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return '📷';
                        if (['pdf'].includes(ext)) return '📄';
                        if (['xlsx', 'xls'].includes(ext)) return '📊';
                        if (['docx', 'doc'].includes(ext)) return '📝';
                        if (['txt', 'md'].includes(ext)) return '📃';
                        return '📎';
                      };
                      return (
                        <div
                          key={index}
                          style={{
                            position: 'relative',
                            padding: '12px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ marginBottom: '4px' }}>
                                <div
                                  onClick={() => handleOpenFile(file.path)}
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#0066CC',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    display: 'inline-block',
                                    marginBottom: '2px',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#0051a8';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = '#0066CC';
                                  }}
                                >
                                  {getFileIcon(fileName)} {file.fileName || fileName}
                                </div>
                                {(file.mimeType || file.fileSize) && (
                                  <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>
                                    {file.mimeType && <span>{file.mimeType}</span>}
                                    {file.mimeType && file.fileSize && <span> • </span>}
                                    {file.fileSize && <span>{(file.fileSize / 1024).toFixed(1)} KB</span>}
                                  </div>
                                )}
                                {file.id && (
                                  <div style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: 'monospace', marginTop: '2px' }}>
                                    ID: {file.id}
                                  </div>
                                )}
                              </div>
                              {(file.description || file.detailedDescription || editingFileDescription?.path === file.path) && (
                                <div style={{ marginBottom: '8px' }}>
                                  {editingFileDescription?.path === file.path ? (
                                    // 編集モード
                                    <>
                                      <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '4px' }}>
                                        📝 説明文（RAG検索用）:
                                      </div>
                                      <textarea
                                        value={editingFileDescription.description}
                                        onChange={(e) => setEditingFileDescription({
                                          ...editingFileDescription,
                                          description: e.target.value,
                                        })}
                                        style={{
                                          width: '100%',
                                          fontSize: '12px',
                                          padding: '6px',
                                          border: '1px solid #D1D5DB',
                                          borderRadius: '4px',
                                          marginBottom: '12px',
                                          resize: 'vertical',
                                          minHeight: '60px',
                                        }}
                                        placeholder="RAG検索用の簡潔な説明文を入力"
                                      />
                                      <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '4px' }}>
                                        📖 詳細解説:
                                      </div>
                                      <textarea
                                        value={editingFileDescription.detailedDescription}
                                        onChange={(e) => setEditingFileDescription({
                                          ...editingFileDescription,
                                          detailedDescription: e.target.value,
                                        })}
                                        style={{
                                          width: '100%',
                                          fontSize: '12px',
                                          padding: '6px',
                                          border: '1px solid #D1D5DB',
                                          borderRadius: '4px',
                                          marginBottom: '8px',
                                          resize: 'vertical',
                                          minHeight: '120px',
                                        }}
                                        placeholder="詳細な解説を入力"
                                      />
                                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <button
                                          onClick={async () => {
                                            if (!editingTopicId || !meetingId) return;
                                            try {
                                              await updateTopicFileDescription(
                                                organizationId,
                                                editingTopicId,
                                                meetingId,
                                                file.path,
                                                editingFileDescription.description,
                                                editingFileDescription.detailedDescription
                                              );
                                              await loadTopicFiles();
                                              setEditingFileDescription(null);
                                              alert('説明文を更新しました。');
                                            } catch (error: any) {
                                              console.error('説明文の更新エラー:', error);
                                              alert(`説明文の更新に失敗しました: ${error?.message || '不明なエラー'}`);
                                            }
                                          }}
                                          style={{
                                            padding: '6px 12px',
                                            backgroundColor: '#3B82F6',
                                            color: '#FFFFFF',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                          }}
                                        >
                                          保存
                                        </button>
                                        <button
                                          onClick={() => setEditingFileDescription(null)}
                                          style={{
                                            padding: '6px 12px',
                                            backgroundColor: '#6B7280',
                                            color: '#FFFFFF',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                          }}
                                        >
                                          キャンセル
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    // 表示モード
                                    <>
                                      {file.description && (
                                        <>
                                          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '4px' }}>
                                            📝 説明文（RAG検索用）:
                                          </div>
                                          <div style={{ fontSize: '12px', color: '#6B7280', wordBreak: 'break-word', marginBottom: file.detailedDescription ? '12px' : '0' }}>
                                            {file.description}
                                          </div>
                                        </>
                                      )}
                                      {file.detailedDescription && (
                                        <>
                                          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginTop: file.description ? '8px' : '0', marginBottom: '4px' }}>
                                            📖 詳細解説:
                                          </div>
                                          <div style={{ fontSize: '12px', color: '#4B5563', wordBreak: 'break-word', lineHeight: '1.6', padding: '8px', backgroundColor: '#F9FAFB', borderRadius: '4px', border: '1px solid #E5E7EB' }}>
                                            {file.detailedDescription}
                                          </div>
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                              <div style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                {file.path}
                              </div>
                              {file.id && (
                                <div style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: 'monospace', marginTop: '4px' }}>
                                  ID: {file.id}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                              {/* 編集モードでない場合にボタンを表示 */}
                              {editingFileDescription?.path !== file.path && (
                                <>
                                  {/* 説明文の編集ボタン（削除ボタンの左側） */}
                                  <button
                                    onClick={() => setEditingFileDescription({
                                      path: file.path,
                                      description: file.description || '',
                                      detailedDescription: file.detailedDescription || '',
                                    })}
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#F3F4F6',
                                      color: '#374151',
                                      border: '1px solid #D1D5DB',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      cursor: 'pointer',
                                      fontWeight: 500,
                                    }}
                                  >
                                    {file.description || file.detailedDescription ? '編集' : '説明追加'}
                                  </button>
                                  {/* 画像ファイルの場合のみ説明生成ボタンを表示 */}
                                  {/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName) && (
                                    <button
                                      onClick={() => handleGenerateDescription(file.path)}
                                      disabled={generatingDescriptionFor === file.path}
                                      style={{
                                        padding: '6px 12px',
                                        backgroundColor: generatingDescriptionFor === file.path ? '#94A3B8' : '#10B981',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        cursor: generatingDescriptionFor === file.path ? 'not-allowed' : 'pointer',
                                        fontWeight: 500,
                                      }}
                                    >
                                      {generatingDescriptionFor === file.path ? '生成中...' : '説明生成'}
                                    </button>
                                  )}
                                  {/* 削除ボタン */}
                                  <button
                                    onClick={() => handleDeleteFileClick(file.path)}
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#EF4444',
                                      color: '#FFFFFF',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      cursor: 'pointer',
                                      fontWeight: 500,
                                    }}
                                  >
                                    削除
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontSize: '14px', color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center' }}>
                    ファイルがありません
                  </div>
                )}
              </div>
            )}
            
            {/* メタデータセクション */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600, marginBottom: '12px' }}>
                メタデータ
              </div>
              
              <div>
                {/* モデル選択とモード選択 */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>タイプ:</span>
                      <select
                        value={topicMetadataModelType}
                        onChange={(e) => {
                          const newType = e.target.value as 'gpt' | 'local';
                          setTopicMetadataModelType(newType);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('topicMetadataGenerationModelType', newType);
                          }
                          if (newType === 'gpt') {
                            setTopicMetadataSelectedModel('gpt-5-mini');
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('topicMetadataGenerationModel', 'gpt-5-mini');
                            }
                          }
                        }}
                        disabled={isGeneratingMetadata}
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.875em',
                          border: '1px solid #D1D5DB',
                          borderRadius: '4px',
                          backgroundColor: '#FFFFFF',
                          color: '#1a1a1a',
                          cursor: isGeneratingMetadata ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <option value="gpt">GPT</option>
                        <option value="local">ローカル</option>
                      </select>
                    </label>
                    <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>AIモデル:</span>
                      <select
                        value={topicMetadataSelectedModel}
                        onChange={(e) => {
                          const newModel = e.target.value;
                          setTopicMetadataSelectedModel(newModel);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('topicMetadataGenerationModel', newModel);
                          }
                        }}
                        disabled={isGeneratingMetadata || loadingTopicMetadataLocalModels}
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.875em',
                          border: '1px solid #D1D5DB',
                          borderRadius: '4px',
                          backgroundColor: '#FFFFFF',
                          color: '#1a1a1a',
                          cursor: isGeneratingMetadata || loadingTopicMetadataLocalModels ? 'not-allowed' : 'pointer',
                          minWidth: '140px',
                        }}
                      >
                        {loadingTopicMetadataLocalModels ? (
                          <option>読み込み中...</option>
                        ) : topicMetadataModelType === 'gpt' ? (
                          <>
                            <option value="gpt-5.1">gpt-5.1</option>
                            <option value="gpt-5">gpt-5</option>
                            <option value="gpt-5-mini">gpt-5-mini</option>
                            <option value="gpt-5-nano">gpt-5-nano</option>
                            <option value="gpt-4.1">gpt-4.1</option>
                            <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                            <option value="gpt-4.1-nano">gpt-4.1-nano</option>
                            <option value="gpt-4o">gpt-4o</option>
                            <option value="gpt-4o-mini">gpt-4o-mini</option>
                          </>
                        ) : topicMetadataLocalModels.length === 0 ? (
                          <option>モデルが見つかりません</option>
                        ) : (
                          topicMetadataLocalModels.map((model) => (
                            <option key={model.value} value={model.value}>
                              {model.label}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                    <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>モード:</span>
                      <select
                        value={topicMetadataMode}
                        onChange={(e) => {
                          const newMode = e.target.value as 'overwrite' | 'merge';
                          setTopicMetadataMode(newMode);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('topicMetadataGenerationMode', newMode);
                          }
                        }}
                        disabled={isGeneratingMetadata}
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.875em',
                          border: '1px solid #D1D5DB',
                          borderRadius: '4px',
                          backgroundColor: '#FFFFFF',
                          color: '#1a1a1a',
                          cursor: isGeneratingMetadata ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <option value="overwrite">上書き</option>
                        <option value="merge">追加</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateMetadata}
                      disabled={isGeneratingMetadata || !topicTitle.trim() || !topicContent.trim()}
                      style={{
                        padding: '8px 16px',
                        background: isGeneratingMetadata 
                          ? '#94A3B8' 
                          : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: isGeneratingMetadata ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                        boxShadow: isGeneratingMetadata 
                          ? 'none' 
                          : '0 2px 8px rgba(16, 185, 129, 0.3)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isGeneratingMetadata) {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isGeneratingMetadata) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
                        }
                      }}
                    >
                      {isGeneratingMetadata ? (
                        <>
                          <span style={{ 
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            border: '2px solid #FFFFFF',
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                          }} />
                          AI生成中...
                        </>
                      ) : (
                        <>
                          <span>🤖</span>
                          AI生成
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* 生成されたメタデータのプレビューと適用/キャンセルボタン */}
                  {pendingMetadata && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #86EFAC',
                      borderRadius: '8px',
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#166534', marginBottom: '8px' }}>
                        AI生成結果（プレビュー）
                      </div>
                      <div style={{ fontSize: '12px', color: '#166534', marginBottom: '12px', lineHeight: '1.6' }}>
                        {pendingMetadata.semanticCategory && (
                          <div>セマンティックカテゴリ: {pendingMetadata.semanticCategory}</div>
                        )}
                        {pendingMetadata.importance && (
                          <div>重要度: {pendingMetadata.importance}</div>
                        )}
                        {pendingMetadata.keywords && pendingMetadata.keywords.length > 0 && (
                          <div>キーワード: {pendingMetadata.keywords.join(', ')}</div>
                        )}
                        {pendingMetadata.summary && (
                          <div>要約: {pendingMetadata.summary}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            // 生成されたメタデータを適用
                            if (pendingMetadata.semanticCategory) {
                              setTopicSemanticCategory(pendingMetadata.semanticCategory);
                            }
                            if (pendingMetadata.importance) {
                              setTopicImportance(pendingMetadata.importance);
                            }
                            if (pendingMetadata.keywords && pendingMetadata.keywords.length > 0) {
                              setTopicKeywords(pendingMetadata.keywords.join(', '));
                            }
                            if (pendingMetadata.summary) {
                              setTopicSummary(pendingMetadata.summary);
                            }
                            setPendingMetadata(null);
                          }}
                          style={{
                            padding: '6px 12px',
                            background: '#10B981',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          適用する
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingMetadata(null);
                          }}
                          style={{
                            padding: '6px 12px',
                            background: '#F3F4F6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* セマンティックカテゴリ */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontWeight: '600',
                    color: '#475569',
                    fontSize: '14px',
                  }}>
                    セマンティックカテゴリ
                  </label>
                  <select
                    value={topicSemanticCategory}
                    onChange={(e) => setTopicSemanticCategory(e.target.value as TopicSemanticCategory | '')}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '2px solid #E2E8F0',
                      borderRadius: '10px',
                      fontSize: '14px',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0066CC';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 102, 204, 0.1)';
                      e.currentTarget.style.backgroundColor = '#FAFBFC';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }}
                  >
                    <option value="">選択してください</option>
                    <option value="action-item">アクションアイテム</option>
                    <option value="decision">決定事項</option>
                    <option value="discussion">議論・討議</option>
                    <option value="issue">課題・問題</option>
                    <option value="risk">リスク</option>
                    <option value="opportunity">機会</option>
                    <option value="question">質問・疑問</option>
                    <option value="summary">サマリー</option>
                    <option value="follow-up">フォローアップ</option>
                    <option value="reference">参照情報</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                
                {/* 重要度 */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontWeight: '600',
                    color: '#475569',
                    fontSize: '14px',
                  }}>
                    重要度
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '10px',
                  }}>
                    {(['high', 'medium', 'low'] as TopicImportance[]).map((importance) => (
                      <button
                        key={importance}
                        type="button"
                        onClick={() => setTopicImportance(topicImportance === importance ? '' : importance)}
                        style={{
                          padding: '12px 16px',
                          border: `2px solid ${topicImportance === importance ? '#0066CC' : '#E2E8F0'}`,
                          borderRadius: '10px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          backgroundColor: topicImportance === importance 
                            ? importance === 'high' ? '#FEF2F2' :
                              importance === 'medium' ? '#FEF3C7' : '#F0FDF4'
                            : '#FFFFFF',
                          color: topicImportance === importance
                            ? importance === 'high' ? '#DC2626' :
                              importance === 'medium' ? '#D97706' : '#16A34A'
                            : '#64748B',
                        }}
                        onMouseEnter={(e) => {
                          if (topicImportance !== importance) {
                            e.currentTarget.style.borderColor = '#CBD5E1';
                            e.currentTarget.style.backgroundColor = '#F8FAFC';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (topicImportance !== importance) {
                            e.currentTarget.style.borderColor = '#E2E8F0';
                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                          }
                        }}
                      >
                        {importance === 'high' ? '🔴 高' :
                         importance === 'medium' ? '🟡 中' : '🟢 低'}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* キーワード */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontWeight: '600',
                    color: '#475569',
                    fontSize: '14px',
                  }}>
                    キーワード
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 'normal',
                      color: '#64748B',
                      marginLeft: '6px',
                    }}>
                      (カンマ区切り)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={topicKeywords}
                    onChange={(e) => setTopicKeywords(e.target.value)}
                    placeholder="例: プロジェクト, 進捗, 報告"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '2px solid #E2E8F0',
                      borderRadius: '10px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease',
                      backgroundColor: '#FFFFFF',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0066CC';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 102, 204, 0.1)';
                      e.currentTarget.style.backgroundColor = '#FAFBFC';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }}
                  />
                </div>
                
                {/* 要約 */}
                <div style={{ marginBottom: '0' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontWeight: '600',
                    color: '#475569',
                    fontSize: '14px',
                  }}>
                    要約
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 'normal',
                      color: '#64748B',
                      marginLeft: '6px',
                    }}>
                      (AI生成または手動入力)
                    </span>
                  </label>
                  <textarea
                    value={topicSummary}
                    onChange={(e) => setTopicSummary(e.target.value)}
                    placeholder="トピックの要約を入力してください"
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '12px 14px',
                      border: '2px solid #E2E8F0',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      lineHeight: '1.6',
                      transition: 'all 0.2s ease',
                      backgroundColor: '#FFFFFF',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0066CC';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 102, 204, 0.1)';
                      e.currentTarget.style.backgroundColor = '#FAFBFC';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* ナレッジグラフ: エンティティとリレーション */}
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
            </div>
            
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
            </div>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      {onDeleteEntities && (
        <DeleteEntitiesConfirmModal
          showModal={showDeleteEntitiesModal}
          onClose={() => setShowDeleteEntitiesModal(false)}
          onConfirm={onDeleteEntities}
          pendingEntities={pendingEntities}
          topicEntities={topicEntities}
          relationTypeLabels={relationTypeLabels}
        />
      )}
      {onDeleteRelations && (
        <DeleteRelationsConfirmModal
          showModal={showDeleteRelationsModal}
          onClose={() => setShowDeleteRelationsModal(false)}
          onConfirm={onDeleteRelations}
          pendingRelations={pendingRelations}
          topicRelations={topicRelations}
          pendingEntities={pendingEntities}
          topicEntities={topicEntities}
          relationTypeLabels={relationTypeLabels}
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
          pendingEntities={pendingEntities}
          topicEntities={topicEntities}
          onSave={onSaveRelation}
          onCancel={() => {
            setShowAddRelationModal(false);
            setEditingRelation(null);
          }}
        />
      )}
      
      {/* ファイル削除確認モーダル */}
      {showDeleteFileModal && fileToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
          }}
          onClick={handleCancelDeleteFile}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px' }}>
              ファイルを削除しますか？
            </h3>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                ファイル名:
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a', marginBottom: '12px' }}>
                {fileToDelete.fileName}
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {fileToDelete.path}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={handleCancelDeleteFile}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirmDeleteFile}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
