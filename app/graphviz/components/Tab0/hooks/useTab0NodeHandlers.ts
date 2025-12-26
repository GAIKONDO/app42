/**
 * Tab0のノードクリックハンドラーのカスタムフック
 */

import { useState, useCallback } from 'react';
import type { SiteTopology, SiteEquipment, RackServers } from '@/lib/graphvizHierarchyApi';
import type { NodeDetail } from '../NodeDetailPanel';

export function useTab0NodeHandlers(
  sites: SiteTopology[],
  siteEquipment: SiteEquipment | null,
  rackServers: RackServers | null
) {
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null);
  
  const handleSiteClick = useCallback(async (siteId: string, siteLabel: string) => {
    console.log('✅ [Tab0] 棟クリック:', siteId, siteLabel);
    
    const site = sites
      .flatMap(st => st.sites || [])
      .find(s => s.id === siteId);
    
    if (site) {
      setSelectedNode({
        type: 'site',
        id: siteId,
        label: siteLabel || site.label,
        description: (site as any).description,
        location: site.location,
        capacity: site.capacity,
      });
    } else {
      setSelectedNode({
        type: 'site',
        id: siteId,
        label: siteLabel,
      });
    }
  }, [sites]);
  
  const handleRackClick = useCallback(async (rackId: string, rackLabel: string) => {
    console.log('✅ [Tab0] ラッククリック:', rackId, rackLabel);
    
    const rack = siteEquipment?.racks?.find(r => r.id === rackId);
    
    if (rack) {
      setSelectedNode({
        type: 'rack',
        id: rackId,
        label: rackLabel || rack.label,
        description: (rack as any).description,
        rackLocation: rack.location,
        rackCapacity: rack.capacity,
        siteEquipment: siteEquipment,
      });
    } else {
      setSelectedNode({
        type: 'rack',
        id: rackId,
        label: rackLabel,
        siteEquipment: siteEquipment,
      });
    }
  }, [siteEquipment]);
  
  const handleEquipmentClick = useCallback((equipmentId: string, equipmentType: string, equipmentLabel: string) => {
    console.log('✅ [Tab0] 機器クリック:', equipmentId, equipmentType, equipmentLabel);
    
    let equipment = null;
    if (siteEquipment) {
      equipment = siteEquipment.racks
        ?.flatMap(r => r.equipment || [])
        .find(eq => eq.id === equipmentId);
    }
    
    if (rackServers) {
      const server = rackServers.servers?.find(s => s.id === equipmentId);
      if (server) {
        setSelectedNode({
          type: 'server',
          id: equipmentId,
          label: equipmentLabel || server.label,
          description: (server as any).description,
          model: server.model,
          equipmentType: 'server',
          rackServers: rackServers,
        });
        return;
      }
    }
    
    if (equipment) {
      setSelectedNode({
        type: 'equipment',
        id: equipmentId,
        label: equipmentLabel || equipment.label,
        description: (equipment as any).description,
        equipmentType: equipment.type,
        model: equipment.model,
        position: equipment.position,
        siteEquipment: siteEquipment,
      });
    } else {
      setSelectedNode({
        type: equipmentType === 'server' ? 'server' : 'equipment',
        id: equipmentId,
        label: equipmentLabel,
        equipmentType: equipmentType,
      });
    }
  }, [siteEquipment, rackServers]);
  
  return {
    selectedNode,
    setSelectedNode,
    handleSiteClick,
    handleRackClick,
    handleEquipmentClick,
  };
}

