'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Topic } from '@/types/topicMetadata';
import { markdownComponents } from '../utils';
import { getChildTopicFiles, getTopicImagePaths } from '@/lib/topicImages';
import { callTauriCommand } from '@/lib/localFirebase';

interface TopicCardProps {
  topic: Topic;
  itemId: string;
  expandedTopics: Set<string>;
  onSetExpandedTopics: (topics: Set<string>) => void;
  onSetEditingTopicItemId: (itemId: string | null) => void;
  onSetEditingTopicId: (topicId: string | null) => void;
  editingTopicId: string | null;
  onSetTopicTitle: (title: string) => void;
  onSetTopicContent: (content: string) => void;
  onSetTopicSemanticCategory: (category: string) => void;
  onSetTopicKeywords: (keywords: string) => void;
  onSetTopicSummary: (summary: string) => void;
  onSetTopicImportance: (importance: string) => void;
  onSetShowTopicModal: (show: boolean) => void;
  onDeleteTopic: (itemId: string, topicId: string) => void;
  meetingId: string;
  organizationId: string;
}

export default function TopicCard({
  topic,
  itemId,
  expandedTopics,
  onSetExpandedTopics,
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
  meetingId,
  organizationId,
}: TopicCardProps) {
  const topicKey = `${itemId}-topic-${topic.id}`;
  const isExpanded = expandedTopics.has(topicKey);
  const [childFiles, setChildFiles] = useState<Array<{ path: string; description?: string; detailedDescription?: string; id?: string; fileName?: string; mimeType?: string; fileSize?: number }>>([]);
  const [loadingChildFiles, setLoadingChildFiles] = useState(false);
  const [topicFiles, setTopicFiles] = useState<Array<{ path: string; description?: string; detailedDescription?: string; id?: string; fileName?: string; mimeType?: string; fileSize?: number }>>([]);
  const [loadingTopicFiles, setLoadingTopicFiles] = useState(false);
  const prevEditingTopicIdRef = useRef<string | null>(null);

  const loadTopicFiles = useCallback(async () => {
    setLoadingTopicFiles(true);
    try {
      const files = await getTopicImagePaths(topic.id, meetingId);
      setTopicFiles(files);
    } catch (error) {
      console.error('トピックファイルの読み込みエラー:', error);
      setTopicFiles([]);
    } finally {
      setLoadingTopicFiles(false);
    }
  }, [topic.id, meetingId]);

  // トピックに紐づいているファイルを取得（展開前でも表示するため）
  useEffect(() => {
    loadTopicFiles();
  }, [loadTopicFiles]);

  // モーダルが閉じたとき（editingTopicIdがnullになったとき、かつ、そのトピックが編集中だったとき）にファイルリストを再読み込み
  useEffect(() => {
    const prevEditingTopicId = prevEditingTopicIdRef.current;
    prevEditingTopicIdRef.current = editingTopicId;
    
    // 前回このトピックが編集中で、現在nullになった場合、ファイルリストを再読み込み
    if (prevEditingTopicId === topic.id && editingTopicId === null) {
      loadTopicFiles();
    }
  }, [editingTopicId, topic.id, loadTopicFiles]);

  // 展開時に子トピック（ファイル）を取得
  useEffect(() => {
    if (isExpanded) {
      loadChildFiles();
    } else {
      setChildFiles([]);
    }
  }, [isExpanded, topic.id]);

  const loadChildFiles = async () => {
    setLoadingChildFiles(true);
    try {
      const files = await getChildTopicFiles(topic.id);
      setChildFiles(files);
    } catch (error) {
      console.error('子トピック（ファイル）の読み込みエラー:', error);
      setChildFiles([]);
    } finally {
      setLoadingChildFiles(false);
    }
  };

  const handleOpenFile = async (filePath: string) => {
    try {
      const result = await callTauriCommand('open_file', { filePath });
      if (!result || !result.success) {
        alert(`ファイルを開くことができませんでした: ${result?.error || '不明なエラー'}`);
      }
    } catch (error: any) {
      console.error('ファイルを開くエラー:', error);
      alert(`ファイルを開くことができませんでした: ${error?.message || '不明なエラー'}`);
    }
  };
  
  return (
    <div
      key={topic.id}
      id={topicKey}
      style={{
        backgroundColor: '#F8FAFD',
        border: '1px solid #E0E0E0',
        borderRadius: '8px',
        padding: '18px 20px',
        marginBottom: '15px',
        position: 'relative',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: isExpanded ? '12px' : '0',
      }}>
        <div 
          style={{ 
            flex: 1,
            cursor: 'pointer',
          }}
          onClick={() => {
            const newExpanded = new Set(expandedTopics);
            if (isExpanded) {
              newExpanded.delete(topicKey);
            } else {
              newExpanded.add(topicKey);
            }
            onSetExpandedTopics(newExpanded);
          }}
        >
          <h5 style={{
            fontSize: '1.1em',
            fontWeight: 'bold',
            color: '#1E293B',
            margin: 0,
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{
              fontSize: '14px',
              transition: 'transform 0.2s ease',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              display: 'inline-block',
            }}>
              ▶
            </span>
            {topic.title}
            {/* ファイル情報を表示 */}
            {!loadingTopicFiles && topicFiles.length > 0 && (
              <span style={{
                fontSize: '0.75em',
                color: '#0066CC',
                marginLeft: '12px',
                fontWeight: 'normal',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                backgroundColor: '#EFF6FF',
                borderRadius: '12px',
              }}>
                📎 {topicFiles.length}件のファイル
              </span>
            )}
            {loadingTopicFiles && (
              <span style={{
                fontSize: '0.75em',
                color: '#9CA3AF',
                marginLeft: '12px',
                fontWeight: 'normal',
              }}>
                📎 読み込み中...
              </span>
            )}
          </h5>
          {/* メタデータ表示 */}
          {(topic.semanticCategory || topic.importance || topic.keywords?.length || topic.summary) && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginTop: '8px',
            }}>
              {topic.semanticCategory && (
                <span style={{
                  padding: '4px 10px',
                  backgroundColor: '#EFF6FF',
                  color: '#0066CC',
                  borderRadius: '12px',
                  fontSize: '0.75em',
                  fontWeight: '600',
                }}>
                  📂 {topic.semanticCategory === 'action-item' ? 'アクションアイテム' :
                      topic.semanticCategory === 'decision' ? '決定事項' :
                      topic.semanticCategory === 'discussion' ? '議論・討議' :
                      topic.semanticCategory === 'issue' ? '課題・問題' :
                      topic.semanticCategory === 'risk' ? 'リスク' :
                      topic.semanticCategory === 'opportunity' ? '機会' :
                      topic.semanticCategory === 'question' ? '質問・疑問' :
                      topic.semanticCategory === 'summary' ? 'サマリー' :
                      topic.semanticCategory === 'follow-up' ? 'フォローアップ' :
                      topic.semanticCategory === 'reference' ? '参照情報' : 'その他'}
                </span>
              )}
              {topic.importance && (
                <span style={{
                  padding: '4px 10px',
                  backgroundColor: topic.importance === 'high' ? '#FEF2F2' :
                                 topic.importance === 'medium' ? '#FEF3C7' : '#F0FDF4',
                  color: topic.importance === 'high' ? '#DC2626' :
                         topic.importance === 'medium' ? '#D97706' : '#16A34A',
                  borderRadius: '12px',
                  fontSize: '0.75em',
                  fontWeight: '600',
                }}>
                  {topic.importance === 'high' ? '🔴 高' :
                   topic.importance === 'medium' ? '🟡 中' : '🟢 低'}
                </span>
              )}
              {topic.keywords && topic.keywords.length > 0 && (
                <span style={{
                  padding: '4px 10px',
                  backgroundColor: '#F3F4F6',
                  color: '#475569',
                  borderRadius: '12px',
                  fontSize: '0.75em',
                }}>
                  🏷️ {topic.keywords.slice(0, 3).join(', ')}
                  {topic.keywords.length > 3 && ` +${topic.keywords.length - 3}`}
                </span>
              )}
            </div>
          )}
          {topic.summary && (
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              backgroundColor: '#F8FAFC',
              borderRadius: '6px',
              fontSize: '0.85em',
              color: '#475569',
              fontStyle: 'italic',
            }}>
              📝 {topic.summary}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            onClick={() => {
              onSetEditingTopicItemId(itemId);
              onSetEditingTopicId(topic.id);
              onSetTopicTitle(topic.title);
              onSetTopicContent(topic.content);
              // メタデータも読み込む
              onSetTopicSemanticCategory(topic.semanticCategory || '');
              onSetTopicKeywords(topic.keywords?.join(', ') || '');
              onSetTopicSummary(topic.summary || '');
              onSetTopicImportance(topic.importance || '');
              onSetShowTopicModal(true);
            }}
            title="編集"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#9CA3AF',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease, opacity 0.2s ease',
              opacity: 0.7,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.color = '#6B7280';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.opacity = '0.7';
              e.currentTarget.style.color = '#9CA3AF';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button
            onClick={() => onDeleteTopic(itemId, topic.id)}
            title="削除"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#9CA3AF',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease, opacity 0.2s ease',
              opacity: 0.7,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FEF2F2';
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.color = '#DC2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.opacity = '0.7';
              e.currentTarget.style.color = '#9CA3AF';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
      {isExpanded && (
        <>
          <div
            className="markdown-content"
            style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {topic.content}
            </ReactMarkdown>
          </div>
          
          {/* 子トピック（ファイル）の表示 */}
          {loadingChildFiles ? (
            <div style={{ marginTop: '12px', padding: '8px', color: '#6B7280', fontSize: '0.85em' }}>
              子トピック（ファイル）を読み込み中...
            </div>
          ) : childFiles.length > 0 ? (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.9em', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                📎 子トピック（ファイル）:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {childFiles.map((file, index) => {
                  const fileName = file.fileName || file.path.split('/').pop() || file.path;
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
                      key={file.id || index}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '6px',
                        border: '1px solid #E5E7EB',
                      }}
                    >
                      <div
                        onClick={() => handleOpenFile(file.path)}
                        style={{
                          fontSize: '0.85em',
                          fontWeight: 600,
                          color: '#0066CC',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          marginBottom: '4px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#0051a8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#0066CC';
                        }}
                      >
                        {getFileIcon(fileName)} {fileName}
                      </div>
                      {file.description && (
                        <div style={{ fontSize: '0.75em', color: '#6B7280', marginTop: '4px' }}>
                          {file.description}
                        </div>
                      )}
                      {file.id && (
                        <div style={{ fontSize: '0.7em', color: '#9CA3AF', fontFamily: 'monospace', marginTop: '4px' }}>
                          ID: {file.id}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

