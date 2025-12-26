import { useState, useMemo } from 'react';
import type { TabType, MonthContent } from '../../types';
import { MONTHS, SUMMARY_TABS } from '../../constants';
import { EditIcon } from '../Icons';

interface TableOfContentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  getTableOfContentsData: () => Array<{
    tabId: TabType;
    tabLabel: string;
    itemCount: number;
    topicCount: number;
    items: Array<{
      id: string;
      title: string;
      topicCount: number;
    }>;
    isSummaryTab: boolean;
  }>;
  monthContents: Record<string, MonthContent>;
  customTabLabels: Record<TabType, string | undefined>;
  editingTabLabel: TabType | null;
  editingTabLabelValue: string;
  expandedMonthInTOC: TabType | null;
  onSetEditingTabLabel: (tab: TabType | null) => void;
  onSetEditingTabLabelValue: (value: string) => void;
  onSetCustomTabLabels: (labels: Record<TabType, string | undefined>) => void;
  onSetHasUnsavedChanges: (hasChanges: boolean) => void;
  onSetExpandedMonthInTOC: (tab: TabType | null) => void;
  onSetActiveTab: (tab: TabType) => void;
  onSetActiveSection: (section: string) => void;
  onMoveTabUp: (tabId: TabType) => void;
  onMoveTabDown: (tabId: TabType) => void;
}

