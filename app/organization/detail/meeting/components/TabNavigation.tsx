'use client';

import { TableOfContentsIcon } from './Icons';
import { MONTHS, SUMMARY_TABS } from '../constants';
import type { TabType, MonthContent, MeetingNoteData } from '../types';

interface TabNavigationProps {
  activeTab: TabType;
  customTabLabels: Record<TabType, string | undefined>;
  monthContents: MeetingNoteData;
  tabOrder: TabType[];
  onSetActiveTab: (tab: TabType) => void;
  onSetActiveSection: (section: string) => void;
  onShowTableOfContents: () => void;
}

export default function TabNavigation({
  activeTab,
  customTabLabels,
  monthContents,
  tabOrder,
  onSetActiveTab,
  onSetActiveSection,
  onShowTableOfContents,
}: TabNavigationProps) {
  // tabOrderに基づいてタブを並べ替え
  const orderedMonths = tabOrder.filter(tabId => MONTHS.some(m => m.id === tabId));
  const orderedSummaryTabs = tabOrder.filter(tabId => SUMMARY_TABS.some(t => t.id === tabId));
  
  // 順番に基づいてタブ情報を取得
  const getTabInfo = (tabId: TabType) => {
    const month = MONTHS.find(m => m.id === tabId);
    const summaryTab = SUMMARY_TABS.find(t => t.id === tabId);
    return month || summaryTab;
  };
  return (
    <>
      {/* 目次ボタン */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-start', 
        marginBottom: '12px',
      }}>
        <button
          onClick={onShowTableOfContents}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#6B7280',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4B5563';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#6B7280';
          }}
          title="目次を表示"
        >
          <TableOfContentsIcon size={16} color="white" />
          <span>目次</span>
        </button>
      </div>

      {/* タブ */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px 12px 0 0',
        boxShadow: '0 5px 20px rgba(44,62,80,0.07)',
        borderBottom: '2px solid #0066CC',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* 月タブと総括タブを順番に表示 */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* 月タブ行 */}
            {orderedMonths.length > 0 && (
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', marginBottom: '5px', borderBottom: '2px solid #0066CC', paddingBottom: '10px' }}>
                {orderedMonths.map((tabId) => {
                  const tabInfo = getTabInfo(tabId);
                  if (!tabInfo) return null;
                  return (
                    <button
                      key={tabId}
                      onClick={() => {
                        onSetActiveTab(tabId);
                        const tabData = monthContents[tabId] as MonthContent | undefined;
                        if (tabData?.summaryId) {
                          onSetActiveSection(tabData.summaryId);
                        }
                      }}
                      style={{
                        padding: '14px 24px',
                        cursor: 'pointer',
                        color: activeTab === tabId ? '#FFFFFF' : '#475569',
                        fontWeight: activeTab === tabId ? '700' : '600',
                        border: 'none',
                        borderRadius: '8px 8px 0 0',
                        background: activeTab === tabId 
                          ? 'linear-gradient(135deg, #0066CC 0%, #0052A3 100%)' 
                          : 'transparent',
                        transition: 'all 0.2s ease',
                        flexShrink: 0,
                        textAlign: 'center',
                        margin: '0 2px',
                        fontSize: '1.05em',
                        letterSpacing: '0.3px',
                        boxShadow: activeTab === tabId 
                          ? '0 4px 12px rgba(0,102,204,0.2), inset 0 -2px 4px rgba(0,0,0,0.1)' 
                          : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (activeTab !== tabId) {
                          e.currentTarget.style.backgroundColor = '#EFF6FF';
                          e.currentTarget.style.color = '#0066CC';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeTab !== tabId) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#475569';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {customTabLabels[tabId] || tabInfo.label}
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* 総括タブ行 */}
            {orderedSummaryTabs.length > 0 && (
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                {orderedSummaryTabs.map((tabId) => {
                  const tabInfo = getTabInfo(tabId);
                  if (!tabInfo) return null;
                  return (
                    <button
                      key={tabId}
                      onClick={() => {
                        onSetActiveTab(tabId);
                        const tabData = monthContents[tabId] as MonthContent | undefined;
                        if (tabData?.summaryId) {
                          onSetActiveSection(tabData.summaryId);
                        }
                      }}
                      style={{
                        padding: '14px 20px',
                        cursor: 'pointer',
                        color: activeTab === tabId ? '#FFFFFF' : '#475569',
                        fontWeight: activeTab === tabId ? '700' : '600',
                        border: 'none',
                        borderRadius: '8px 8px 0 0',
                        background: activeTab === tabId 
                          ? 'linear-gradient(135deg, #0066CC 0%, #0052A3 100%)' 
                          : 'transparent',
                        transition: 'all 0.2s ease',
                        flex: 1,
                        textAlign: 'center',
                        margin: '0 2px',
                        fontSize: '1.05em',
                        letterSpacing: '0.3px',
                        boxShadow: activeTab === tabId 
                          ? '0 4px 12px rgba(0,102,204,0.2), inset 0 -2px 4px rgba(0,0,0,0.1)' 
                          : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (activeTab !== tabId) {
                          e.currentTarget.style.backgroundColor = '#EFF6FF';
                          e.currentTarget.style.color = '#0066CC';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeTab !== tabId) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#475569';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {customTabLabels[tabId] || tabInfo.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

