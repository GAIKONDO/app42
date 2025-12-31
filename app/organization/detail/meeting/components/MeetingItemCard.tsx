'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TabType, MonthContent, MeetingNoteData } from '../types';
import type { Topic, TopicImportance } from '@/types/topicMetadata';
import { EditIcon, DeleteIcon } from './Icons';
import { markdownComponents } from '../utils';
import { generateUniqueId } from '@/lib/orgApi';
import TopicCard from './TopicCard';
import { findSimilarTopics, saveTopicEmbeddingAsync } from '@/lib/topicEmbeddings';
import { generateTopicMetadata, extractEntities, extractRelations } from '@/lib/topicMetadataGeneration';
import { createEntity } from '@/lib/entityApi';
import { createRelation } from '@/lib/relationApi';
import { GPT_MODELS } from '../constants';
import { GPT_MODELS as GPT_MODELS_FULL, GEMINI_MODELS, CLAUDE_MODELS } from '@/components/AIAssistantPanel/constants';
import { getAvailableOllamaModels } from '@/lib/pageGeneration';
import type { ModelType } from '@/components/AIAssistantPanel/types';

interface MeetingItemCardProps {
  item: {
    id: string;
    title: string;
    content: string;
    location?: string;
    date?: string;
    author?: string;
    topics?: Array<Topic>;
  };
  activeTab: TabType;
  editingMonth: TabType | null;
  editingSection: string | null;
  editingItemTitle: string;
  editingContent: string;
  editingItemDate: string;
  editingItemTime: string;
  expandedTopics: Set<string>;
  onSetEditingItemTitle: (title: string) => void;
  onSetEditingContent: (content: string) => void;
  onSetEditingItemDate: (date: string) => void;
  onSetEditingItemTime: (time: string) => void;
  onSetEditingMonth: (month: TabType | null) => void;
  onSetEditingSection: (section: string | null) => void;
  onSetExpandedTopics: (topics: Set<string>) => void;
  onStartEditItem: (tab: TabType, itemId: string) => void;
  onStartEditItemTitle: (tab: TabType, itemId: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDeleteItem: (tab: TabType, itemId: string) => void;
  monthContents: MeetingNoteData;
  onSetMonthContents: (contents: MeetingNoteData) => void;
  onSetHasUnsavedChanges: (hasChanges: boolean) => void;
  organizationId: string;
  meetingId: string;
  onSetEditingTopicItemId: (itemId: string | null) => void;
  onSetEditingTopicId: (topicId: string | null) => void;
  editingTopicId: string | null;
  onSetTopicTitle: (title: string) => void;
  onSetTopicContent: (content: string) => void;
  onSetTopicSemanticCategory: (category: string) => void;
  onSetTopicKeywords: (keywords: string) => void;
  onSetTopicSummary: (summary: string) => void;
  onSetTopicImportance: (importance: TopicImportance | '') => void;
  onSetShowTopicModal: (show: boolean) => void;
  onDeleteTopic: (itemId: string, topicId: string) => void;
}

// 議事録アイテムカードの範囲を特定するためのヘルパー関数
export function getMeetingItemCardRange() {
  // この関数は使用されませんが、コードの範囲を明確にするために残します
  return { start: 1324, end: 3022 };
}

export default function MeetingItemCard({
  item,
  activeTab,
  editingMonth,
  editingSection,
  editingItemTitle,
  editingContent,
  editingItemDate,
  editingItemTime,
  expandedTopics,
  onSetEditingItemTitle,
  onSetEditingContent,
  onSetEditingItemDate,
  onSetEditingItemTime,
  onSetEditingMonth,
  onSetEditingSection,
  onSetExpandedTopics,
  onStartEditItem,
  onStartEditItemTitle,
  onSaveEdit,
  onCancelEdit,
  onDeleteItem,
  monthContents,
  onSetMonthContents,
  onSetHasUnsavedChanges,
  organizationId,
  meetingId,
  onSetEditingTopicItemId,
  onSetEditingTopicId,
  editingTopicId,
  onSetTopicTitle,
  onSetTopicContent,
  onSetTopicSemanticCategory,
  onSetTopicKeywords,
  onSetTopicSummary,
  onSetTopicImportance,
  onSetShowTopicModal,
  onDeleteTopic,
}: MeetingItemCardProps) {
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [bulkMetadataProgress, setBulkMetadataProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkMetadataModelType, setBulkMetadataModelType] = useState<ModelType>('gpt');
  const [bulkMetadataModel, setBulkMetadataModel] = useState<string>('gpt-5-mini');
  const [bulkMetadataLocalModels, setBulkMetadataLocalModels] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingBulkMetadataLocalModels, setLoadingBulkMetadataLocalModels] = useState(false);

