'use client';

import React from 'react';
import type { LandscapeViewProps } from './types';
import CompactStartupItem from './CompactStartupItem';
import type { Startup, Category } from '@/lib/orgApi';

export default function LandscapeView({
  selectedCategoryIds,
  filteredStartups,
  categoryHierarchy,
  startupsByCategory,
  categories,
  viewMode,
  bizDevPhases,
}: LandscapeViewProps) {
  if (selectedCategoryIds.size > 0) {
    // 選択されたカテゴリーのみ表示
    const selectedCategories = Array.from(selectedCategoryIds)
      .map(id => categories.find(c => c.id === id))
      .filter((c): c is Category => c !== undefined);
    
    if (selectedCategories.length === 0) return null;

    return (
      <div>
        {selectedCategories.map(category => (
          <div key={category.id} style={{
            padding: '32px',
            backgroundColor: '#F9FAFB',
            borderRadius: '16px',
            marginBottom: '32px',
          }}>
            <div style={{
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '3px solid #3B82F6',
            }}>
              <h3 style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#1A1A1A',
                margin: 0,
                marginBottom: '8px',
              }}>
                {category.title}
              </h3>
              <div style={{
                fontSize: '16px',
                color: '#6B7280',
                fontWeight: '500',
              }}>
                {filteredStartups.filter(startup => 
                  startup.categoryIds && 
                  startup.categoryIds.includes(category.id)
                ).length}件のスタートアップ
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
                ? 'repeat(auto-fill, minmax(140px, 1fr))'
                : 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '12px',
            }}>
              {filteredStartups
                .filter(startup => 
                  startup.categoryIds && 
                  startup.categoryIds.includes(category.id)
                )
                .map(startup => (
                  <CompactStartupItem key={startup.id} startup={startup} bizDevPhases={bizDevPhases} />
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // すべてのカテゴリーをマップ形式で表示
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
        ? '1fr'
        : 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '24px',
    }}>
      {categoryHierarchy.map(({ parent, children }) => {
        const parentStartups = startupsByCategory[parent.id] || [];
        const hasChildStartups = children.some(child => {
          const childStartups = startupsByCategory[child.id] || [];
          return childStartups.length > 0;
        });

        if (viewMode === 'parent-only') {
          // 重複を避けるためにSetを使用
          const startupSet = new Set<string>();
          const allStartupsForParent: Startup[] = [];
          
          // 親カテゴリーに直接紐づいているスタートアップを追加
          parentStartups.forEach(startup => {
            if (startup.id && !startupSet.has(startup.id)) {
              startupSet.add(startup.id);
              allStartupsForParent.push(startup);
            }
          });
          
          // 子カテゴリーのスタートアップを追加
          children.forEach(child => {
            const childStartups = startupsByCategory[child.id] || [];
            childStartups.forEach(startup => {
              if (startup.id && !startupSet.has(startup.id)) {
                startupSet.add(startup.id);
                allStartupsForParent.push(startup);
              }
            });
          });
          
          if (allStartupsForParent.length === 0) return null;

          return (
            <div key={parent.id} style={{
              padding: '24px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '2px solid #E5E7EB',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            }}>
              <div style={{
                marginBottom: '20px',
                paddingBottom: '12px',
                borderBottom: '2px solid #3B82F6',
              }}>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#1A1A1A',
                  margin: 0,
                  marginBottom: '4px',
                }}>
                  {parent.title}
                </h3>
                <div style={{
                  fontSize: '14px',
                  color: '#6B7280',
                  fontWeight: '500',
                }}>
                  {allStartupsForParent.length}件
                </div>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '10px',
              }}>
                {allStartupsForParent.map(startup => (
                  <CompactStartupItem key={startup.id} startup={startup} bizDevPhases={bizDevPhases} />
                ))}
              </div>
            </div>
          );
        }

        if (!hasChildStartups) return null;

        const totalStartups = children.reduce((sum, child) => sum + (startupsByCategory[child.id] || []).length, 0);

        return (
          <div key={parent.id} style={{
            padding: '24px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '2px solid #E5E7EB',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          }}>
            <div style={{
              marginBottom: '20px',
              paddingBottom: '12px',
              borderBottom: '2px solid #3B82F6',
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1A1A1A',
                margin: 0,
                marginBottom: '4px',
              }}>
                {parent.title}
              </h3>
              <div style={{
                fontSize: '14px',
                color: '#6B7280',
                fontWeight: '500',
              }}>
                {totalStartups}件
              </div>
            </div>
            
            {children.map(child => {
              const childStartups = startupsByCategory[child.id] || [];
              if (childStartups.length === 0) return null;

              return (
                <div key={child.id} style={{ marginBottom: '20px' }}>
                  <h4 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#374151',
                    margin: 0,
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #E5E7EB',
                  }}>
                    {child.title}
                    <span style={{ marginLeft: '8px', fontSize: '13px', fontWeight: '400', color: '#9CA3AF' }}>
                      ({childStartups.length})
                    </span>
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '10px',
                  }}>
                    {childStartups.map(startup => (
                      <CompactStartupItem key={startup.id} startup={startup} bizDevPhases={bizDevPhases} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

