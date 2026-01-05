'use client';

import { useState, useMemo } from 'react';
import type { KnowledgeGraphSearchResult } from '@/lib/knowledgeGraphRAG';
import SearchResultItem from './SearchResultItem';

interface SearchResultsListProps {
  results: KnowledgeGraphSearchResult[];
  selectedResult: KnowledgeGraphSearchResult | null;
  onSelectResult: (result: KnowledgeGraphSearchResult) => void;
  onFeedback: (resultId: string, resultType: 'entity' | 'relation' | 'topic', relevant: boolean) => void;
  feedbackRatings: Record<string, boolean>;
  entityTypeLabels: Record<string, string>;
  relationTypeLabels: Record<string, string>;
}

const TOPICS_PER_PAGE = 20;

export default function SearchResultsList({
  results,
  selectedResult,
  onSelectResult,
  onFeedback,
  feedbackRatings,
  entityTypeLabels,
  relationTypeLabels,
}: SearchResultsListProps) {
  const [expandedGroups, setExpandedGroups] = useState<{ entities: boolean; relations: boolean }>({
    entities: false,
    relations: false,
  });
  const [topicPage, setTopicPage] = useState(1);

  // 結果をタイプ別にグループ化
  const entities = results.filter(r => r.type === 'entity');
  const relations = results.filter(r => r.type === 'relation');
  const topics = results.filter(r => r.type === 'topic');
  
  // トピックのページネーション
  const paginatedTopics = useMemo(() => {
    // トピックの詳細が開いている場合、選択されたトピックのみを表示
    if (selectedResult && selectedResult.type === 'topic') {
      return topics.filter(result => result.id === selectedResult.id);
    }
    // 詳細が閉じている場合、ページネーションを適用
    const startIndex = (topicPage - 1) * TOPICS_PER_PAGE;
    const endIndex = startIndex + TOPICS_PER_PAGE;
    return topics.slice(startIndex, endIndex);
  }, [topics, topicPage, selectedResult]);
  
  const totalTopicPages = useMemo(() => {
    if (selectedResult && selectedResult.type === 'topic') {
      return 1;
    }
    return Math.ceil(topics.length / TOPICS_PER_PAGE);
  }, [topics.length, selectedResult]);

  const toggleGroup = (groupType: 'entities' | 'relations') => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupType]: !prev[groupType],
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* エンティティグループ */}
      {entities.length > 0 && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
        }}>
          <div
            onClick={() => toggleGroup('entities')}
            style={{
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: expandedGroups.entities ? '#F3F4F6' : '#FFFFFF',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!expandedGroups.entities) {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
              }
            }}
            onMouseLeave={(e) => {
              if (!expandedGroups.entities) {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: '#DBEAFE',
                color: '#1E40AF',
              }}>
                エンティティ
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>
                {entities.length}件
              </span>
            </div>
            <span style={{ fontSize: '18px', color: '#6B7280' }}>
              {expandedGroups.entities ? '▼' : '▶'}
            </span>
          </div>
          {expandedGroups.entities && (
            <div style={{ borderTop: '1px solid #E5E7EB', padding: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {entities.map((result, index) => (
                  <SearchResultItem
                    key={`${result.type}-${result.id}-${index}`}
                    result={result}
                    index={index}
                    isSelected={selectedResult?.id === result.id}
                    onSelect={onSelectResult}
                    onFeedback={onFeedback}
                    feedbackRating={feedbackRatings[result.id]}
                    entityTypeLabels={entityTypeLabels}
                    relationTypeLabels={relationTypeLabels}
                    searchResults={results}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* リレーショングループ */}
      {relations.length > 0 && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
        }}>
          <div
            onClick={() => toggleGroup('relations')}
            style={{
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: expandedGroups.relations ? '#F3F4F6' : '#FFFFFF',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!expandedGroups.relations) {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
              }
            }}
            onMouseLeave={(e) => {
              if (!expandedGroups.relations) {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: '#E9D5FF',
                color: '#6B21A8',
              }}>
                リレーション
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>
                {relations.length}件
              </span>
            </div>
            <span style={{ fontSize: '18px', color: '#6B7280' }}>
              {expandedGroups.relations ? '▼' : '▶'}
            </span>
          </div>
          {expandedGroups.relations && (
            <div style={{ borderTop: '1px solid #E5E7EB', padding: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {relations.map((result, index) => (
                  <SearchResultItem
                    key={`${result.type}-${result.id}-${index}`}
                    result={result}
                    index={index}
                    isSelected={selectedResult?.id === result.id}
                    onSelect={onSelectResult}
                    onFeedback={onFeedback}
                    feedbackRating={feedbackRatings[result.id]}
                    entityTypeLabels={entityTypeLabels}
                    relationTypeLabels={relationTypeLabels}
                    searchResults={results}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* トピック（個別表示） */}
      {topics.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '8px',
            padding: '12px',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: '#FEF3C7',
                color: '#92400E',
              }}>
                トピック
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>
                {topics.length}件
              </span>
            </div>
            {totalTopicPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setTopicPage(prev => Math.max(1, prev - 1))}
                  disabled={topicPage === 1}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: topicPage === 1 ? '#9CA3AF' : '#FFFFFF',
                    backgroundColor: topicPage === 1 ? '#F3F4F6' : '#3B82F6',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: topicPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (topicPage !== 1) {
                      e.currentTarget.style.backgroundColor = '#2563EB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (topicPage !== 1) {
                      e.currentTarget.style.backgroundColor = '#3B82F6';
                    }
                  }}
                >
                  前へ
                </button>
                <span style={{ fontSize: '13px', color: '#6B7280', minWidth: '80px', textAlign: 'center' }}>
                  {topicPage} / {totalTopicPages}
                </span>
                <button
                  onClick={() => setTopicPage(prev => Math.min(totalTopicPages, prev + 1))}
                  disabled={topicPage === totalTopicPages}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: topicPage === totalTopicPages ? '#9CA3AF' : '#FFFFFF',
                    backgroundColor: topicPage === totalTopicPages ? '#F3F4F6' : '#3B82F6',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: topicPage === totalTopicPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (topicPage !== totalTopicPages) {
                      e.currentTarget.style.backgroundColor = '#2563EB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (topicPage !== totalTopicPages) {
                      e.currentTarget.style.backgroundColor = '#3B82F6';
                    }
                  }}
                >
                  次へ
                </button>
              </div>
            )}
          </div>
          {paginatedTopics.map((result, index) => (
            <SearchResultItem
              key={`${result.type}-${result.id}-${index}`}
              result={result}
              index={(topicPage - 1) * TOPICS_PER_PAGE + index}
              isSelected={selectedResult?.id === result.id}
              onSelect={onSelectResult}
              onFeedback={onFeedback}
              feedbackRating={feedbackRatings[result.id]}
              entityTypeLabels={entityTypeLabels}
              relationTypeLabels={relationTypeLabels}
              searchResults={results}
            />
          ))}
        </div>
      )}
    </div>
  );
}

