import React from 'react';
import type { ComparisonSectionType, ComparisonAxis } from './types';
import type { Startup } from '@/lib/orgApi';

interface BadgeSelectModalProps {
  isOpen: boolean;
  section: ComparisonSectionType;
  startup: Startup;
  axis: ComparisonAxis;
  selectedBadges: string[];
  onSelect: (badges: string[]) => void;
  onClose: () => void;
  onEditOptions: () => void;
}

export default function BadgeSelectModal({
  isOpen,
  section,
  startup,
  axis,
  selectedBadges,
  onSelect,
  onClose,
  onEditOptions,
}: BadgeSelectModalProps) {
  if (!isOpen) return null;
  
  // 選択肢がない場合は、選択肢を編集するモーダルに誘導
  if (!axis.options || axis.options.length === 0) {
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
            minWidth: '500px',
            maxWidth: '600px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '4px',
            }}>
              選択肢が設定されていません
            </h4>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#6B7280',
            }}>
              {axis.label} - {startup.title}
            </p>
          </div>
          <p style={{
            margin: 0,
            marginBottom: '24px',
            fontSize: '14px',
            color: '#6B7280',
          }}>
            バッジを選択するには、まず選択肢を設定してください。
          </p>
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}>
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
              }}
            >
              キャンセル
            </button>
            <button
              onClick={() => {
                onEditOptions();
                onClose();
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4262FF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              選択肢を設定
            </button>
          </div>
        </div>
      </>
    );
  }

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
          minWidth: '500px',
          maxWidth: '600px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '4px',
          }}>
            バッジを選択
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
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '16px',
          maxHeight: '300px',
          overflowY: 'auto',
        }}>
          {axis.options.map((option) => {
            const isSelected = selectedBadges.includes(option);
            return (
              <button
                key={option}
                onClick={() => {
                  const newBadges = isSelected
                    ? selectedBadges.filter(b => b !== option)
                    : [...selectedBadges, option];
                  onSelect(newBadges);
                }}
                style={{
                  padding: '8px 16px',
                  border: `2px solid ${isSelected ? '#4262FF' : '#E5E7EB'}`,
                  borderRadius: '12px',
                  backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                  color: isSelected ? '#4262FF' : '#374151',
                  fontSize: '14px',
                  fontWeight: isSelected ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#4262FF';
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }
                }}
              >
                {option}
                {isSelected && ' ✓'}
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
          <button
            onClick={() => {
              onEditOptions();
              onClose();
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            選択肢を編集
          </button>
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
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </>
  );
}

