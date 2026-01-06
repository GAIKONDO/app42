import type { Startup, Category } from '@/lib/orgApi';

export interface ComparisonAxis {
  id: string;
  label: string;
  isEditing?: boolean;
  options?: string[]; // ターゲット層セクションの場合、バッジの選択肢
}

export interface ComparisonMatrix {
  [startupId: string]: {
    [axisId: string]: number; // 0-5の点数（一般・機能セクション用）
  };
}

export type ComparisonSectionType = 'general' | 'function' | 'target';

export interface ComparisonSection {
  axes: ComparisonAxis[];
  matrix: {
    [startupId: string]: {
      [axisId: string]: number | string[]; // 点数（0-5）またはバッジの配列
    };
  };
  description?: string; // マークダウン形式の解説文
}

export interface ComparisonSections {
  general: ComparisonSection;
  function: ComparisonSection;
  target: ComparisonSection;
}

export interface CompetitorComparisonTabProps {
  startup: Startup | null;
  organizationId: string;
  setStartup?: (startup: Startup) => void;
}

