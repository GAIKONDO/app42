import React from 'react';
import type { ComparisonSectionType, ComparisonAxis } from './types';
import type { Startup } from '@/lib/orgApi';
import { getScoreColor } from './utils';

interface ScoreSelectModalProps {
  isOpen: boolean;
  section: ComparisonSectionType;
  startup: Startup;
  axis: ComparisonAxis;
  currentScore: number | undefined;
  onSelect: (score: number) => void;
  onClose: () => void;
}

export default function ScoreSelectModal({
  isOpen,
  section,
  startup,
  axis,
  currentScore,
  onSelect,
  onClose,
}: ScoreSelectModalProps) {
  if (!isOpen) return null;

  const score = typeof currentScore === 'number' && currentScore !== undefined 
    ? currentScore 
    : undefined;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          zIndex: 10001,
          padding: '24px',
          minWidth: '400px',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          const key = e.key;
          if (key >= '0' && key <= '5') {
            const point = parseInt(key);
            onSelect(point);
            onClose();
          } else if (key === 'Escape') {
            onClose();
          }
        }}
        tabIndex={0}
      >
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '4px',
          }}>
            点数を選択
          </h4>
          <p style={{
            margin: 0,
            fontSize: '12px',
            color: '#6B7280',
          }}>
            {axis.label} - {startup.title}
          </p>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '16px',
        }}>
          {[0, 1, 2, 3, 4, 5].map((point) => {
            const pointColors = getScoreColor(point);
            const isCurrentScore = score === point;
            return (
              <button
                key={point}
                onClick={() => {
                  onSelect(point);
                  onClose();
                }}
                style={{
                  padding: '16px',
                  border: `2px solid ${isCurrentScore ? '#4262FF' : pointColors.border}`,
                  borderRadius: '12px',
                  backgroundColor: isCurrentScore ? '#EFF6FF' : pointColors.bg,
                  color: pointColors.text,
                  fontSize: '18px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: point === 0 ? 0.6 : 1,
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  lineHeight: 1,
                }}>
                  {point}
                </div>
                <div style={{
                  fontSize: '11px',
                  fontWeight: '500',
                  opacity: 0.8,
                }}>
                  点
                </div>
                {isCurrentScore && (
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#4262FF',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '12px',
                  }}>
                    ✓
                  </div>
                )}
              </button>
            );
          })}
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '16px',
          borderTop: '1px solid #E5E7EB',
        }}>
          <p style={{
            margin: 0,
            fontSize: '11px',
            color: '#9CA3AF',
          }}>
            キーボードの0-5キーでも選択できます
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E5E7EB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
          >
            キャンセル
          </button>
        </div>
      </div>
    </>
  );
}

