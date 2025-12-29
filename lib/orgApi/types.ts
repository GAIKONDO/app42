import type { OrgNodeData, MemberInfo } from '@/components/OrgChart';
import type { TopicSemanticCategory } from '@/types/topicMetadata';

// OrgNodeDataとMemberInfoを再エクスポート
export type { OrgNodeData, MemberInfo };

/**
 * 組織コンテンツの型定義
 */
export interface OrganizationContent {
  organizationId: string;
  introduction?: string; // 組織紹介
  focusAreas?: string; // 注力領域
  meetingNotes?: string; // 議事録アーカイブ
  createdAt?: any;
  updatedAt?: any;
}

/**
 * テーマの型定義
 */
export interface Theme {
  id: string;
  title: string;
  description?: string;
  initiativeIds?: string[]; // 関連する注力施策のIDリスト
  position?: number; // 表示順序
  createdAt?: any;
  updatedAt?: any;
}

/**
 * カテゴリーの型定義
 */
export interface Category {
  id: string;
  title: string;
  description?: string;
  parentCategoryId?: string; // 親カテゴリーID（サブカテゴリーの場合）
  position?: number; // 表示順序
  createdAt?: any;
  updatedAt?: any;
}

/**
 * VC（ベンチャーキャピタル）の型定義
 */
export interface VC {
  id: string;
  title: string;
  description?: string;
  position?: number; // 表示順序
  createdAt?: any;
  updatedAt?: any;
}

/**
 * 部署の型定義
 */
export interface Department {
  id: string;
  title: string;
  description?: string;
  position?: number; // 表示順序
  createdAt?: any;
  updatedAt?: any;
}

/**
 * ステータスの型定義
 */
export interface Status {
  id: string;
  title: string;
  description?: string;
  position?: number; // 表示順序
  createdAt?: any;
  updatedAt?: any;
}

/**
 * ねじ込み注力度の型定義
 */
