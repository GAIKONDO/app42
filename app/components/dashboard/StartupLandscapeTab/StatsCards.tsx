'use client';

import React from 'react';
import type { StatsCardsProps } from './types';

export default function StatsCards({
  parentCategoriesCount,
  subCategoriesCount,
  totalStartups,
  filteredStartupsCount,
  favoriteStartupsCount,
  hasFilters,
}: StatsCardsProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '20px',
      marginBottom: '32px',
    }}>
      {/* カテゴリー数 */}
      <div style={{
        padding: '24px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60px',
          height: '60px',
          background: 'linear-gradient(135deg, #F0F4FF 0%, #E0E8FF 100%)',
          borderRadius: '0 12px 0 60px',
          opacity: 0.5,
        }} />
        <div style={{
          fontSize: '13px',
          color: '#6B7280',
          marginBottom: '12px',
          fontWeight: '500',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          position: 'relative',
          zIndex: 1,
        }}>
          カテゴリー数
        </div>
        <div style={{
          fontSize: '40px',
          fontWeight: '700',
          color: '#1A1A1A',
          lineHeight: '1',
          marginBottom: '4px',
          position: 'relative',
          zIndex: 1,
          fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
        }}>
          {parentCategoriesCount}
        </div>
        <div style={{
          fontSize: '13px',
          color: '#9CA3AF',
          fontWeight: '400',
          position: 'relative',
          zIndex: 1,
        }}>
          件のカテゴリー
        </div>
      </div>

      {/* サブカテゴリー数 */}
      <div style={{
        padding: '24px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60px',
          height: '60px',
          background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
          borderRadius: '0 12px 0 60px',
          opacity: 0.5,
        }} />
        <div style={{
          fontSize: '13px',
          color: '#6B7280',
          marginBottom: '12px',
          fontWeight: '500',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          position: 'relative',
          zIndex: 1,
        }}>
          サブカテゴリー数
        </div>
        <div style={{
          fontSize: '40px',
          fontWeight: '700',
          color: '#1A1A1A',
          lineHeight: '1',
          marginBottom: '4px',
          position: 'relative',
          zIndex: 1,
          fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
        }}>
          {subCategoriesCount}
        </div>
        <div style={{
          fontSize: '13px',
          color: '#9CA3AF',
          fontWeight: '400',
          position: 'relative',
          zIndex: 1,
        }}>
          件のサブカテゴリー
        </div>
      </div>

      {/* 全企業数 */}
      <div style={{
        padding: '24px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60px',
          height: '60px',
          background: 'linear-gradient(135deg, #FEF3F2 0%, #FEE2E2 100%)',
          borderRadius: '0 12px 0 60px',
          opacity: 0.5,
        }} />
        <div style={{
          fontSize: '13px',
          color: '#6B7280',
          marginBottom: '12px',
          fontWeight: '500',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          position: 'relative',
          zIndex: 1,
        }}>
          全企業数
        </div>
        <div style={{
          fontSize: '40px',
          fontWeight: '700',
          color: '#1A1A1A',
          lineHeight: '1',
          marginBottom: '4px',
          position: 'relative',
          zIndex: 1,
          fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
        }}>
          {hasFilters ? filteredStartupsCount : totalStartups}
        </div>
        <div style={{
          fontSize: '13px',
          color: '#9CA3AF',
          fontWeight: '400',
          position: 'relative',
          zIndex: 1,
        }}>
          件の企業
        </div>
      </div>

      {/* お気に入り企業数 */}
      <div style={{
        padding: '24px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60px',
          height: '60px',
          background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
          borderRadius: '0 12px 0 60px',
          opacity: 0.5,
        }} />
        <div style={{
          fontSize: '13px',
          color: '#6B7280',
          marginBottom: '12px',
          fontWeight: '500',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          position: 'relative',
          zIndex: 1,
        }}>
          お気に入り企業数
        </div>
        <div style={{
          fontSize: '40px',
          fontWeight: '700',
          color: '#1A1A1A',
          lineHeight: '1',
          marginBottom: '4px',
          position: 'relative',
          zIndex: 1,
          fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
        }}>
          {favoriteStartupsCount}
        </div>
        <div style={{
          fontSize: '13px',
          color: '#9CA3AF',
          fontWeight: '400',
          position: 'relative',
          zIndex: 1,
        }}>
          件の企業
        </div>
      </div>
    </div>
  );
}

