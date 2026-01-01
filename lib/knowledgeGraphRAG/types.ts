/**
 * ナレッジグラフRAG検索の型定義
 */

import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';

/**
 * 検索結果の種類
 */
export type SearchResultType = 'entity' | 'relation' | 'topic' | 'startup' | 'focusInitiative' | 'meetingNote' | 'regulation';

/**
 * トピックファイル情報
 */
export interface TopicFileInfo {
  id: string;
  filePath: string;
  fileName: string;
  mimeType?: string;
  description?: string;
  detailedDescription?: string;
  fileSize?: number;
}

/**
 * トピックサマリー（RAG検索結果用）
 */
export interface TopicSummary {
  topicId: string;
  title: string;
  contentSummary?: string; // contentの要約（200文字程度）
  semanticCategory?: string;
  keywords?: string[];
  meetingNoteId?: string;
  regulationId?: string;
  organizationId?: string;
  files?: TopicFileInfo[]; // トピックに紐づくファイル情報
}

/**
 * 統合検索結果
 */
export interface KnowledgeGraphSearchResult {
  type: SearchResultType;
  id: string;
  score: number;
  similarity: number;
  // エンティティの場合
  entity?: Entity;
  // リレーションの場合
  relation?: Relation;
  // トピックの場合
  topicId?: string;
  meetingNoteId?: string;
  topic?: TopicSummary; // トピックの詳細情報（title, contentSummaryなど）
  // スタートアップの場合
  startupId?: string;
  startup?: {
    id: string;
    title: string;
    description?: string;
    content?: string;
    objective?: string;
    evaluation?: string;
  };
  // 注力施策の場合
  focusInitiativeId?: string;
  focusInitiative?: {
    id: string;
    title: string;
    description?: string;
    content?: string;
  };
  // 議事録の場合
  meetingNote?: {
    id: string;
    title: string;
    description?: string;
    content?: string;
  };
  // 制度の場合
  regulationId?: string;
  regulation?: {
    id: string;
    title: string;
    description?: string;
    content?: string;
  };
}

/**
 * 検索フィルター
 */
export interface SearchFilters {
  organizationId?: string;
  entityType?: string;
  relationType?: string;
  topicSemanticCategory?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  filterLogic?: 'AND' | 'OR';
}

/**
 * 検索結果とコンテキスト文字列のペア
 */
export interface KnowledgeGraphContextResult {
  context: string;
  results: KnowledgeGraphSearchResult[];
  sources: Array<{
    type: 'entity' | 'relation' | 'topic' | 'startup' | 'focusInitiative' | 'meetingNote' | 'regulation';
    id: string;
    name: string;
    score: number;
  }>;
}