export interface EngagementLevel {
  id: string;
  title: string;
  description?: string;
  position?: number; // 表示順序
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Biz-Devフェーズの型定義
 */
export interface BizDevPhase {
  id: string;
  title: string;
  description?: string;
  position?: number; // 表示順序
  createdAt?: any;
  updatedAt?: any;
}

/**
 * 注力施策の型定義
 */
export interface FocusInitiative {
  id: string;
  organizationId?: string;
  companyId?: string;
  title: string;
  description?: string;
  content?: string; // 詳細コンテンツ（マークダウン）
  assignee?: string; // 担当者
  method?: string[]; // 手法（複数選択可能）
  methodOther?: string; // 手法（その他）
  methodDetails?: Record<string, any>; // 手法の詳細情報（各手法ごとのテーブルデータ）
  means?: string[]; // 手段（複数選択可能）
  meansOther?: string; // 手段（その他）
  objective?: string; // 目標
  considerationPeriod?: string; // 検討期間
  executionPeriod?: string; // 実行期間
  monetizationPeriod?: string; // 収益化期間
  relatedOrganizations?: string[]; // 関連組織
  relatedGroupCompanies?: string[]; // 関連グループ会社
  monetizationDiagram?: string; // マネタイズ図（Mermaid図）
  monetizationDiagramId?: string; // マネタイズ図のユニークID
  relationDiagram?: string; // 相関図（Mermaid図）
  relationDiagramId?: string; // 相関図のユニークID
  causeEffectDiagramId?: string; // 特性要因図のユニークID
  themeId?: string; // 関連するテーマID（後方互換性のため残す）
  themeIds?: string[]; // 関連するテーマIDの配列（複数のテーマにリンク可能）
  topicIds?: string[]; // 関連する個別トピックIDの配列（複数のトピックにリンク可能）
  createdAt?: any;
  updatedAt?: any;
}

/**
 * 議事録の型定義
 */
export interface MeetingNote {
  id: string;
  organizationId: string;
  companyId?: string; // 事業会社ID（事業会社の議事録の場合）
  title: string;
  description?: string;
  content?: string; // 詳細コンテンツ（マークダウン）
  createdAt?: any;
  updatedAt?: any;
}

/**
 * 制度の型定義
 */
export interface Regulation {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  content?: string; // 詳細コンテンツ（今後追加予定）
  createdAt?: any;
  updatedAt?: any;
}

/**
 * 評価チャート関連の型定義
 */
export interface EvaluationAxis {
  id: string;
  label: string;
  priority: '高' | '中' | '低';
  weight: number;
  score: number; // 0-5
  maxValue: number; // 通常は5
  basis?: string; // 比較の根拠
}

export interface EvaluationChartData {
  axes: EvaluationAxis[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EvaluationChartSnapshot {
  id: string;
  name: string;
  date: string;
  data: EvaluationChartData;
}

/**
 * スタートアップの型定義
 */
export interface Startup {
  id: string;
  organizationId?: string;
  companyId?: string;
  title: string;
  description?: string;
  content?: string; // 詳細コンテンツ（マークダウン）
  assignee?: string; // 担当者
  method?: string[]; // 手法（複数選択可能）
  methodOther?: string; // 手法（その他）
  methodDetails?: Record<string, any>; // 手法の詳細情報（各手法ごとのテーブルデータ）
  means?: string[]; // 手段（複数選択可能）
  meansOther?: string; // 手段（その他）
  objective?: string; // 目標
  evaluation?: string; // 評価
  evaluationChart?: EvaluationChartData; // 評価チャートデータ
  evaluationChartSnapshots?: EvaluationChartSnapshot[]; // 評価チャートのスナップショット
  considerationPeriod?: string; // 検討期間
  executionPeriod?: string; // 実行期間
  monetizationPeriod?: string; // 収益化期間
  relatedOrganizations?: string[]; // 関連組織
  relatedGroupCompanies?: string[]; // 関連グループ会社
  monetizationDiagram?: string; // マネタイズ図（Mermaid図）
  monetizationDiagramId?: string; // マネタイズ図のユニークID
  relationDiagram?: string; // 相関図（Mermaid図）
  relationDiagramId?: string; // 相関図のユニークID
  causeEffectDiagramId?: string; // 特性要因図のユニークID
  themeId?: string; // 関連するテーマID（後方互換性のため残す）
  themeIds?: string[]; // 関連するテーマIDの配列（複数のテーマにリンク可能）
  topicIds?: string[]; // 関連する個別トピックIDの配列（複数のトピックにリンク可能）
  categoryIds?: string[]; // 関連するカテゴリーIDの配列（複数選択可能）
  relatedVCS?: string[]; // 関連VCの配列（複数選択可能）
  responsibleDepartments?: string[]; // 主管事業部署の配列（複数選択可能）
  status?: string; // ステータスID
  agencyContractMonth?: string; // 代理店契約締結月
  engagementLevel?: string; // ねじ込み注力度ID
  bizDevPhase?: string; // Biz-DevフェーズID
  hpUrl?: string; // HP URL
  asanaUrl?: string; // Asana URL
  boxUrl?: string; // Box URL
  createdAt?: any;
  updatedAt?: any;
}

/**
 * すべての個別トピックを取得
 * すべての議事録から個別トピックを抽出して返す
 */
export interface TopicInfo {
  id: string;
  title: string;
  content: string;
  meetingNoteId: string;
  meetingNoteTitle: string;
  itemId: string;
  organizationId: string;
  companyId?: string; // 事業会社ID（事業会社の議事録の場合）
  topicDate?: string | null; // トピックの日時（isAllPeriodsがtrueの場合は無視される）
  isAllPeriods?: boolean; // 全期間に反映するかどうか（trueの場合は日付に関係なく全期間に表示）
  createdAt?: string; // 作成日時（topicsテーブルから取得）
  updatedAt?: string; // 更新日時（topicsテーブルから取得）
  // メタデータ
  semanticCategory?: TopicSemanticCategory;
  importance?: 'high' | 'medium' | 'low';
  keywords?: string[];
  summary?: string;
}