  // 利用可能なモデルリストを取得
  const getAvailableModels = () => {
    switch (bulkMetadataModelType) {
      case 'gpt':
        return GPT_MODELS_FULL.map(m => ({ value: m.value, label: m.label }));
      case 'gemini':
        return GEMINI_MODELS.map(m => ({ value: m.value, label: m.label }));
      case 'claude':
        return CLAUDE_MODELS.map(m => ({ value: m.value, label: m.label }));
      case 'local':
        return bulkMetadataLocalModels;
      default:
        return GPT_MODELS_FULL.map(m => ({ value: m.value, label: m.label }));
    }
  };

  // ローカルモデルを読み込む
  const loadLocalModels = useCallback(async () => {
    if (bulkMetadataModelType === 'local' && bulkMetadataLocalModels.length === 0 && !loadingBulkMetadataLocalModels) {
      setLoadingBulkMetadataLocalModels(true);
      try {
        const models = await getAvailableOllamaModels();
        const formattedModels = models.map(model => ({
          value: model.name,
          label: model.name,
        }));
        setBulkMetadataLocalModels(formattedModels);
        if (formattedModels.length > 0 && !formattedModels.some(m => m.value === bulkMetadataModel)) {
          setBulkMetadataModel(formattedModels[0].value);
        }
      } catch (error) {
        console.error('ローカルモデルの読み込みエラー:', error);
      } finally {
        setLoadingBulkMetadataLocalModels(false);
      }
    }
  }, [bulkMetadataModelType, bulkMetadataLocalModels.length, loadingBulkMetadataLocalModels, bulkMetadataModel]);

