'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { GraphvizTabBar } from './components/TabBar';
import { Tab0 } from './components/Tab0';
import { Tab1 } from './components/Tab1';
import { Tab2 } from './components/Tab2';
import { Tab3 } from './components/Tab3';
import { Tab4 } from './components/Tab4';
import { getGraphvizYamlFile } from '@/lib/graphvizApi';
import * as yaml from 'js-yaml';

type GraphvizTab = 'tab0' | 'tab1' | 'tab2' | 'tab3' | 'tab4';

// カードタイプに応じた利用可能なタブを取得
function getAvailableTabsForCardType(cardType: string | null | undefined): GraphvizTab[] {
  switch (cardType) {
    case 'site-topology':
      return ['tab0', 'tab1'];
    case 'site-equipment':
      return ['tab0', 'tab2'];
    case 'rack-servers':
      return ['tab0', 'tab3'];
    case 'server-details':
      return ['tab0', 'tab4'];
    default:
      // カードタイプが不明な場合はすべてのタブを表示
      return ['tab0', 'tab1', 'tab2', 'tab3', 'tab4'];
  }
}

function GraphvizPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<GraphvizTab>('tab0');
  const [pageTitle, setPageTitle] = useState<string>('Graphviz');
  const [availableTabs, setAvailableTabs] = useState<GraphvizTab[]>(['tab0', 'tab1', 'tab2', 'tab3', 'tab4']);
  
  // クエリパラメータからファイルIDと組織IDを取得
  const fileId = searchParams?.get('fileId');
  const organizationId = searchParams?.get('organizationId');
  const tabParam = searchParams?.get('tab') as GraphvizTab | null;
  const siteId = searchParams?.get('siteId'); // 棟ID（site-topology/site-equipmentカードから遷移した場合）
  const rackId = searchParams?.get('rackId'); // ラックID（rack-serversカードから遷移した場合）
  const serverId = searchParams?.get('serverId'); // サーバーID（server-detailsカードから遷移した場合）
  
  // ファイルIDがある場合、ファイル情報を取得してタイトルとカードタイプを設定
  useEffect(() => {
    const loadFileInfo = async () => {
      if (fileId) {
        try {
          const file = await getGraphvizYamlFile(fileId);
          if (file) {
            if (file.name) {
              setPageTitle(file.name);
            }
            
            // カードタイプを取得（yamlTypeが設定されていない場合はYAMLコンテンツから取得）
            let cardType = file.yamlType;
            if (!cardType && file.yamlContent) {
              try {
                const parsed = yaml.load(file.yamlContent) as any;
                cardType = parsed?.type;
              } catch (e) {
                console.warn('YAMLのパースに失敗:', e);
              }
            }
            
            // カードタイプに応じた利用可能なタブを設定
            const tabs = getAvailableTabsForCardType(cardType);
            setAvailableTabs(tabs);
          } else {
            setPageTitle('Graphviz');
            setAvailableTabs(['tab0', 'tab1', 'tab2', 'tab3', 'tab4']);
          }
        } catch (error) {
          console.error('ファイル情報の取得に失敗:', error);
          setPageTitle('Graphviz');
          setAvailableTabs(['tab0', 'tab1', 'tab2', 'tab3', 'tab4']);
        }
      } else {
        setPageTitle('Graphviz');
        setAvailableTabs(['tab0', 'tab1', 'tab2', 'tab3', 'tab4']);
      }
    };

    loadFileInfo();
  }, [fileId]);
  
  // タブパラメータがある場合、タブを切り替え（利用可能なタブの場合のみ）
  useEffect(() => {
    if (tabParam) {
      if (availableTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      } else if (availableTabs.length > 0) {
        // タブパラメータが利用可能でない場合、利用可能な最初のタブに切り替え
        setActiveTab(availableTabs[0]);
      }
    }
  }, [tabParam, availableTabs]);
  
  // availableTabsが変更されたとき、アクティブなタブが利用可能でない場合は利用可能な最初のタブに切り替え
  // （tabParamが指定されている場合は、tabParamのuseEffectで処理されるため、ここでは処理しない）
  useEffect(() => {
    if (availableTabs.length > 0 && !tabParam) {
      setActiveTab((currentTab) => {
        if (!availableTabs.includes(currentTab)) {
          return availableTabs[0];
        }
        return currentTab;
      });
    }
  }, [availableTabs, tabParam]);

  // 戻るボタンのクリック処理
  const handleBack = () => {
    if (organizationId) {
      router.push(`/organization/detail?id=${organizationId}&tab=graphviz`);
    } else {
      router.push('/organization');
    }
  };

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px', margin: 0 }}>
            {pageTitle}
          </h1>
          {organizationId && (
            <button
              onClick={handleBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                backgroundColor: '#6B7280',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background-color 0.2s, opacity 0.2s',
                opacity: 0.9,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4B5563';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6B7280';
                e.currentTarget.style.opacity = '0.9';
              }}
              title="戻る"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12.5 15L7.5 10L12.5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>

        <GraphvizTabBar 
          activeTab={activeTab} 
          onTabChange={(tab) => {
            setActiveTab(tab);
            // URLパラメータを更新（現在のタブと異なる場合のみ）
            if (tab !== tabParam) {
              const params = new URLSearchParams();
              if (fileId) params.set('fileId', fileId);
              if (organizationId) params.set('organizationId', organizationId);
              if (siteId) params.set('siteId', siteId);
              if (rackId) params.set('rackId', rackId);
              if (serverId) params.set('serverId', serverId);
              params.set('tab', tab);
              router.push(`/graphviz?${params.toString()}`, { scroll: false });
            }
          }} 
          availableTabs={availableTabs} 
        />

        {activeTab === 'tab0' && (
          <Tab0 
            initialFileId={fileId} 
            organizationId={organizationId} 
            initialSiteId={siteId}
            initialRackId={rackId}
            initialServerId={serverId}
          />
        )}

        {activeTab === 'tab1' && (
          <Tab1 initialFileId={fileId} organizationId={organizationId} />
        )}

        {activeTab === 'tab2' && (
          <Tab2 initialFileId={fileId} organizationId={organizationId} />
        )}

        {activeTab === 'tab3' && (
          <Tab3 initialFileId={fileId} organizationId={organizationId} />
        )}

        {activeTab === 'tab4' && (
          <Tab4 initialFileId={fileId} organizationId={organizationId} />
        )}
      </div>
    </Layout>
  );
}

export default function GraphvizPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <GraphvizPageContent />
    </Suspense>
  );
}

