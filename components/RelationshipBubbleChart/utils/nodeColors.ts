// SaaS × 戦略UI向けカラーパレット（組織ページのバブルチャートと同じ）
const PROFESSIONAL_COLORS = {
  division: '#0F172A',      // テーマ（最外円）- 経営レイヤー
  department: '#1E40AF',   // Biz-Devフェーズ（大きい青円）- 事業単位
  section: '#10B981',       // スタートアップ（中の緑円）- 実務単位
  member: '#94A3B8',        // サブ情報（人数・補足）
};

// 深さに応じた色を取得（組織ページのバブルチャートと同じカラーパレット）
export const getColorByDepth = (depth: number, nodeType: string): string => {
  // 深さベースで色を決定（組織ページと同じロジック）
  switch (depth) {
    case 1: // テーマ（Division相当）
      return PROFESSIONAL_COLORS.division; // #0F172A
    case 2: // Biz-Devフェーズ（Department相当）
      return PROFESSIONAL_COLORS.department; // #1E40AF
    case 3: // スタートアップ（Section相当）
      return PROFESSIONAL_COLORS.section; // #10B981
    default:
      // その他の深さ（注力施策、トピックなど）は深さに応じて決定
      if (depth > 3) {
        return PROFESSIONAL_COLORS.section; // #10B981
      }
      return PROFESSIONAL_COLORS.division; // #0F172A
  }
};

