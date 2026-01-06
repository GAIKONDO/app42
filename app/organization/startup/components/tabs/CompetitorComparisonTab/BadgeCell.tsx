import React from 'react';
import type { ComparisonSectionType } from './types';
import type { Startup } from '@/lib/orgApi';

interface BadgeCellProps {
  section: ComparisonSectionType;
  startup: Startup;
  axisId: string;
  selectedBadges: string[];
  isSelected: boolean;
  onClick: () => void;
}

// バッジの色を決定する関数（カラフルすぎない青系の色）
const getBadgeColor = (badgeText: string): string => {
  // 青系の色のパレット（少しずつ色が変わる）
  const colorPalette = [
    '#4262FF', // 元の青
    '#3B82F6', // 少し明るい青
    '#2563EB', // 標準的な青
    '#1D4ED8', // 少し濃い青
    '#1E40AF', // 濃い青
    '#1E3A8A', // より濃い青
    '#6366F1', // インディゴ寄りの青
    '#4F46E5', // インディゴ
    '#5B21B6', // 紫寄りの青
    '#4338CA', // 紫がかった青
  ];
  
  // バッジのテキストからハッシュ値を生成
  let hash = 0;
  for (let i = 0; i < badgeText.length; i++) {
    hash = badgeText.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // ハッシュ値から色を選択
  const colorIndex = Math.abs(hash) % colorPalette.length;
  return colorPalette[colorIndex];
};

export default function BadgeCell({
  section,
  startup,
  axisId,
  selectedBadges,
  isSelected,
  onClick,
}: BadgeCellProps) {
  return (
    <div
      onClick={onClick}
      style={{
        minHeight: '40px',
        padding: '8px',
        margin: '0 auto',
        border: `2px solid ${isSelected ? '#4262FF' : '#E5E7EB'}`,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        justifyContent: selectedBadges.length === 0 ? 'center' : 'flex-start',
        alignItems: 'center',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#4262FF';
        e.currentTarget.style.backgroundColor = '#F9FAFB';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#E5E7EB';
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {selectedBadges.length > 0 ? (
        selectedBadges.map((badge, idx) => {
          const badgeColor = getBadgeColor(badge);
          return (
            <span
              key={idx}
              style={{
                padding: '4px 8px',
                backgroundColor: badgeColor,
                color: '#FFFFFF',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500',
                display: 'inline-block',
              }}
            >
              {badge}
            </span>
          );
        })
      ) : (
        <span style={{ color: '#9CA3AF', fontSize: '12px' }}>バッジを選択</span>
      )}
    </div>
  );
}

