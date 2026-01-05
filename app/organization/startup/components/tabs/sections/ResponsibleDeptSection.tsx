'use client';

import React from 'react';
import type { Department } from '@/lib/orgApi';

interface ResponsibleDeptSectionProps {
  localResponsibleDepts: string[];
  setLocalResponsibleDepts: (depts: string[]) => void;
  departments: Department[];
}

export default function ResponsibleDeptSection({
  localResponsibleDepts,
  setLocalResponsibleDepts,
  departments,
}: ResponsibleDeptSectionProps) {
  const handleDeptToggle = (deptId: string) => {
    console.log('🔍 [ResponsibleDeptSection] handleDeptToggle:', {
      deptId,
      currentLocalResponsibleDepts: localResponsibleDepts,
      isSelected: localResponsibleDepts.includes(deptId),
    });
    
    const newDeptIds = localResponsibleDepts.includes(deptId)
      ? localResponsibleDepts.filter(d => d !== deptId)
      : [...localResponsibleDepts, deptId];
    
    console.log('🔍 [ResponsibleDeptSection] newDeptIds:', newDeptIds);
    
    setLocalResponsibleDepts(newDeptIds);
  };

  return (
    <div style={{ marginBottom: '28px' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '8px', 
        fontWeight: '600', 
        color: '#1A1A1A',
        fontSize: '14px',
        fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <span style={{ 
          display: 'inline-block',
          width: '24px',
          height: '24px',
          lineHeight: '24px',
          textAlign: 'center',
          backgroundColor: '#4262FF',
          color: '#FFFFFF',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '700',
          marginRight: '8px',
          verticalAlign: 'middle',
        }}>7</span>
        主管事業部署
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {departments.length === 0 ? (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#F9FAFB', 
            borderRadius: '8px', 
            border: '1px solid #E5E7EB',
            color: '#6B7280', 
            fontSize: '14px',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            部署が登録されていません。分析ページの機能3で部署を追加してください。
          </div>
        ) : (
          departments.map((dept) => {
            const isSelected = localResponsibleDepts.includes(dept.id);
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => handleDeptToggle(dept.id)}
                style={{
                  padding: '10px 18px',
                  border: `1.5px solid ${isSelected ? '#4262FF' : '#E5E7EB'}`,
                  borderRadius: '8px',
                  backgroundColor: isSelected ? '#F0F4FF' : '#FFFFFF',
                  color: isSelected ? '#4262FF' : '#374151',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: isSelected ? '600' : '500',
                  transition: 'all 0.2s ease',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isSelected ? '0 1px 3px rgba(66, 98, 255, 0.2)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                    e.currentTarget.style.borderColor = '#D1D5DB';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                  } else {
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(66, 98, 255, 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.boxShadow = 'none';
                  } else {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(66, 98, 255, 0.2)';
                  }
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = 'none';
                  e.currentTarget.style.borderColor = '#4262FF';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 98, 255, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = isSelected ? '0 1px 3px rgba(66, 98, 255, 0.2)' : 'none';
                }}
              >
                {isSelected && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    style={{ flexShrink: 0 }}
                  >
                    <path
                      d="M13 4L6 11L3 8"
                      stroke="#4262FF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                <span>{dept.title}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

