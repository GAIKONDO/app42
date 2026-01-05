'use client';

import { useRouter } from 'next/navigation';
import type { KnowledgeGraphSearchResult } from '@/lib/knowledgeGraphRAG';
import { entityTypeLabels, relationTypeLabels } from '../constants/labels';

interface SearchResultDetailProps {
  result: KnowledgeGraphSearchResult;
  onClose: () => void;
}

export default function SearchResultDetail({ result, onClose }: SearchResultDetailProps) {
  const router = useRouter();

  const handleShowInMeeting = async () => {
    console.log('[handleShowInMeeting] 開始:', {
      hasMeetingNoteId: !!result.meetingNoteId,
      meetingNoteId: result.meetingNoteId,
      hasTopic: !!result.topic,
      topicOrganizationId: result.topic?.organizationId,
      topicId: result.topicId,
    });
    
    if (!result.meetingNoteId) {
      console.warn('[handleShowInMeeting] meetingNoteIdがありません');
      return;
    }

    // Graphvizトピックの場合はGraphvizページへ
    if (result.meetingNoteId.startsWith('graphviz_')) {
      const yamlFileId = result.meetingNoteId.replace('graphviz_', '');
      if (result.topic?.organizationId) {
        router.push(`/graphviz?fileId=${yamlFileId}&organizationId=${result.topic.organizationId}&tab=tab0`);
      } else {
        alert('組織IDが取得できませんでした');
      }
      return;
    }

    // meetingNoteIdが {meetingNoteId}-topic-{topicId} 形式の場合、パースする
    let actualMeetingNoteId = result.meetingNoteId;
    const topicIdMatch = result.meetingNoteId.match(/^(.+?)-topic-(.+)$/);
    if (topicIdMatch) {
      actualMeetingNoteId = topicIdMatch[1];
      console.log('[handleShowInMeeting] meetingNoteIdをパース:', {
        original: result.meetingNoteId,
        parsed: actualMeetingNoteId,
      });
    }

    // トピックから組織IDを取得できる場合は、それを使用して直接遷移
    if (result.topic?.organizationId) {
      const params = new URLSearchParams();
      params.append('organizationId', result.topic.organizationId);
      params.append('meetingId', actualMeetingNoteId);
      if (result.topicId) {
        params.append('topicId', result.topicId);
      }
      // Next.jsのrouter.pushを使用（window.location.hrefでは404エラーが発生するため）
      const url = `/organization/detail/meeting?${params.toString()}`;
      console.log('[handleShowInMeeting] 議事録ページに遷移:', url);
      
      try {
        // router.pushで遷移
        router.push(url);
      } catch (routerError: any) {
        console.error('[handleShowInMeeting] router.pushエラー:', routerError);
        // フォールバック: window.location.hrefを使用
        console.warn('[handleShowInMeeting] router.pushが失敗したため、window.location.hrefを使用します');
        window.location.href = url;
      }
      return;
    }

    // 組織IDが取得できない場合はエラー
    const errorMsg = `議事録の組織IDが取得できませんでした\n\nmeetingNoteId: ${result.meetingNoteId}\nactualMeetingNoteId: ${actualMeetingNoteId}\nhasTopic: ${!!result.topic}\ntopicOrganizationId: ${result.topic?.organizationId || 'undefined'}`;
    console.error('[handleShowInMeeting] 組織IDが取得できませんでした:', {
      meetingNoteId: result.meetingNoteId,
      actualMeetingNoteId,
      hasTopic: !!result.topic,
      topicOrganizationId: result.topic?.organizationId,
    });
    alert(errorMsg);
  };

  const handleShowInRegulation = async () => {
    if (result.topic?.regulationId) {
      try {
        // 制度から組織IDを取得
        const { getRegulationById } = await import('@/lib/orgApi');
        const regulation = await getRegulationById(result.topic.regulationId);
        if (regulation && regulation.organizationId) {
          // topicIdがある場合はURLパラメータに追加
          const params = new URLSearchParams();
          params.append('id', regulation.organizationId); // 組織IDは'id'パラメータとして使用
          params.append('regulationId', result.topic.regulationId);
          if (result.topicId) {
            params.append('topicId', result.topicId);
          }
          router.push(`/organization/detail/regulation?${params.toString()}`);
        } else {
          alert('制度の組織IDが取得できませんでした');
        }
      } catch (error) {
        console.error('制度の取得エラー:', error);
        alert('制度の取得に失敗しました');
      }
    }
  };

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937' }}>
          詳細情報
        </h2>
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
          閉じる
        </button>
      </div>

      {result.entity && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '12px' }}>
            {result.entity.name}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>タイプ: </span>
              <span style={{ fontSize: '14px', color: '#1F2937' }}>
                {entityTypeLabels[result.entity.type] || result.entity.type}
              </span>
            </div>
            {result.entity.aliases && result.entity.aliases.length > 0 && (
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>別名: </span>
                <span style={{ fontSize: '14px', color: '#1F2937' }}>
                  {result.entity.aliases.join(', ')}
                </span>
              </div>
            )}
            {result.entity.metadata && Object.keys(result.entity.metadata).length > 0 && (
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>メタデータ: </span>
                <pre style={{ fontSize: '12px', color: '#1F2937', margin: '8px 0', padding: '8px', backgroundColor: '#F9FAFB', borderRadius: '4px', overflow: 'auto' }}>
                  {JSON.stringify(result.entity.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {result.relation && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '12px' }}>
            {relationTypeLabels[result.relation.relationType] || result.relation.relationType}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {result.relation.description && (
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>説明: </span>
                <span style={{ fontSize: '14px', color: '#1F2937' }}>
                  {result.relation.description}
                </span>
              </div>
            )}
            {result.relation.confidence !== undefined && (
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>信頼度: </span>
                <span style={{ fontSize: '14px', color: '#1F2937' }}>
                  {(result.relation.confidence * 100).toFixed(1)}%
                </span>
              </div>
            )}
            {result.relation.metadata && Object.keys(result.relation.metadata).length > 0 && (
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>メタデータ: </span>
                <pre style={{ fontSize: '12px', color: '#1F2937', margin: '8px 0', padding: '8px', backgroundColor: '#F9FAFB', borderRadius: '4px', overflow: 'auto' }}>
                  {JSON.stringify(result.relation.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {result.type === 'topic' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
              {result.topic?.title || 'トピック'}
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {result.meetingNoteId && (
                <button
                  onClick={() => {
                    console.log('[ボタンクリック] 議事録で表示ボタンがクリックされました', {
                      meetingNoteId: result.meetingNoteId,
                      topicOrganizationId: result.topic?.organizationId,
                      topicId: result.topicId,
                    });
                    handleShowInMeeting();
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    color: '#3B82F6',
                    border: '1px solid #3B82F6',
                    borderRadius: '8px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    boxShadow: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#3B82F6';
                    e.currentTarget.style.color = '#FFFFFF';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#3B82F6';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  title={result.meetingNoteId.startsWith('graphviz_') ? 'Graphvizページで表示' : '議事録ページで表示'}
                >
                  {result.meetingNoteId.startsWith('graphviz_') ? 'Graphvizで表示' : '議事録で表示'}
                </button>
              )}
              {result.topic?.regulationId && (
                <button
                  onClick={handleShowInRegulation}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    color: '#10B981',
                    border: '1px solid #10B981',
                    borderRadius: '8px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    boxShadow: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#10B981';
                    e.currentTarget.style.color = '#FFFFFF';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#10B981';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  title="制度ページで表示"
                >
                  制度で表示
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {result.topic?.contentSummary && (
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
                  内容
                </div>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#1F2937', 
                  lineHeight: '1.6',
                  padding: '12px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '6px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {result.topic.contentSummary}
                </p>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {result.topic?.semanticCategory && (
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>セマンティックカテゴリ: </span>
                  <span style={{ fontSize: '14px', color: '#1F2937' }}>{result.topic.semanticCategory}</span>
                </div>
              )}
              {result.topic?.keywords && result.topic.keywords.length > 0 && (
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>キーワード: </span>
                  <span style={{ fontSize: '14px', color: '#1F2937' }}>
                    {result.topic.keywords.join(', ')}
                  </span>
                </div>
              )}
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>トピックID: </span>
                <span style={{ fontSize: '14px', color: '#1F2937' }}>{result.topicId}</span>
              </div>
              {result.meetingNoteId && (
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>議事録ID: </span>
                  <span style={{ fontSize: '14px', color: '#1F2937' }}>{result.meetingNoteId}</span>
                </div>
              )}
              {result.topic?.organizationId && (
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>組織ID: </span>
                  <span style={{ fontSize: '14px', color: '#1F2937' }}>{result.topic.organizationId}</span>
                </div>
              )}
              {result.topic?.files && result.topic.files.length > 0 && (
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280', marginBottom: '8px' }}>
                    📎 関連ファイル ({result.topic.files.length}件)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {result.topic.files.map((file, idx) => {
                      const handleFileClick = async () => {
                        try {
                          // URLの場合はそのまま開く
                          if (file.filePath.startsWith('http://') || file.filePath.startsWith('https://')) {
                            window.open(file.filePath, '_blank', 'noopener,noreferrer');
                            return;
                          }
                          
                          // ローカルファイルの場合はTauriコマンドを使用
                          const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
                          if (isTauri) {
                            // file://プロトコルを除去
                            const cleanPath = file.filePath.replace(/^file:\/\//, '');
                            const result = await callTauriCommand('open_file', { filePath: cleanPath });
                            if (!result || !result.success) {
                              alert(`ファイルを開くことができませんでした: ${result?.error || '不明なエラー'}`);
                            }
                          } else {
                            // ブラウザ環境の場合はfile://リンクを試す
                            const url = file.filePath.startsWith('file://') ? file.filePath : `file://${file.filePath}`;
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }
                        } catch (error: any) {
                          console.error('ファイルを開くエラー:', error);
                          alert(`ファイルを開くことができませんでした: ${error?.message || '不明なエラー'}`);
                        }
                      };
                      
                      return (
                        <div key={idx} style={{
                          padding: '8px',
                          backgroundColor: '#F9FAFB',
                          borderRadius: '6px',
                          border: '1px solid #E5E7EB',
                        }}>
                          <button
                            onClick={handleFileClick}
                            style={{
                              fontSize: '14px',
                              color: '#3B82F6',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              fontWeight: 500,
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              font: 'inherit',
                              textAlign: 'left',
                            }}
                          >
                            {file.fileName}
                          </button>
                          {file.description && (
                            <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0 0' }}>
                              {file.description}
                            </p>
                          )}
                          {file.mimeType && (
                            <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '2px 0 0 0' }}>
                              タイプ: {file.mimeType}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

