'use client';

import React from 'react';
import type { ParentCategorySectionProps } from './types';
import StartupCard from './StartupCard';

export default function ParentCategorySection({ 
  parent, 
  parentStartups, 
  children, 
  startupsByCategory,
  bizDevPhases, 
  statuses 
}: ParentCategorySectionProps) {
  const totalStartups = children.reduce((sum, child) => sum + (startupsByCategory[child.id] || []).length, 0);
  
  return (
    <div style={{
      marginBottom: '32px',
      padding: '24px',
      backgroundColor: '#FFFFFF',
      border: '2px solid #3B82F6',
      borderRadius: '16px',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)',
      transition: 'all 0.2s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)';
    }}
    >
      {/* 親カテゴリーヘッダー */}
      <div style={{
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '2px solid #F3F4F6',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1A1A1A',
              margin: 0,
              marginBottom: '8px',
              lineHeight: '1.3',
            }}>
              {parent.title}
            </h3>
            {parent.description && (
              <p style={{
                fontSize: '14px',
                color: '#6B7280',
                margin: 0,
                lineHeight: '1.5',
              }}>
                {parent.description}
              </p>
            )}
          </div>
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#EFF6FF',
            color: '#1E40AF',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
          }}>
            {totalStartups}件
          </div>
        </div>
      </div>
      
      {/* サブカテゴリーをネスト表示 */}
      {children.map(child => {
        const childStartups = startupsByCategory[child.id] || [];
        if (childStartups.length === 0) return null;
        
        return (
          <div key={child.id} style={{
            marginTop: '24px',
            padding: '20px',
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
          }}>
            {/* サブカテゴリーヘッダー */}
            <div style={{
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid #E5E7EB',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '12px',
              }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1A1A1A',
                    margin: 0,
                    marginBottom: '4px',
                  }}>
                    {child.title}
                  </h4>
                  {child.description && (
                    <p style={{
                      fontSize: '13px',
                      color: '#6B7280',
                      margin: 0,
                    }}>
                      {child.description}
                    </p>
                  )}
                </div>
                <div style={{
                  padding: '6px 12px',
                  backgroundColor: '#E5E7EB',
                  color: '#374151',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                }}>
                  {childStartups.length}件
                </div>
              </div>
            </div>
            
            {/* サブカテゴリーのスタートアップ */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
                ? '1fr' 
                : 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '12px',
            }}>
              {childStartups.map(startup => (
                <StartupCard 
                  key={startup.id} 
                  startup={startup}
                  bizDevPhases={bizDevPhases}
                  statuses={statuses}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

