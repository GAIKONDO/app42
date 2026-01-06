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
        selectedBadges.map((badge, idx) => (
          <span
            key={idx}
            style={{
              padding: '4px 8px',
              backgroundColor: '#4262FF',
              color: '#FFFFFF',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500',
              display: 'inline-block',
            }}
          >
            {badge}
          </span>
        ))
      ) : (
        <span style={{ color: '#9CA3AF', fontSize: '12px' }}>バッジを選択</span>
      )}
    </div>
  );
}

