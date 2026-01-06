'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { useAnalyticsData } from './hooks/useAnalyticsData';
import { AnalyticsTabBar } from './components/TabBar';
import { RelationshipDiagramTab } from './components/RelationshipDiagramTab';
import { PlaceholderTab } from './components/PlaceholderTab';
import { CategoryManagementTab } from './components/CategoryManagementTab';

type AnalyticsTab = 'relationship-diagram' | 'category-management' | 'tab4';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('category-management');
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'diagram' | 'bubble' | 'bar'>('diagram');

  const {
    themes,
    setThemes,
    categories,
    setCategories,
    vcs,
    setVcs,
    departments,
    setDepartments,
    statuses,
    setStatuses,
    engagementLevels,
    setEngagementLevels,
    bizDevPhases,
    setBizDevPhases,
    startups,
    setStartups,
    initiatives,
    orgData,
    topics,
    setTopics,
    loading,
    error,
    refreshThemes,
    refreshCategories,
    refreshVcs,
    refreshDepartments,
    refreshStatuses,
    refreshEngagementLevels,
    refreshBizDevPhases,
    refreshTopics,
  } = useAnalyticsData();

  // データが既に存在する場合は、loadingがtrueでも「読み込み中」を表示しない
  // これにより、ページ遷移時に「読み込み中」が表示されない
  const hasData = themes.length > 0 || categories.length > 0 || orgData !== null || initiatives.length > 0;
  if (loading && !hasData) {
    return (
      <Layout>
        <div className="card">
          <p>データを読み込み中...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="card" style={{ padding: '32px' }}>
        {/* ヘッダー */}
        <div style={{ 
          marginBottom: '32px',
        }}>
          <h2 style={{ 
            marginBottom: '8px',
            fontSize: '24px',
            fontWeight: '600',
            color: '#1A1A1A',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            分析
          </h2>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div style={{ 
            marginBottom: '24px', 
            padding: '12px 16px', 
            backgroundColor: '#FEF2F2', 
            border: '1.5px solid #FCA5A5', 
            borderRadius: '8px',
            color: '#991B1B',
            fontSize: '14px',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            <strong>エラー:</strong> {error}
          </div>
        )}

        <AnalyticsTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'relationship-diagram' && (
          <RelationshipDiagramTab
            selectedThemeId={selectedThemeId}
            viewMode={viewMode}
            themes={themes}
            setThemes={setThemes}
            initiatives={initiatives}
            startups={startups}
            orgData={orgData}
            topics={topics}
            setTopics={setTopics}
            bizDevPhases={bizDevPhases}
            refreshThemes={refreshThemes}
            refreshTopics={refreshTopics}
            onSelectedThemeIdChange={setSelectedThemeId}
            onViewModeChange={setViewMode}
          />
        )}

        {activeTab === 'category-management' && (
          <CategoryManagementTab
            categories={categories}
            setCategories={setCategories}
            vcs={vcs}
            setVcs={setVcs}
            departments={departments}
            setDepartments={setDepartments}
            statuses={statuses}
            setStatuses={setStatuses}
            engagementLevels={engagementLevels}
            setEngagementLevels={setEngagementLevels}
            bizDevPhases={bizDevPhases}
            setBizDevPhases={setBizDevPhases}
            startups={startups}
            refreshCategories={refreshCategories}
            refreshVcs={refreshVcs}
            refreshDepartments={refreshDepartments}
            refreshStatuses={refreshStatuses}
            refreshEngagementLevels={refreshEngagementLevels}
            refreshBizDevPhases={refreshBizDevPhases}
          />
        )}

        {activeTab === 'tab4' && (
          <PlaceholderTab tabName="機能4" />
        )}
      </div>
    </Layout>
  );
}