export default function TableOfContentsModal({
  isOpen,
  onClose,
  getTableOfContentsData,
  monthContents,
  customTabLabels,
  editingTabLabel,
  editingTabLabelValue,
  expandedMonthInTOC,
  onSetEditingTabLabel,
  onSetEditingTabLabelValue,
  onSetCustomTabLabels,
  onSetHasUnsavedChanges,
  onSetExpandedMonthInTOC,
  onSetActiveTab,
  onSetActiveSection,
  onMoveTabUp,
  onMoveTabDown,
}: TableOfContentsModalProps) {
  const [isReorderMode, setIsReorderMode] = useState(false);
  
  const tocData = useMemo(() => {
    return getTableOfContentsData();
  }, [getTableOfContentsData]);
  
  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '1200px',
          width: '95%',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1E293B' }}>
            目次
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setIsReorderMode(!isReorderMode)}
              type="button"
              style={{
                padding: '6px 12px',
                background: isReorderMode 
                  ? 'linear-gradient(135deg, #0066CC 0%, #0052A3 100%)'
                  : 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              title="タブの順番を入れ替え"
            >
              {isReorderMode ? '✓ 完了' : '↕ 順番入れ替え'}
            </button>
            <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              backgroundColor: 'transparent',
              color: '#6B7280',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
              e.currentTarget.style.color = '#1E293B';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6B7280';
            }}
            title="閉じる"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {tocData.map((tabData, index) => (
            <div
              key={tabData.tabId}
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: tabData.isSummaryTab ? '#F0F9FF' : '#F9FAFB',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  {/* 順番変更ボタン（順番入れ替えモード時のみ表示） */}
                  {isReorderMode && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onMoveTabUp(tabData.tabId);
                        }}
                        disabled={index === 0}
                        style={{
                          padding: '2px 6px',
                          background: index === 0 ? '#E5E7EB' : '#FFFFFF',
                          color: index === 0 ? '#9CA3AF' : '#475569',
                          border: '1px solid #D1D5DB',
                          borderRadius: '4px',
                          cursor: index === 0 ? 'not-allowed' : 'pointer',
                          fontSize: '10px',
                          lineHeight: '1',
                          opacity: index === 0 ? 0.5 : 1,
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (index !== 0) {
                            e.currentTarget.style.background = '#F3F4F6';
                            e.currentTarget.style.borderColor = '#9CA3AF';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (index !== 0) {
                            e.currentTarget.style.background = '#FFFFFF';
                            e.currentTarget.style.borderColor = '#D1D5DB';
                          }
                        }}
                        title="上に移動"
                      >
                        ↑
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onMoveTabDown(tabData.tabId);
                        }}
                        disabled={index === tocData.length - 1}
                        style={{
                          padding: '2px 6px',
                          background: index === tocData.length - 1 ? '#E5E7EB' : '#FFFFFF',
                          color: index === tocData.length - 1 ? '#9CA3AF' : '#475569',
                          border: '1px solid #D1D5DB',
                          borderRadius: '4px',
                          cursor: index === tocData.length - 1 ? 'not-allowed' : 'pointer',
                          fontSize: '10px',
                          lineHeight: '1',
                          opacity: index === tocData.length - 1 ? 0.5 : 1,
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (index !== tocData.length - 1) {
                            e.currentTarget.style.background = '#F3F4F6';
                            e.currentTarget.style.borderColor = '#9CA3AF';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (index !== tocData.length - 1) {
                            e.currentTarget.style.background = '#FFFFFF';
                            e.currentTarget.style.borderColor = '#D1D5DB';
                          }
                        }}
                        title="下に移動"
                      >
                        ↓
                      </button>
                    </div>
                  )}
                  {editingTabLabel === tabData.tabId ? (
                    <input
                      type="text"
                      value={editingTabLabelValue}
                      onChange={(e) => onSetEditingTabLabelValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const updatedLabels = { ...customTabLabels };
                          updatedLabels[tabData.tabId] = editingTabLabelValue.trim() || undefined;
                          onSetCustomTabLabels(updatedLabels);
                          onSetHasUnsavedChanges(true);
                          onSetEditingTabLabel(null);
                          onSetEditingTabLabelValue('');
                        } else if (e.key === 'Escape') {
                          onSetEditingTabLabel(null);
                          onSetEditingTabLabelValue('');
                        }
                      }}
                      onBlur={() => {
                        const updatedLabels = { ...customTabLabels };
                        updatedLabels[tabData.tabId] = editingTabLabelValue.trim() || undefined;
                        onSetCustomTabLabels(updatedLabels);
                        onSetHasUnsavedChanges(true);
                        onSetEditingTabLabel(null);
                        onSetEditingTabLabelValue('');
                      }}
                      style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#1E293B',
                        border: '2px solid #0066CC',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        width: '200px',
                      }}
                      autoFocus
                    />
                  ) : (
                    <h3 
                      style={{ 
                        fontSize: '18px', 
                        fontWeight: 600, 
                        margin: 0, 
                        color: '#1E293B',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onClick={() => {
                        if (expandedMonthInTOC === tabData.tabId) {
                          onSetExpandedMonthInTOC(null);
                        } else {
                          onSetExpandedMonthInTOC(tabData.tabId);
                        }
                      }}
                    >
                      <span style={{
                        fontSize: '12px',
                        transition: 'transform 0.2s ease',
                        transform: expandedMonthInTOC === tabData.tabId ? 'rotate(90deg)' : 'rotate(0deg)',
                        display: 'inline-block',
                      }}>
                        ▶
                      </span>
                      {tabData.tabLabel}
                    </h3>
                  )}
                  {editingTabLabel !== tabData.tabId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const defaultLabel = MONTHS.find(m => m.id === tabData.tabId)?.label || 
                                            SUMMARY_TABS.find(t => t.id === tabData.tabId)?.label || 
                                            tabData.tabId;
                        onSetEditingTabLabel(tabData.tabId);
                        onSetEditingTabLabelValue(customTabLabels[tabData.tabId] || defaultLabel);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        backgroundColor: 'transparent',
                        color: '#64748B',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#EFF6FF';
                        e.currentTarget.style.color = '#0066CC';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#64748B';
                      }}
                      title="タブ名を編集"
                    >
                      <EditIcon size={14} color="currentColor" />
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: '14px', 
                    color: '#64748B',
                    backgroundColor: '#E2E8F0',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontWeight: '500',
                  }}>
                    議事録: {tabData.itemCount}件
                  </span>
                  <span style={{ 
                    fontSize: '14px', 
                    color: '#64748B',
                    backgroundColor: '#DBEAFE',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontWeight: '500',
                  }}>
                    トピック: {tabData.topicCount}件
                  </span>
                </div>
              </div>
              
              {expandedMonthInTOC === tabData.tabId && (
                <div style={{ 
                  marginTop: '12px',
                  padding: '16px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                }}>
                  {tabData.items.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <h4 style={{ 
                          fontSize: '14px', 
                          fontWeight: 600, 
                          color: '#1E293B',
                          margin: '0 0 12px 0',
                        }}>
                          議事録一覧 ({tabData.itemCount}件)
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {tabData.items.map((item) => {
                            const itemData = (monthContents[tabData.tabId] as MonthContent | undefined)?.items?.find(i => i.id === item.id);
                            const topics = itemData?.topics || [];
                            return (
                              <div
                                key={item.id}
                                style={{
                                  padding: '12px',
                                  backgroundColor: '#FFFFFF',
                                  borderRadius: '6px',
                                  border: '1px solid #E5E7EB',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: topics.length > 0 ? '8px' : '0' }}>
                                  <span style={{ 
                                    fontSize: '14px', 
                                    fontWeight: 500,
                                    color: '#1E293B',
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => {
                                    onSetActiveTab(tabData.tabId);
                                    onSetActiveSection(item.id);
                                    onClose();
                                  }}
                                  >
                                    {item.title}
                                  </span>
                                  <span style={{ 
                                    fontSize: '12px', 
                                    color: '#64748B',
                                    backgroundColor: '#DBEAFE',
                                    padding: '2px 8px',
                                    borderRadius: '8px',
                                  }}>
                                    トピック: {item.topicCount}件
                                  </span>
                                </div>
                                {topics.length > 0 && (
                                  <div style={{ marginTop: '8px', paddingLeft: '12px', borderLeft: '2px solid #CBD5E1' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                                      トピック一覧:
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      {topics.map((topic) => (
                                        <div
                                          key={topic.id}
                                          style={{
                                            fontSize: '12px',
                                            color: '#475569',
                                            padding: '4px 8px',
                                            backgroundColor: '#F3F4F6',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                          }}
                                          onClick={() => {
                                            onSetActiveTab(tabData.tabId);
                                            onSetActiveSection(item.id);
                                            onClose();
                                            setTimeout(() => {
                                              const topicElement = document.getElementById(`${item.id}-topic-${topic.id}`);
                                              if (topicElement) {
                                                topicElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                topicElement.style.backgroundColor = '#fff9e6';
                                                setTimeout(() => {
                                                  topicElement.style.backgroundColor = '';
                                                }, 2000);
                                              }
                                            }, 100);
                                          }}
                                        >
                                          {topic.title || '無題'}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      padding: '24px',
                      textAlign: 'center',
                      color: '#9CA3AF',
                      fontSize: '14px',
                    }}>
                      議事録が登録されていません
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

