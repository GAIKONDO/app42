/**
 * Graphviz タブ0: 全体俯瞰UI
 * 階層的なネットワーク情報を統合して表示
 */

'use client';

import { useEffect } from 'react';
import { useHierarchyState } from './useHierarchyState';
import { useTab0Data } from './hooks/useTab0Data';
import { useTab0Hierarchy } from './hooks/useTab0Hierarchy';
import { useTab0NodeHandlers } from './hooks/useTab0NodeHandlers';
import { useTab0Navigation } from './hooks/useTab0Navigation';
import { Tab0Header } from './components/Tab0Header';
import { Tab0Content } from './components/Tab0Content';
import { LoadingIndicator } from './LoadingIndicator';
import { ErrorDisplay } from './ErrorDisplay';

interface Tab0Props {
  initialFileId?: string | null;
  organizationId?: string | null;
  initialSiteId?: string | null;
  initialRackId?: string | null;
  initialServerId?: string | null;
}

export function Tab0({ initialFileId, organizationId, initialSiteId, initialRackId, initialServerId }: Tab0Props = {}) {
  // 階層状態管理
  const { state: hierarchyState, navigateToLevel, navigateToBreadcrumb, reset, setHierarchy } = useHierarchyState();
  
  // データ読み込みと状態管理
  const {
    sites,
    isLoading,
    error,
    validationResult,
    loadInitialData,
    setError,
    setIsLoading,
  } = useTab0Data(organizationId, initialFileId);
  
  // 階層設定
  const {
    siteEquipment,
    setSiteEquipment,
    rackServers,
    setRackServers,
    rackServersMap,
    setRackServersMap,
    serverDetails,
    setServerDetails,
    currentCardName,
  } = useTab0Hierarchy({
    initialFileId,
    organizationId,
    initialSiteId,
    initialRackId,
    initialServerId,
    navigateToLevel,
    reset,
    setHierarchy,
  });
  
  // ノードクリックハンドラー
  const {
    selectedNode,
    setSelectedNode,
    handleSiteClick,
    handleRackClick,
    handleEquipmentClick,
  } = useTab0NodeHandlers(sites, siteEquipment, rackServers);
  
  // ナビゲーション
  const {
    handleViewDetails,
    handleBreadcrumbClick,
    isLoadingNodeDetails,
  } = useTab0Navigation({
    organizationId,
    initialFileId,
    setSiteEquipment,
    setRackServers,
    setRackServersMap,
    setError,
    setIsLoading,
    hierarchyState,
    navigateToLevel,
    navigateToBreadcrumb,
    reset,
  });
  
  // hierarchyStateの変更をログに出力（デバッグ用）
  useEffect(() => {
    console.log('🔄 [Tab0] hierarchyStateが変更されました:', {
      currentLevel: hierarchyState.currentLevel,
      breadcrumbs: hierarchyState.breadcrumbs,
      selectedSiteId: hierarchyState.selectedSiteId,
      selectedRackId: hierarchyState.selectedRackId,
      selectedServerId: hierarchyState.selectedServerId,
    });
  }, [hierarchyState]);
  
  if (isLoading) {
    return (
      <div style={{ padding: '24px' }}>
        <h2 style={{ 
          fontSize: '20px', 
          fontWeight: 600, 
          color: '#1a1a1a', 
          marginBottom: '16px' 
        }}>
          タブ0: 全体俯瞰
        </h2>
        <LoadingIndicator />
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <h2 style={{ 
          fontSize: '20px', 
          fontWeight: 600, 
          color: '#1a1a1a', 
          marginBottom: '16px' 
        }}>
          タブ0: 全体俯瞰
        </h2>
        <ErrorDisplay error={error} onRetry={loadInitialData} />
      </div>
    );
  }
  
  return (
    <div style={{ 
      padding: '24px',
      minHeight: 'calc(100vh - 200px)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Tab0Header 
        validationResult={validationResult}
        sitesCount={sites.length}
      />
      
      <Tab0Content
        hierarchyState={hierarchyState}
        sites={sites}
        siteEquipment={siteEquipment}
        rackServers={rackServers}
        rackServersMap={rackServersMap}
        serverDetails={serverDetails}
        organizationId={organizationId || undefined}
        initialRackId={initialRackId}
        initialFileId={initialFileId}
        currentCardName={currentCardName}
        selectedNode={selectedNode}
        onSiteClick={handleSiteClick}
        onRackClick={handleRackClick}
        onEquipmentClick={handleEquipmentClick}
        onBreadcrumbClick={handleBreadcrumbClick}
        onCloseNodeDetail={() => setSelectedNode(null)}
        onViewDetails={() => handleViewDetails(selectedNode)}
        isLoadingNodeDetails={isLoadingNodeDetails}
      />
    </div>
  );
}

// デフォルトエクスポートも追加（念のため）
export default Tab0;
