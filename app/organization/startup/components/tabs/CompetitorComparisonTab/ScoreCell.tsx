import React from 'react';
import type { ComparisonSectionType } from './types';
import type { Startup } from '@/lib/orgApi';
import { getScoreColor } from './utils';

interface ScoreCellProps {
  section: ComparisonSectionType;
  startup: Startup;
  axisId: string;
  score: number | undefined;
  isSelected: boolean;
  onClick: () => void;
}

export default function ScoreCell({
  section,
  startup,
  axisId,
  score,
  isSelected,
  onClick,
}: ScoreCellProps) {
  const colors = getScoreColor(score);

  return (
    <div
      onClick={onClick}
      style={{
        width: '40px',
        height: '40px',
        margin: '0 auto',
        backgroundColor: colors.bg,
        border: `2px solid ${isSelected ? '#4262FF' : colors.border}`,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.text,
        fontSize: '16px',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        opacity: score === 0 || score === undefined ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {score !== undefined && score !== null ? score : '-'}
    </div>
  );
}

