import React from 'react';
import type { Startup, Category } from '@/lib/orgApi';

interface ComparisonTargetSelectorProps {
  startup: Startup;
  startupsBySubCategory: Map<string, { subCategory: Category; parentCategory?: Category; startups: Startup[] }>;
  filteredStartups: Startup[];
  selectedStartups: string[];
  onSelectionChange: (selectedStartups: string[]) => Promise<void>;
}

export default function ComparisonTargetSelector({
  startup,
  startupsBySubCategory,
  filteredStartups,
  selectedStartups,
  onSelectionChange,
}: ComparisonTargetSelectorProps) {
  return (
    <div style={{ 
      backgroundColor: '#FFFFFF', 
      borderRadius: '8px', 
      padding: '20px',
      border: '1px solid #E5E7EB',
      marginBottom: '24px'
    }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>
        比較対象の選択
      </h3>
      {!startup.categoryIds || startup.categoryIds.length === 0 ? (
        <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
          このスタートアップにカテゴリーが設定されていないため、比較対象を表示できません。まず、詳細タブでカテゴリーを設定してください。
        </p>
      ) : startupsBySubCategory.size === 0 ? (
        <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
          同じサブカテゴリーが設定されているスタートアップが見つかりませんでした。
        </p>
      ) : (
        <>
          <p style={{ color: '#6B7280', fontSize: '12px', margin: 0, marginBottom: '16px' }}>
            同じカテゴリーが設定されているスタートアップのみ表示されています（合計 {filteredStartups.length}件）
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Array.from(startupsBySubCategory.entries()).map(([subCategoryId, { subCategory, parentCategory, startups: subCategoryStartups }]) => (
              <div key={subCategoryId} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  paddingBottom: '8px',
                  borderBottom: '2px solid #E5E7EB',
                  marginBottom: '8px',
                }}>
                  {parentCategory && (
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#9CA3AF',
                      marginRight: '8px',
                    }}>
                      {parentCategory.title} / 
                    </span>
                  )}
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#4262FF',
                    margin: 0,
                  }}>
                    {subCategory.title}
                  </h4>
                  <span style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    marginLeft: '8px',
                  }}>
                    ({subCategoryStartups.length}件)
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {subCategoryStartups.map(s => (
                    <label
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 16px',
                        backgroundColor: selectedStartups.includes(s.id) ? '#EFF6FF' : '#F9FAFB',
                        border: `1.5px solid ${selectedStartups.includes(s.id) ? '#4262FF' : '#E5E7EB'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: selectedStartups.includes(s.id) ? '#4262FF' : '#374151',
                        fontWeight: selectedStartups.includes(s.id) ? '600' : '400',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStartups.includes(s.id)}
                        onChange={async (e) => {
                          let updatedSelectedStartups: string[];
                          if (e.target.checked) {
                            updatedSelectedStartups = [...selectedStartups, s.id];
                          } else {
                            updatedSelectedStartups = selectedStartups.filter(id => id !== s.id);
                          }
                          await onSelectionChange(updatedSelectedStartups);
                        }}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      {s.title}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

