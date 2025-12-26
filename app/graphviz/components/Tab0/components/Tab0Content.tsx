/**
 * Tab0のメインコンテンツコンポーネント
 */

import { useState } from 'react';
import { Breadcrumb } from '../Breadcrumb';
import { HierarchyViewer } from '../HierarchyViewer';
import { Hierarchy3DViewer } from '../Hierarchy3DViewer';
import { NodeDetailPanel, type NodeDetail } from '../NodeDetailPanel';
import { ViewModeSelector, type ViewMode } from '../../utils/ViewModeSelector';
import type { 
  SiteTopology,
  SiteEquipment,
  RackServers,
  ServerDetails,
} from '@/lib/graphvizHierarchyApi';
import type { HierarchyState } from '../useHierarchyState';

interface Tab0ContentProps {
  hierarchyState: HierarchyState;
  sites: SiteTopology[];
  siteEquipment: SiteEquipment | null;
  rackServers: RackServers | null;
  rackServersMap: Map<string, RackServers>;
  serverDetails: ServerDetails | null;
  organizationId?: string;
  initialRackId?: string | null;
  initialFileId?: string | null;
  currentCardName: string | null;
  selectedNode: NodeDetail | null;
  onSiteClick: (siteId: string, siteLabel: string) => void;
  onRackClick: (rackId: string, rackLabel: string) => void;
  onEquipmentClick: (equipmentId: string, equipmentType: string, equipmentLabel: string) => void;
  onBreadcrumbClick: (index: number) => void;
  onCloseNodeDetail: () => void;
  onViewDetails: () => void;
  isLoadingNodeDetails: boolean;
}

export function Tab0Content({
  hierarchyState,
  sites,
  siteEquipment,
  rackServers,
  rackServersMap,
  serverDetails,
  organizationId,
  initialRackId,
  initialFileId,
  currentCardName,
  selectedNode,
  onSiteClick,
  onRackClick,
  onEquipmentClick,
  onBreadcrumbClick,
  onCloseNodeDetail,
  onViewDetails,
  isLoadingNodeDetails,
}: Tab0ContentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('2d');

  return (
    <>
      {/* ブレッドクラムと2D/3D切り替え */}
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        marginBottom: '12px',
        flexWrap: 'wrap',
      }}>
        {(hierarchyState.currentLevel !== 'all' || initialFileId) && (
          <Breadcrumb
            items={hierarchyState.breadcrumbs}
            onItemClick={onBreadcrumbClick}
            currentCardName={hierarchyState.currentLevel === 'all' && currentCardName ? currentCardName : null}
          />
        )}
        <ViewModeSelector
          mode={viewMode}
          onModeChange={setViewMode}
        />
      </div>
      
      {/* 階層ビューア */}
      <div style={{
        flex: 1,
        minHeight: 0,
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: viewMode === '3d' ? '0' : '16px',
        backgroundColor: '#FFFFFF',
        marginRight: selectedNode ? '400px' : '0',
        transition: 'margin-right 0.3s ease',
        overflow: 'hidden',
      }}>
        {viewMode === '3d' ? (
          <Hierarchy3DViewer
            hierarchyState={hierarchyState}
            sites={sites}
            siteEquipment={siteEquipment}
            rackServers={rackServers}
            rackServersMap={rackServersMap}
            serverDetails={serverDetails}
            onSiteClick={onSiteClick}
            onRackClick={onRackClick}
            onEquipmentClick={onEquipmentClick}
            height={600}
          />
        ) : (
          <HierarchyViewer
            hierarchyState={hierarchyState}
            sites={sites}
            siteEquipment={siteEquipment}
            rackServers={rackServers}
            rackServersMap={rackServersMap}
            serverDetails={serverDetails}
            organizationId={organizationId}
            initialRackId={initialRackId}
            initialFileId={initialFileId}
            onSiteClick={onSiteClick}
            onRackClick={onRackClick}
            onEquipmentClick={onEquipmentClick}
          />
        )}
      </div>
      
      {/* ノード詳細パネル（右側ポップアップ） */}
      <NodeDetailPanel
        nodeDetail={selectedNode}
        onClose={onCloseNodeDetail}
        onViewDetails={onViewDetails}
        isLoading={isLoadingNodeDetails}
      />
    </>
  );
}

