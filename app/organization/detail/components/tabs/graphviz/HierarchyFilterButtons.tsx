'use client';

type HierarchyFilter = 'all' | 'site-topology' | 'site-equipment' | 'rack-servers' | 'server-details' | 'other';

interface HierarchyFilterButtonsProps {
  hierarchyFilter: HierarchyFilter;
  onFilterChange: (filter: HierarchyFilter) => void;
}

export default function HierarchyFilterButtons({ hierarchyFilter, onFilterChange }: HierarchyFilterButtonsProps) {
  const filterOptions = [
    { value: 'all' as HierarchyFilter, label: 'すべて', description: 'すべての階層' },
    { value: 'site-topology' as HierarchyFilter, label: '棟間', description: '棟間ネットワーク' },
    { value: 'site-equipment' as HierarchyFilter, label: '棟内', description: '棟内機器構成' },
    { value: 'rack-servers' as HierarchyFilter, label: 'ラック内', description: 'ラック内サーバー' },
    { value: 'server-details' as HierarchyFilter, label: '機器詳細', description: '機器詳細設定' },
    { value: 'other' as HierarchyFilter, label: 'その他', description: 'その他のタイプ' },
  ];

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: '13px', color: '#6B7280', marginRight: '4px' }}>階層:</span>
      {filterOptions.map(({ value, label, description }) => (
        <button
          key={value}
          onClick={() => onFilterChange(value)}
          title={description}
          style={{
            padding: '6px 12px',
            backgroundColor: hierarchyFilter === value ? '#3B82F6' : '#F3F4F6',
            color: hierarchyFilter === value ? '#FFFFFF' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: hierarchyFilter === value ? 600 : 500,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (hierarchyFilter !== value) {
              e.currentTarget.style.backgroundColor = '#E5E7EB';
            }
          }}
          onMouseLeave={(e) => {
            if (hierarchyFilter !== value) {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