  // モデルタイプが変更されたら、デフォルトモデルを設定（ただし、現在のモデルが新しいタイプに有効な場合は変更しない）
  useEffect(() => {
    const availableModels = getAvailableModels();
    const currentModelIsValid = availableModels.some(m => m.value === bulkMetadataModel);
    
    // 現在のモデルが新しいタイプに有効な場合は変更しない
    if (currentModelIsValid) {
      return;
    }
    
    // モデルタイプに応じてデフォルトモデルを設定
    if (bulkMetadataModelType === 'gpt') {
      setBulkMetadataModel('gpt-5-mini');
    } else if (bulkMetadataModelType === 'gemini') {
      setBulkMetadataModel(GEMINI_MODELS[0].value);
    } else if (bulkMetadataModelType === 'claude') {
      setBulkMetadataModel(CLAUDE_MODELS[0].value);
    } else if (bulkMetadataModelType === 'local') {
      loadLocalModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkMetadataModelType, loadLocalModels]);

  // ローカルモデルが読み込まれたら最初のモデルを選択
  useEffect(() => {
    if (bulkMetadataModelType === 'local' && bulkMetadataLocalModels.length > 0) {
      if (!bulkMetadataLocalModels.some(m => m.value === bulkMetadataModel)) {
        setBulkMetadataModel(bulkMetadataLocalModels[0].value);
      }
    }
  }, [bulkMetadataLocalModels, bulkMetadataModelType, bulkMetadataModel]);
  return (
    <div
      key={item.id}
      style={{
        marginBottom: '32px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        {editingMonth === activeTab && editingSection === `${item.id}-title` ? (
          <div style={{ flex: 1, marginRight: '8px' }}>
            <input
              type="text"
              value={editingItemTitle}
              onChange={(e) => onSetEditingItemTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #0066CC',
                borderRadius: '4px',
                fontSize: '1.35em',
                fontWeight: '700',
                color: '#0F172A',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSaveEdit();
                } else if (e.key === 'Escape') {
                  onCancelEdit();
                }
              }}
              autoFocus
            />
            <div style={{ marginTop: '4px' }}>
              <p style={{
                margin: '0',
                fontSize: '12px',
                color: '#64748B',
                fontFamily: 'monospace',
                fontWeight: '500',
              }}>
                MeetingID: {meetingId}
              </p>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '12px',
                color: '#64748B',
                fontFamily: 'monospace',
                fontWeight: '500',
              }}>
                ItemID: {item.id}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={onSaveEdit}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#10B981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                保存
              </button>
              <button
                onClick={onCancelEdit}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <h3 
              style={{
                marginTop: 0,
                fontSize: '1.3em',
                color: '#0F172A',
                borderLeft: '5px solid #0066CC',
                paddingLeft: '20px',
                background: 'linear-gradient(90deg, #EFF6FF 0%, #F0F9FF 60%, transparent 100%)',
                cursor: 'pointer',
                fontWeight: '700',
                letterSpacing: '0.3px',
                lineHeight: '1.5',
                paddingTop: '6px',
                paddingBottom: '6px',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
              }}
              onClick={() => onStartEditItemTitle(activeTab, item.id)}
              title="クリックしてタイトルを編集"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(90deg, #DBEAFE 0%, #E0F2FE 60%, transparent 100%)';
                e.currentTarget.style.color = '#0066CC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(90deg, #EFF6FF 0%, #F0F9FF 60%, transparent 100%)';
                e.currentTarget.style.color = '#1E293B';
              }}
            >
              {item.title}
            </h3>
            <div style={{ marginLeft: '20px', marginTop: '4px' }}>
              <p style={{
                margin: '0',
                fontSize: '12px',
                color: '#64748B',
                fontFamily: 'monospace',
                fontWeight: '500',
              }}>
                MeetingID: {meetingId}
              </p>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '12px',
                color: '#64748B',
                fontFamily: 'monospace',
                fontWeight: '500',
              }}>
                ItemID: {item.id}
              </p>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
          {editingMonth === activeTab && editingSection === item.id ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={onSaveEdit}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#10B981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                保存
              </button>
              <button
                onClick={onCancelEdit}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                キャンセル
              </button>
            </div>
          ) : (
            <>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onStartEditItem(activeTab, item.id);
              }}
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                backgroundColor: 'transparent',
                color: '#475569',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                opacity: 0.7,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 102, 204, 0.1)';
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.color = '#0066CC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.opacity = '0.7';
                e.currentTarget.style.color = '#475569';
              }}
              title="コンテンツを編集"
            >
              <EditIcon size={18} color="currentColor" />
            </button>
              <button
                onClick={() => onDeleteItem(activeTab, item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  backgroundColor: 'transparent',
                  color: '#DC2626',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  opacity: 0.7,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.color = '#DC2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.opacity = '0.7';
                  e.currentTarget.style.color = '#DC2626';
                }}
                title="削除"
              >
                <DeleteIcon size={18} color="currentColor" />
              </button>
            </>
          )}
        </div>
      </div>
      
      {(item.location || item.date || item.author) && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '12px 16px',
          backgroundColor: '#F8FAFC',
          borderRadius: '6px',
          border: '1px solid #E2E8F0',
        }}>
          <p style={{ margin: 0, color: '#475569', fontSize: '15px', lineHeight: '1.8', fontWeight: '500' }}>
            {item.location && <><strong style={{ color: '#0F172A', fontWeight: '700' }}>場所:</strong> {item.location}<br /></>}
            {item.date && <><strong style={{ color: '#0F172A', fontWeight: '700' }}>日時:</strong> {item.date}<br /></>}
            {item.author && <><strong style={{ color: '#0F172A', fontWeight: '700' }}>文責:</strong> {item.author}</>}
          </p>
        </div>
      )}
      
      {editingMonth === activeTab && editingSection === item.id ? (
        <div>
          <p style={{
            margin: '0 0 8px 0',
            fontSize: '12px',
            color: '#64748B',
            fontFamily: 'monospace',
            fontWeight: '500',
          }}>
            ID: {item.id}
          </p>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#1E293B',
              fontSize: '14px',
            }}>
              日時
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: '0 0 200px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '500',
                  color: '#475569',
                  fontSize: '13px',
                }}>
                  日付
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={editingItemDate}
                    onChange={(e) => onSetEditingItemDate(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const year = today.getFullYear();
                      const month = String(today.getMonth() + 1).padStart(2, '0');
                      const day = String(today.getDate()).padStart(2, '0');
                      onSetEditingItemDate(`${year}-${month}-${day}`);
                    }}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#0066CC',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#0051a8';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#0066CC';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    今日
                  </button>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '500',
                  color: '#475569',
                  fontSize: '13px',
                }}>
                  時間（任意）
                </label>
                <input
                  type="text"
                  value={editingItemTime}
                  onChange={(e) => onSetEditingItemTime(e.target.value)}
                  placeholder="例: 14:00-16:00"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>
          <textarea
            value={editingContent}
            onChange={(e) => onSetEditingContent(e.target.value)}
            style={{
              width: '100%',
              minHeight: '300px',
              padding: '12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'monospace',
              resize: 'vertical',
              lineHeight: '1.6',
            }}
          />
        </div>
      ) : (
        <div>
          {item.content ? (
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {item.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p style={{ color: '#64748B', fontStyle: 'italic', fontSize: '16px', fontWeight: '500' }}>
              コンテンツがありません。編集ボタンから追加してください。
            </p>
          )}
        </div>
      )}
      
      {/* トピック一括追加ボタン */}
      {item.content && (
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => {
              try {
                // 内容を##で始まる行で分割（##見出しを区切りとして扱う）
                const content = item.content.trim();
                
                // ##で始まる行を検出して分割
                const lines = content.split('\n');
                const sections: string[] = [];
                let currentSection: string[] = [];
                
                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  // ##で始まる行（見出し）を検出（###は除外）
                  const trimmedLine = line.trim();
                  if (trimmedLine.startsWith('##') && !trimmedLine.startsWith('###')) {
                    // 現在のセクションを保存（空でない場合）
                    if (currentSection.length > 0) {
                      sections.push(currentSection.join('\n'));
                    }
                    // 新しいセクションを開始（見出し行を含める）
                    currentSection = [line];
                  } else {
                    // 見出しでない行は現在のセクションに追加
                    currentSection.push(line);
                  }
                }
                
                // 最後のセクションを追加
                if (currentSection.length > 0) {
                  sections.push(currentSection.join('\n'));
                }
                
                // 空のセクションを除去
                const cleanedSections = sections
                  .map(section => section.trim())
                  .filter(section => section.length > 0);
                
                if (cleanedSections.length === 0) {
                  alert('##で始まる見出しが見つかりませんでした。');
                  return;
                }
                
                const newTopics: Topic[] = [];
                
                cleanedSections.forEach((section) => {
                  const trimmedSection = section.trim();
                  if (trimmedSection.length === 0) return;
                  
                  // 最初の##見出しを探す
                  const headingMatch = trimmedSection.match(/^##\s+(.+)$/m);
                  let title = '無題のトピック';
                  
                  if (headingMatch && headingMatch[1]) {
                    title = headingMatch[1].trim();
                  } else {
                    // ##がない場合は最初の行をタイトルにする
                    const firstLine = trimmedSection.split('\n')[0].trim();
                    if (firstLine.length > 0) {
                      title = firstLine.replace(/^#+\s*/, '').trim() || '無題のトピック';
                    }
                  }
                  
                  // トピックIDを生成
                  const topicId = generateUniqueId();
                  
                  const now = new Date().toISOString();
                  
                  newTopics.push({
                    id: topicId,
                    title: title,
                    content: trimmedSection,
                    mentionedDate: item.date || undefined, // 親の議事録の日時を引き継ぐ
                    createdAt: now,
                    updatedAt: now,
                  });
                });
                
                if (newTopics.length === 0) {
                  alert('トピックを抽出できませんでした。');
                  return;
                }
                
                // 既存のトピックに追加
                const updatedContents = { ...monthContents };
                const tabData = updatedContents[activeTab];
                if (tabData) {
                  const itemIndex = tabData.items.findIndex(i => i.id === item.id);
                  if (itemIndex !== -1) {
                    const updatedItems = [...tabData.items];
                    const currentTopics = updatedItems[itemIndex].topics || [];
                    updatedItems[itemIndex] = {
                      ...updatedItems[itemIndex],
                      topics: [...currentTopics, ...newTopics],
                    };
                    updatedContents[activeTab] = {
                      ...tabData,
                      items: updatedItems,
                    };
                    onSetMonthContents(updatedContents);
                    onSetHasUnsavedChanges(true);
                    
                    // Topicsテーブルに各トピックを保存
                    for (const topic of newTopics) {
                      // topicDateを取得（mentionedDateまたはitem.dateから）
                      const topicDate = (topic as any).mentionedDate !== undefined 
                        ? (topic as any).mentionedDate 
                        : (item?.date || undefined);
                      
                      saveTopicEmbeddingAsync(
                        topic.id,
                        meetingId,
                        organizationId,
                        topic.title || '',
                        topic.content || '',
                        {
                          keywords: topic.keywords,
                          semanticCategory: topic.semanticCategory,
                          importance: topic.importance,
                          summary: topic.summary,
                        },
                        undefined, // regulationId
                        topicDate
                      ).catch((error: any) => {
                        console.warn(`トピック ${topic.id} のTopicsテーブルへの保存に失敗しました:`, error);
                      });
                    }
                    
                    alert(`${newTopics.length}個のトピックを追加しました。`);
                  }
                }
              } catch (error: any) {
                console.error('トピック一括追加エラー:', error);
                alert(`トピックの一括追加に失敗しました: ${error?.message || '不明なエラー'}`);
              }
            }}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9em',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.2)';
            }}
            >
            <span style={{ marginRight: '6px', fontSize: '1.1em' }}>+</span>
            トピック一括追加
          </button>
        </div>
      )}
      
      {/* 個別トピックセクション */}
      <div style={{
        marginTop: '30px',
        paddingTop: '20px',
        borderTop: '2px solid #E2E8F0',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <h4 style={{
            margin: 0,
            fontSize: '1.15em',
            color: '#0066CC',
            fontWeight: '600',
          }}>
            個別トピック
          </h4>
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}>
            {item.topics && item.topics.length > 0 && (
              <>
                <select
                  value={bulkMetadataModelType}
                  onChange={(e) => {
                    setBulkMetadataModelType(e.target.value as ModelType);
                    if (e.target.value === 'local') {
                      loadLocalModels();
                    }
                  }}
                  disabled={isGeneratingMetadata}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '0.9em',
                    backgroundColor: '#FFFFFF',
                    color: '#1E293B',
                    cursor: isGeneratingMetadata ? 'not-allowed' : 'pointer',
                    opacity: isGeneratingMetadata ? 0.6 : 1,
                    minWidth: '100px',
                  }}
                  title="メタデータ生成に使用するプロバイダー"
                >
                  <option value="gpt">GPT</option>
                  <option value="gemini">Gemini</option>
                  <option value="claude">Claude</option>
                  <option value="local">ローカル</option>
                </select>
                <select
                  value={bulkMetadataModel}
                  onChange={(e) => setBulkMetadataModel(e.target.value)}
                  disabled={isGeneratingMetadata || (bulkMetadataModelType === 'local' && loadingBulkMetadataLocalModels)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '0.9em',
                    backgroundColor: '#FFFFFF',
                    color: '#1E293B',
                    cursor: isGeneratingMetadata || (bulkMetadataModelType === 'local' && loadingBulkMetadataLocalModels) ? 'not-allowed' : 'pointer',
                    opacity: isGeneratingMetadata || (bulkMetadataModelType === 'local' && loadingBulkMetadataLocalModels) ? 0.6 : 1,
                    minWidth: '150px',
                  }}
                  title="メタデータ生成に使用するモデル"
                >
                  {loadingBulkMetadataLocalModels && bulkMetadataModelType === 'local' ? (
                    <option value="">読み込み中...</option>
                  ) : (
                    getAvailableModels().map(model => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))
                  )}
                </select>
                <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔘 AIで一括メタデータ生成ボタンがクリックされました');
                  (async () => {
                  try {
                    // メタデータが未設定のトピックを抽出
                    const allTopics = item.topics || [];
                    console.log('📊 全トピック数:', allTopics.length);
                    console.log('📊 全トピックの詳細:', allTopics.map(t => ({
                      id: t.id,
                      title: t.title,
                      hasSemanticCategory: !!t.semanticCategory,
                      hasImportance: !!t.importance,
                      hasKeywords: !!(t.keywords && (Array.isArray(t.keywords) ? t.keywords.length > 0 : t.keywords)),
                      hasSummary: !!t.summary,
                    })));

                    const topicsWithoutMetadata = allTopics.filter(topic => {
                      const hasSemanticCategory = !!topic.semanticCategory;
                      const hasImportance = !!topic.importance;
                      const hasKeywords = !!(topic.keywords && (Array.isArray(topic.keywords) ? topic.keywords.length > 0 : topic.keywords));
                      const hasSummary = !!topic.summary;
                      const isWithoutMetadata = !hasSemanticCategory && !hasImportance && !hasKeywords && !hasSummary;
                      
                      console.log(`📊 トピック ${topic.id} (${topic.title}):`, {
                        hasSemanticCategory,
                        hasImportance,
                        hasKeywords,
                        hasSummary,
                        isWithoutMetadata,
                      });
                      
                      return isWithoutMetadata;
                    });

                    console.log('📊 メタデータ未設定のトピック数:', topicsWithoutMetadata.length);
                    console.log('📊 メタデータ未設定のトピック:', topicsWithoutMetadata.map(t => ({ id: t.id, title: t.title })));

                    // メタデータ未設定のトピックがない場合、既存のメタデータを上書きして再生成
                    let topicsToProcess = topicsWithoutMetadata;
                    if (topicsToProcess.length === 0) {
                      // 既存のメタデータがあるトピックも対象にする（デフォルトで再生成）
                      const hasMetadataTopics = allTopics.filter(topic => {
                        const hasSemanticCategory = !!topic.semanticCategory;
                        const hasImportance = !!topic.importance;
                        const hasKeywords = !!(topic.keywords && (Array.isArray(topic.keywords) ? topic.keywords.length > 0 : topic.keywords));
                        const hasSummary = !!topic.summary;
                        return hasSemanticCategory || hasImportance || hasKeywords || hasSummary;
                      });
                      
                      if (hasMetadataTopics.length > 0) {
                        // 既存のメタデータがあるトピックも対象にする（確認なしで再生成）
                        topicsToProcess = hasMetadataTopics;
                        console.log('📊 既存のメタデータを上書きして再生成します:', topicsToProcess.map(t => ({ id: t.id, title: t.title })));
                        console.log(`ℹ️ ${hasMetadataTopics.length}個のトピックのメタデータを再生成します`);
                      } else {
                        // トピックが存在しない場合
                        const message = 'メタデータが未設定のトピックがありません。すべてのトピックにメタデータが設定されているか、トピックが存在しません。';
                        console.warn('⚠️', message);
                        alert(message);
                        return;
                      }
                    }

                    // ローディング状態を開始
                    setIsGeneratingMetadata(true);
                    setBulkMetadataProgress({ current: 0, total: topicsToProcess.length });
                    console.log('✅ 処理を開始します...', `対象トピック数: ${topicsToProcess.length}`);

                    const updatedContents = { ...monthContents };
                    const tabData = updatedContents[activeTab];
                    if (!tabData) {
                      setIsGeneratingMetadata(false);
                      setBulkMetadataProgress(null);
                      return;
                    }

                    const itemIndex = tabData.items.findIndex(i => i.id === item.id);
                    if (itemIndex === -1) {
                      setIsGeneratingMetadata(false);
                      setBulkMetadataProgress(null);
                      return;
                    }

                    const updatedItems = [...tabData.items];
                    const currentTopics = [...(updatedItems[itemIndex].topics || [])];
                    let processedCount = 0;

                    // 各トピックに対して順番に処理
                    for (let index = 0; index < topicsToProcess.length; index++) {
                      const topic = topicsToProcess[index];
                      // 進捗を更新
                      setBulkMetadataProgress({ current: index + 1, total: topicsToProcess.length });
                      try {
                        // メタデータを生成
                        const metadata = await generateTopicMetadata(
                          topic.title || '',
                          topic.content || '',
                          bulkMetadataModel
                        );

                        // エンティティとリレーションを抽出
                        const extractedEntities = await extractEntities(
                          topic.title || '',
                          topic.content || '',
                          bulkMetadataModel
                        );

                        const extractedRelations = extractedEntities.length > 0
                          ? await extractRelations(
                              topic.title || '',
                              topic.content || '',
                              extractedEntities,
                              bulkMetadataModel
                            )
                          : [];

                        // トピックのメタデータを更新
                        const topicIndex = currentTopics.findIndex(t => t.id === topic.id);
                        if (topicIndex !== -1) {
                          currentTopics[topicIndex] = {
                            ...currentTopics[topicIndex],
                            semanticCategory: metadata.semanticCategory,
                            importance: metadata.importance,
                            keywords: metadata.keywords,
                            summary: metadata.summary,
                            updatedAt: new Date().toISOString(),
                          };

                          // Topicsテーブルに保存
                          try {
                            // topicDateを取得（mentionedDateまたはitem.dateから）
                            const topicDate = (topic as any).mentionedDate !== undefined 
                              ? (topic as any).mentionedDate 
                              : (item?.date || undefined);
                            
                            await saveTopicEmbeddingAsync(
                              topic.id,
                              meetingId,
                              organizationId,
                              topic.title || '',
                              topic.content || '',
                              {
                                keywords: metadata.keywords,
                                semanticCategory: metadata.semanticCategory,
                                importance: metadata.importance,
                                summary: metadata.summary,
                              },
                              undefined, // regulationId
                              topicDate
                            );
                            console.log(`✅ [MeetingItemCard] Topicsテーブルへの保存成功: ${topic.id}`);
                          } catch (saveError: any) {
                            console.error(`❌ [MeetingItemCard] Topicsテーブルへの保存失敗: ${topic.id}`, {
                              error: saveError,
                              errorMessage: saveError?.message,
                              topicId: topic.id,
                              metadata: {
                                keywords: metadata.keywords,
                                semanticCategory: metadata.semanticCategory,
                                importance: metadata.importance,
                                summary: metadata.summary,
                              },
                            });
                            // エラーをログに記録するが、処理は続行する
                          }

                          // エンティティを保存
                          for (const entity of extractedEntities) {
                            try {
                              await createEntity({
                                ...entity,
                                organizationId: organizationId,
                              });
                            } catch (error: any) {
                              console.warn(`エンティティ ${entity.name} の保存に失敗しました:`, error);
                            }
                          }

                          // リレーションを保存
                          const topicEmbeddingId = `${meetingId}-topic-${topic.id}`;
                          for (const relation of extractedRelations) {
                            try {
                              await createRelation({
                                ...relation,
                                topicId: topicEmbeddingId,
                                organizationId: organizationId,
                              });
                            } catch (error: any) {
                              console.warn(`リレーションの保存に失敗しました:`, error);
                            }
                          }

                          processedCount++;
                        }
                      } catch (error: any) {
                        console.error(`トピック ${topic.id} のメタデータ生成エラー:`, error);
                      }
                    }

                    // 更新されたトピックを反映
                    updatedItems[itemIndex] = {
                      ...updatedItems[itemIndex],
                      topics: currentTopics,
                    };
                    updatedContents[activeTab] = {
                      ...tabData,
                      items: updatedItems,
                    };
                    onSetMonthContents(updatedContents);
                    onSetHasUnsavedChanges(true);

                    console.log(`✅ 処理完了: ${processedCount}個のトピックのメタデータを生成しました`);
                    alert(`${processedCount}個のトピックのメタデータを生成しました。`);
                  } catch (error: any) {
                    console.error('❌ 一括メタデータ生成エラー:', error);
                    console.error('❌ エラー詳細:', {
                      message: error?.message,
                      stack: error?.stack,
                      error: error
                    });
                    alert(`メタデータの生成に失敗しました: ${error?.message || '不明なエラー'}`);
                  } finally {
                    setIsGeneratingMetadata(false);
                    setBulkMetadataProgress(null);
                  }
                  })();
                }}
                disabled={isGeneratingMetadata}
                style={{
                  padding: '8px 16px',
                  background: isGeneratingMetadata 
                    ? 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)'
                    : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.95em',
                  fontWeight: 'bold',
                  cursor: isGeneratingMetadata ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(16,185,129,0.15)',
                  transition: 'background 0.2s, transform 0.2s',
                  pointerEvents: 'auto',
                  zIndex: 10,
                  position: 'relative',
                  opacity: isGeneratingMetadata ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }}
              >
                {isGeneratingMetadata && bulkMetadataProgress
                  ? `メタデータ生成中... (${bulkMetadataProgress.current}/${bulkMetadataProgress.total})`
                  : 'AIで一括メタデータ生成'}
              </button>
              </>
            )}
            <button
              onClick={() => {
                onSetEditingTopicItemId(item.id);
                onSetEditingTopicId(null);
                onSetTopicTitle('');
                onSetTopicContent('');
                onSetShowTopicModal(true);
              }}
              style={{
                padding: '8px 16px',
                background: '#0066CC',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.95em',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,102,204,0.15)',
                transition: 'background 0.2s, transform 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0051a8';
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0066CC';
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
              }}
            >
              + トピックを追加
            </button>
          </div>
        </div>
        
        {item.topics && item.topics.length > 0 ? (
          <div>
            {item.topics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                itemId={item.id}
                expandedTopics={expandedTopics}
                onSetExpandedTopics={onSetExpandedTopics}
                onSetEditingTopicItemId={onSetEditingTopicItemId}
                onSetEditingTopicId={onSetEditingTopicId}
                editingTopicId={editingTopicId}
                onSetTopicTitle={onSetTopicTitle}
                onSetTopicContent={onSetTopicContent}
                onSetTopicSemanticCategory={onSetTopicSemanticCategory}
                onSetTopicKeywords={onSetTopicKeywords}
                onSetTopicSummary={onSetTopicSummary}
                onSetTopicImportance={onSetTopicImportance}
                onSetShowTopicModal={onSetShowTopicModal}
                onDeleteTopic={onDeleteTopic}
                meetingId={meetingId}
                organizationId={organizationId}
              />
            ))}
          </div>
        ) : (
          <p style={{
            color: '#888',
            fontStyle: 'italic',
            fontSize: '14px',
          }}>
            まだトピックが追加されていません。
          </p>
        )}
      </div>
    </div>
  );
}

