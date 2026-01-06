'use client';

import React from 'react';
import type { CategorySectionProps } from './types';
import StartupCard from './StartupCard';

export default function CategorySection({ category, startups, level, parentTitle, bizDevPhases, statuses }: CategorySectionProps) {
  const categoryTitle = parentTitle ? `${parentTitle} / ${category.title}` : category.title;
  
  return (
    <div style={{
      marginBottom: '32px',
      padding: '24px',
      backgroundColor: '#FFFFFF',
      border: level === 0 ? '2px solid #3B82F6' : '1px solid #E5E7EB',
      borderRadius: '16px',
      boxShadow: level === 0 
        ? '0 4px 12px rgba(59, 130, 246, 0.1)' 
        : '0 2px 8px rgba(0, 0, 0, 0.04)',
      transition: 'all 0.2s ease',
    }}
    onMouseEnter={(e) => {
      if (level === 0) {
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.15)';
      } else {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
      }
    }}
    onMouseLeave={(e) => {
      if (level === 0) {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)';
      } else {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
      }
    }}
    >
      {/* カテゴリーヘッダー */}
      <div style={{
        marginBottom: '20px',
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
              fontSize: level === 0 ? '24px' : '20px',
              fontWeight: level === 0 ? '700' : '600',
              color: '#1A1A1A',
              margin: 0,
              marginBottom: '8px',
              lineHeight: '1.3',
            }}>
              {categoryTitle}
            </h3>
            {category.description && (
              <p style={{
                fontSize: '14px',
                color: '#6B7280',
                margin: 0,
                lineHeight: '1.5',
              }}>
                {category.description}
              </p>
            )}
          </div>
          <div style={{
            padding: '8px 16px',
            backgroundColor: level === 0 ? '#EFF6FF' : '#F3F4F6',
            color: level === 0 ? '#1E40AF' : '#374151',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
          }}>
            {startups.length}件
          </div>
        </div>
      </div>
      
      {/* スタートアップグリッド */}
      {startups.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
            ? '1fr' 
            : 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '16px',
        }}>
          {startups.map(startup => (
            <StartupCard 
              key={startup.id} 
              startup={startup}
              bizDevPhases={bizDevPhases}
              statuses={statuses}
            />
          ))}
        </div>
      ) : (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#9CA3AF',
          fontSize: '14px',
        }}>
          このカテゴリーにスタートアップはありません
        </div>
      )}
    </div>
  );
}

