import React from 'react';
import type { ComparisonSectionType, ComparisonSection, ComparisonAxis } from './types';
import type { Startup } from '@/lib/orgApi';
import AxisRow from './AxisRow';
import SectionDescriptionEditor from './SectionDescriptionEditor';

interface ComparisonMatrixTableProps {
  section: ComparisonSection;
  sectionType: ComparisonSectionType;
  sectionLabel: string;
  currentStartup: Startup;
  selectedStartups: Startup[];
  editingSection: ComparisonSectionType | null;
  editingAxisId: string | null;
  editingAxisLabel: string;
  onEditLabel: (label: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartEdit: (axis: ComparisonAxis) => void;
  onDelete: (axisId: string) => void;
  onAddAxis: () => void;
  onDeleteAll: () => void;
  scoreSelectCell: { section: ComparisonSectionType; startupId: string; axisId: string } | null;
  badgeSelectCell: { section: ComparisonSectionType; startupId: string; axisId: string } | null;
  onScoreCellClick: (startupId: string, axisId: string) => void;
  onBadgeCellClick: (startupId: string, axisId: string) => void;
  onDescriptionChange: (description: string) => void;
  onOpenAIModal: (sectionType: ComparisonSectionType) => void;
  isAIGenerationModalOpen: boolean;
  aiGeneratedTarget: ComparisonSectionType | null;
  aiGeneratedContent: string | null;
  originalContent: string | null;
  onUndo: () => void;
  onKeep: () => void;
}

export default function ComparisonMatrixTable({
  section,
  sectionType,
  sectionLabel,
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
  onAddAxis,
  onDeleteAll,
  scoreSelectCell,
  badgeSelectCell,
  onScoreCellClick,
  onBadgeCellClick,
  onDescriptionChange,
  onOpenAIModal,
  isAIGenerationModalOpen,
  aiGeneratedTarget,
  aiGeneratedContent,
  originalContent,
  onUndo,
  onKeep,
}: ComparisonMatrixTableProps) {
  if (section.axes.length === 0) return null;

  return (
    <div style={{ 
      backgroundColor: '#FFFFFF', 
      borderRadius: '8px', 
      padding: '20px',
      border: '1px solid #E5E7EB',
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '2px solid #E5E7EB',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#374151', 
          margin: 0 
        }}>
          {sectionLabel}
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onAddAxis}
            style={{
              padding: '8px 16px',
              backgroundColor: '#FFFFFF',
              color: '#4262FF',
              border: '1.5px solid #4262FF',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#EFF6FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            + 比較軸を追加
          </button>
          <button
            onClick={onDeleteAll}
            style={{
              padding: '8px 16px',
              backgroundColor: '#FFFFFF',
              color: '#EF4444',
              border: '1.5px solid #EF4444',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FEF2F2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            🗑️ すべて削除
          </button>
        </div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr>
              <th style={{ 
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #E5E7EB',
                backgroundColor: '#F9FAFB',
                position: 'sticky',
                left: 0,
                zIndex: 10,
                minWidth: '200px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>
                比較軸
              </th>
              <th style={{ 
                padding: '12px',
                textAlign: 'center',
                borderBottom: '2px solid #E5E7EB',
                backgroundColor: '#F9FAFB',
                fontSize: '14px',
                fontWeight: '600',
                color: '#4262FF',
                minWidth: '150px'
              }}>
                {currentStartup.title}
              </th>
              {selectedStartups.map(s => (
                <th 
                  key={s.id}
                  style={{ 
                    padding: '12px',
                    textAlign: 'center',
                    borderBottom: '2px solid #E5E7EB',
                    backgroundColor: '#F9FAFB',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    minWidth: '150px'
                  }}
                >
                  {s.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.axes.map((axis) => (
              <AxisRow
                key={axis.id}
                section={section}
                sectionType={sectionType}
                axis={axis}
                currentStartup={currentStartup}
                selectedStartups={selectedStartups}
                editingSection={editingSection}
                editingAxisId={editingAxisId}
                editingAxisLabel={editingAxisLabel}
                onEditLabel={onEditLabel}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onStartEdit={() => onStartEdit(axis)}
                onDelete={() => onDelete(axis.id)}
                scoreSelectCell={scoreSelectCell}
                badgeSelectCell={badgeSelectCell}
                onScoreCellClick={(startupId) => onScoreCellClick(startupId, axis.id)}
                onBadgeCellClick={(startupId) => onBadgeCellClick(startupId, axis.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      <SectionDescriptionEditor
        description={section.description || ''}
        sectionLabel={sectionLabel}
        sectionType={sectionType}
        onSave={onDescriptionChange}
        onOpenAIModal={onOpenAIModal}
        isAIGenerationModalOpen={isAIGenerationModalOpen}
        aiGeneratedTarget={aiGeneratedTarget}
        aiGeneratedContent={aiGeneratedContent}
        originalContent={originalContent}
        onUndo={onUndo}
        onKeep={onKeep}
      />
    </div>
  );
}

