import React from 'react';
import type { ComparisonSectionType, ComparisonAxis, ComparisonSection } from './types';
import type { Startup } from '@/lib/orgApi';
import ScoreCell from './ScoreCell';
import BadgeCell from './BadgeCell';

interface AxisRowProps {
  section: ComparisonSection;
  sectionType: ComparisonSectionType;
  axis: ComparisonAxis;
  currentStartup: Startup;
  selectedStartups: Startup[];
  editingSection: ComparisonSectionType | null;
  editingAxisId: string | null;
  editingAxisLabel: string;
  onEditLabel: (label: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  scoreSelectCell: { section: ComparisonSectionType; startupId: string; axisId: string } | null;
  badgeSelectCell: { section: ComparisonSectionType; startupId: string; axisId: string } | null;
  onScoreCellClick: (startupId: string) => void;
  onBadgeCellClick: (startupId: string) => void;
}

export default function AxisRow({
  section,
  sectionType,
  axis,
  currentStartup,
  selectedStartups,
  editingSection,
  editingAxisId,
  editingAxisLabel,
  onEditLabel,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onDelete,
  scoreSelectCell,
  badgeSelectCell,
  onScoreCellClick,
  onBadgeCellClick,
}: AxisRowProps) {
  const isEditing = editingSection === sectionType && editingAxisId === axis.id;

  return (
    <tr 
      style={{ position: 'relative' }}
      onMouseEnter={(e) => {
        const buttons = e.currentTarget.querySelectorAll('[data-action-button]');
        buttons.forEach((btn: any) => {
          btn.style.opacity = '1';
          btn.style.visibility = 'visible';
          btn.style.pointerEvents = 'auto';
        });
      }}
      onMouseLeave={(e) => {
        const buttons = e.currentTarget.querySelectorAll('[data-action-button]');
        buttons.forEach((btn: any) => {
          if (!isEditing) {
            btn.style.opacity = '0';
            btn.style.visibility = 'hidden';
            btn.style.pointerEvents = 'none';
          }
        });
      }}
    >
      <td style={{ 
        padding: '12px',
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: '#FFFFFF',
        position: 'sticky',
        left: 0,
        zIndex: 5,
        fontSize: '14px',
        fontWeight: '500',
        color: '#374151'
      }}>
        {isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              value={editingAxisLabel}
              onChange={(e) => onEditLabel(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  onSaveEdit();
                } else if (e.key === 'Escape') {
                  onCancelEdit();
                }
              }}
              autoFocus
              style={{
                flex: 1,
                padding: '6px 10px',
                border: '1.5px solid #4262FF',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              onClick={onSaveEdit}
              style={{
                padding: '4px 8px',
                backgroundColor: '#4262FF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
              title="保存"
            >
              ✓
            </button>
            <button
              onClick={onCancelEdit}
              style={{
                padding: '4px 8px',
                backgroundColor: '#F3F4F6',
                color: '#374151',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
              title="キャンセル"
            >
              ×
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <span style={{ flex: 1 }}>{axis.label}</span>
            <button
              data-action-button
              onClick={onStartEdit}
              style={{
                padding: '4px 8px',
                backgroundColor: 'transparent',
                color: '#6B7280',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                opacity: 0,
                visibility: 'hidden',
                pointerEvents: 'none',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="編集"
            >
              ✏️
            </button>
            <button
              data-action-button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              style={{
                padding: '4px 8px',
                backgroundColor: 'transparent',
                color: '#EF4444',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                opacity: 0,
                visibility: 'hidden',
                pointerEvents: 'none',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FEF2F2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="削除"
            >
              🗑️
            </button>
          </div>
        )}
      </td>
      {/* 現在のスタートアップのセル */}
      <td style={{ 
        padding: '8px',
        textAlign: 'center',
        borderBottom: '1px solid #E5E7EB',
        position: 'relative',
      }}>
        {sectionType === 'target' ? (
          <BadgeCell
            section={sectionType}
            startup={currentStartup}
            axisId={axis.id}
            selectedBadges={Array.isArray(section.matrix[currentStartup.id]?.[axis.id]) 
              ? (section.matrix[currentStartup.id]?.[axis.id] as string[])
              : []}
            isSelected={badgeSelectCell?.section === sectionType && 
                       badgeSelectCell?.startupId === currentStartup.id && 
                       badgeSelectCell?.axisId === axis.id}
            onClick={() => onBadgeCellClick(currentStartup.id)}
          />
        ) : (
          <ScoreCell
            section={sectionType}
            startup={currentStartup}
            axisId={axis.id}
            score={typeof section.matrix[currentStartup.id]?.[axis.id] === 'number'
              ? (section.matrix[currentStartup.id]?.[axis.id] as number)
              : 5}
            isSelected={scoreSelectCell?.section === sectionType && 
                       scoreSelectCell?.startupId === currentStartup.id && 
                       scoreSelectCell?.axisId === axis.id}
            onClick={() => onScoreCellClick(currentStartup.id)}
          />
        )}
      </td>
      {/* 選択されたスタートアップのセル */}
      {selectedStartups.map(s => (
        <td 
          key={s.id}
          style={{ 
            padding: '8px',
            textAlign: 'center',
            borderBottom: '1px solid #E5E7EB',
            position: 'relative',
          }}
        >
          {sectionType === 'target' ? (
            <BadgeCell
              section={sectionType}
              startup={s}
              axisId={axis.id}
              selectedBadges={Array.isArray(section.matrix[s.id]?.[axis.id]) 
                ? (section.matrix[s.id]?.[axis.id] as string[])
                : []}
              isSelected={badgeSelectCell?.section === sectionType && 
                         badgeSelectCell?.startupId === s.id && 
                         badgeSelectCell?.axisId === axis.id}
              onClick={() => onBadgeCellClick(s.id)}
            />
          ) : (
            <ScoreCell
              section={sectionType}
              startup={s}
              axisId={axis.id}
              score={typeof section.matrix[s.id]?.[axis.id] === 'number'
                ? (section.matrix[s.id]?.[axis.id] as number)
                : undefined}
              isSelected={scoreSelectCell?.section === sectionType && 
                         scoreSelectCell?.startupId === s.id && 
                         scoreSelectCell?.axisId === axis.id}
              onClick={() => onScoreCellClick(s.id)}
            />
          )}
        </td>
      ))}
    </tr>
  );
}

