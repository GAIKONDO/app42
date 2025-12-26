/**
 * Tab0のナビゲーションロジックのカスタムフック
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getSiteEquipmentBySiteId,
  getRackServersByRackId,
  type SiteEquipment,
  type RackServers,
} from '@/lib/graphvizHierarchyApi';
import { getGraphvizYamlFile, getAllGraphvizYamlFiles } from '@/lib/graphvizApi';
import * as yaml from 'js-yaml';
import type { NodeDetail } from '../NodeDetailPanel';
import type { HierarchyState } from '../useHierarchyState';

interface UseTab0NavigationProps {
  organizationId?: string | null;
  initialFileId?: string | null;
  setSiteEquipment: (equipment: SiteEquipment | null) => void;
  setRackServers: (servers: RackServers | null) => void;
  setRackServersMap: (map: Map<string, RackServers>) => void;
  setError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  hierarchyState: HierarchyState;
  navigateToLevel: (level: 'sites' | 'racks' | 'equipment' | 'server-details', nodeId?: string, nodeLabel?: string) => void;
  navigateToBreadcrumb: (index: number) => void;
  reset: () => void;
}

export function useTab0Navigation({
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
}: UseTab0NavigationProps) {
  const router = useRouter();
  const [isLoadingNodeDetails, setIsLoadingNodeDetails] = useState(false);
  
  const handleViewDetails = useCallback(async (selectedNode: NodeDetail | null) => {
    if (!selectedNode) return;
    
    setIsLoadingNodeDetails(true);
    setError(null);
    
    try {
      if (selectedNode.type === 'site') {
        try {
          const allFiles = await getAllGraphvizYamlFiles();
          const siteEquipmentFile = allFiles.find(f => {
            if (f.yamlType !== 'site-equipment' || f.organizationId !== organizationId) {
              return false;
            }
            if (!f.yamlContent) return false;
            try {
              const parsed = yaml.load(f.yamlContent) as any;
              return parsed?.siteId === selectedNode.id;
            } catch {
              return false;
            }
          });
          
          if (siteEquipmentFile) {
            const params = new URLSearchParams();
            params.set('fileId', siteEquipmentFile.id);
            if (organizationId) params.set('organizationId', organizationId);
            params.set('tab', 'tab0');
            params.set('siteId', selectedNode.id);
            router.push(`/graphviz?${params.toString()}`);
            setIsLoadingNodeDetails(false);
            return;
          }
        } catch (err) {
          console.error('❌ [Tab0] site-equipmentカードの検索に失敗:', err);
        }
        
        const equipment = await getSiteEquipmentBySiteId(
          selectedNode.id,
          organizationId || undefined
        );
        
        if (!equipment) {
          setError(`棟 "${selectedNode.id}" の機器構成が見つかりません`);
          setIsLoadingNodeDetails(false);
          return;
        }
        
        navigateToLevel('sites', selectedNode.id, equipment.label);
        setSiteEquipment(equipment);
        setRackServers(null);
        
        const newRackServersMap = new Map<string, RackServers>();
        if (equipment.racks && Array.isArray(equipment.racks)) {
          for (const rack of equipment.racks) {
            try {
              const rackServersData = await getRackServersByRackId(rack.id, organizationId || undefined);
              if (rackServersData) {
                newRackServersMap.set(rack.id, rackServersData);
              }
            } catch (err) {
              console.warn(`⚠️ [Tab0] ラック "${rack.id}" のサーバー情報取得に失敗:`, err);
            }
          }
        }
        setRackServersMap(newRackServersMap);
        console.log('✅ [Tab0] 棟内機器構成を取得:', equipment);
      } else if (selectedNode.type === 'rack') {
        try {
          const allFiles = await getAllGraphvizYamlFiles();
          const rackServersFile = allFiles.find(f => {
            if (f.yamlType !== 'rack-servers' || f.organizationId !== organizationId) {
              return false;
            }
            if (!f.yamlContent) return false;
            try {
              const parsed = yaml.load(f.yamlContent) as any;
              return parsed?.rackId === selectedNode.id;
            } catch {
              return false;
            }
          });
          
          if (rackServersFile) {
            let siteIdForRack: string | null = null;
            try {
              const allFilesForSite = await getAllGraphvizYamlFiles();
              const siteEquipmentFileForRack = allFilesForSite.find(f => {
                if (f.yamlType !== 'site-equipment' || f.organizationId !== organizationId) {
                  return false;
                }
                if (!f.yamlContent) return false;
                try {
                  const parsed = yaml.load(f.yamlContent) as any;
                  if (parsed?.racks && Array.isArray(parsed.racks)) {
                    return parsed.racks.some((rack: any) => rack.id === selectedNode.id);
                  }
                  return false;
                } catch {
                  return false;
                }
              });
              
              if (siteEquipmentFileForRack && siteEquipmentFileForRack.yamlContent) {
                try {
                  const siteEqParsed = yaml.load(siteEquipmentFileForRack.yamlContent) as any;
                  siteIdForRack = siteEqParsed?.siteId || null;
                } catch (e) {
                  console.warn('site-equipmentのパースに失敗:', e);
                }
              }
            } catch (err) {
              console.error('❌ [Tab0] siteIdの検索に失敗:', err);
            }
            
            const params = new URLSearchParams();
            params.set('fileId', rackServersFile.id);
            if (organizationId) params.set('organizationId', organizationId);
            params.set('tab', 'tab0');
            params.set('rackId', selectedNode.id);
            if (siteIdForRack) params.set('siteId', siteIdForRack);
            router.push(`/graphviz?${params.toString()}`);
            setIsLoadingNodeDetails(false);
            return;
          }
        } catch (err) {
          console.error('❌ [Tab0] rack-serversカードの検索に失敗:', err);
        }
        
        const servers = await getRackServersByRackId(
          selectedNode.id,
          organizationId || undefined
        );
        
        if (!servers) {
          setError(`ラック "${selectedNode.label}" に対応するラック内サーバーカードが見つかりません。`);
          setIsLoadingNodeDetails(false);
          return;
        }
        
        navigateToLevel('racks', selectedNode.id, servers.label);
        setRackServers(servers);
        console.log('✅ [Tab0] ラック内サーバーを取得:', servers);
      } else if (selectedNode.type === 'equipment' || selectedNode.type === 'server') {
        try {
          const allFiles = await getAllGraphvizYamlFiles();
          const serverDetailsFile = allFiles.find(f => {
            if (f.yamlType !== 'server-details' || f.organizationId !== organizationId) {
              return false;
            }
            if (!f.yamlContent) return false;
            try {
              const parsed = yaml.load(f.yamlContent) as any;
              return parsed?.serverId === selectedNode.id;
            } catch {
              return false;
            }
          });
          
          if (serverDetailsFile) {
            let rackIdForServer: string | null = null;
            let siteIdForServer: string | null = null;
            try {
              const allFilesForServer = await getAllGraphvizYamlFiles();
              for (const file of allFilesForServer) {
                if (file.yamlType !== 'site-equipment' || file.organizationId !== organizationId) {
                  continue;
                }
                if (!file.yamlContent) continue;
                try {
                  const parsed = yaml.load(file.yamlContent) as any;
                  if (parsed?.racks && Array.isArray(parsed.racks)) {
                    for (const rack of parsed.racks) {
                      if (rack.equipment && Array.isArray(rack.equipment)) {
                        const equipment = rack.equipment.find((eq: any) => eq.id === selectedNode.id);
                        if (equipment) {
                          rackIdForServer = rack.id;
                          siteIdForServer = parsed?.siteId || null;
                          break;
                        }
                      }
                    }
                    if (rackIdForServer) break;
                  }
                } catch {
                  continue;
                }
              }
            } catch (err) {
              console.error('❌ [Tab0] rackId/siteIdの検索に失敗:', err);
            }
            
            const params = new URLSearchParams();
            params.set('fileId', serverDetailsFile.id);
            if (organizationId) params.set('organizationId', organizationId);
            params.set('tab', 'tab0');
            params.set('serverId', selectedNode.id);
            if (rackIdForServer) params.set('rackId', rackIdForServer);
            if (siteIdForServer) params.set('siteId', siteIdForServer);
            router.push(`/graphviz?${params.toString()}`);
            setIsLoadingNodeDetails(false);
            return;
          }
        } catch (err) {
          console.error('❌ [Tab0] server-detailsカードの検索に失敗:', err);
        }
        
        alert(`機器 "${selectedNode.label}" に対応する機器詳細カードが見つかりません。`);
        setIsLoadingNodeDetails(false);
        return;
      }
    } catch (err: any) {
      console.error('❌ [Tab0] 詳細データ取得エラー:', err);
      setError(`データの取得に失敗しました: ${err.message || err}`);
    } finally {
      setIsLoadingNodeDetails(false);
    }
  }, [organizationId, navigateToLevel, router, setSiteEquipment, setRackServers, setRackServersMap, setError]);
  
  const handleBackToAll = useCallback(() => {
    reset();
    setSiteEquipment(null);
    setRackServers(null);
    setError(null);
  }, [reset, setSiteEquipment, setRackServers, setError]);
  
  const handleBreadcrumbClick = useCallback(async (index: number) => {
    if (index === -1) {
      console.log('🔄 [Tab0] 「全体」ボタンがクリックされました', { initialFileId, organizationId });
      
      if (initialFileId) {
        try {
          console.log('🔄 [Tab0] カード情報を取得中...', initialFileId);
          const file = await getGraphvizYamlFile(initialFileId);
          let cardType = file.yamlType;
          
          if (!cardType && file.yamlContent) {
            try {
              const parsed = yaml.load(file.yamlContent) as any;
              cardType = parsed?.type;
            } catch (e) {
              console.warn('⚠️ [Tab0] YAMLのパースに失敗:', e);
            }
          }
          
          if (cardType === 'site-topology') {
            const params = new URLSearchParams();
            params.set('fileId', initialFileId);
            if (organizationId) params.set('organizationId', organizationId);
            params.set('tab', 'tab0');
            router.push(`/graphviz?${params.toString()}`);
            return;
          } else if (cardType === 'site-equipment') {
            try {
              const parsed = yaml.load(file.yamlContent) as any;
              const siteId = parsed?.siteId;
              
              if (siteId) {
                const allFiles = await getAllGraphvizYamlFiles(organizationId || undefined);
                const siteTopologyFile = allFiles.find(f => {
                  if (f.yamlType !== 'site-topology' || f.organizationId !== organizationId) {
                    return false;
                  }
                  if (!f.yamlContent) return false;
                  try {
                    const siteTopologyParsed = yaml.load(f.yamlContent) as any;
                    return siteTopologyParsed?.sites?.some((s: any) => s.id === siteId);
                  } catch {
                    return false;
                  }
                });
                
                if (siteTopologyFile) {
                  const params = new URLSearchParams();
                  params.set('fileId', siteTopologyFile.id);
                  if (organizationId) params.set('organizationId', organizationId);
                  params.set('tab', 'tab0');
                  router.push(`/graphviz?${params.toString()}`);
                  return;
                }
              }
            } catch (e) {
              console.error('❌ [Tab0] 親カードの検索に失敗:', e);
            }
          } else if (cardType === 'rack-servers') {
            try {
              const parsed = yaml.load(file.yamlContent) as any;
              const rackId = parsed?.rackId;
              
              if (rackId) {
                const allFiles = await getAllGraphvizYamlFiles(organizationId || undefined);
                const siteEquipmentFile = allFiles.find(f => {
                  if (f.yamlType !== 'site-equipment' || f.organizationId !== organizationId) {
                    return false;
                  }
                  if (!f.yamlContent) return false;
                  try {
                    const siteEqParsed = yaml.load(f.yamlContent) as any;
                    return siteEqParsed?.racks?.some((r: any) => r.id === rackId);
                  } catch {
                    return false;
                  }
                });
                
                if (siteEquipmentFile && siteEquipmentFile.yamlContent) {
                  try {
                    const siteEqParsed = yaml.load(siteEquipmentFile.yamlContent) as any;
                    const siteId = siteEqParsed?.siteId;
                    
                    if (siteId) {
                      const siteTopologyFile = allFiles.find(f => {
                        if (f.yamlType !== 'site-topology' || f.organizationId !== organizationId) {
                          return false;
                        }
                        if (!f.yamlContent) return false;
                        try {
                          const siteTopologyParsed = yaml.load(f.yamlContent) as any;
                          return siteTopologyParsed?.sites?.some((s: any) => s.id === siteId);
                        } catch {
                          return false;
                        }
                      });
                      
                      if (siteTopologyFile) {
                        const params = new URLSearchParams();
                        params.set('fileId', siteTopologyFile.id);
                        if (organizationId) params.set('organizationId', organizationId);
                        params.set('tab', 'tab0');
                        router.push(`/graphviz?${params.toString()}`);
                        return;
                      }
                    }
                  } catch (e) {
                    console.warn('site-equipmentのパースに失敗:', e);
                  }
                }
              }
            } catch (e) {
              console.error('❌ [Tab0] 親カードの検索に失敗:', e);
            }
          } else if (cardType === 'server-details') {
            try {
              const parsed = yaml.load(file.yamlContent) as any;
              const serverId = parsed?.serverId;
              
              if (serverId) {
                const allFiles = await getAllGraphvizYamlFiles(organizationId || undefined);
                let rackIdForServer: string | undefined;
                let siteIdForServer: string | undefined;
                
                const rackServersFile = allFiles.find(f => {
                  if (f.yamlType !== 'rack-servers' || f.organizationId !== organizationId) {
                    return false;
                  }
                  if (!f.yamlContent) return false;
                  try {
                    const rackServersParsed = yaml.load(f.yamlContent) as any;
                    return rackServersParsed?.servers?.some((s: any) => s.id === serverId);
                  } catch {
                    return false;
                  }
                });
                
                if (rackServersFile && rackServersFile.yamlContent) {
                  try {
                    const rackServersParsed = yaml.load(rackServersFile.yamlContent) as any;
                    rackIdForServer = rackServersParsed?.rackId;
                    
                    const siteEquipmentFile = allFiles.find(f => {
                      if (f.yamlType !== 'site-equipment' || f.organizationId !== organizationId) {
                        return false;
                      }
                      if (!f.yamlContent) return false;
                      try {
                        const siteEqParsed = yaml.load(f.yamlContent) as any;
                        return siteEqParsed?.racks?.some((r: any) => r.id === rackIdForServer);
                      } catch {
                        return false;
                      }
                    });
                    
                    if (siteEquipmentFile && siteEquipmentFile.yamlContent) {
                      try {
                        const siteEqParsed = yaml.load(siteEquipmentFile.yamlContent) as any;
                        siteIdForServer = siteEqParsed?.siteId;
                        
                        if (siteIdForServer) {
                          const siteTopologyFile = allFiles.find(f => {
                            if (f.yamlType !== 'site-topology' || f.organizationId !== organizationId) {
                              return false;
                            }
                            if (!f.yamlContent) return false;
                            try {
                              const siteTopologyParsed = yaml.load(f.yamlContent) as any;
                              return siteTopologyParsed?.sites?.some((s: any) => s.id === siteIdForServer);
                            } catch {
                              return false;
                            }
                          });
                          
                          if (siteTopologyFile) {
                            const params = new URLSearchParams();
                            params.set('fileId', siteTopologyFile.id);
                            if (organizationId) params.set('organizationId', organizationId);
                            params.set('tab', 'tab0');
                            router.push(`/graphviz?${params.toString()}`);
                            return;
                          }
                        }
                      } catch (e) {
                        console.warn('site-equipmentのパースに失敗:', e);
                      }
                    }
                  } catch (e) {
                    console.warn('rack-serversのパースに失敗:', e);
                  }
                }
              }
            } catch (e) {
              console.error('❌ [Tab0] 親カードの検索に失敗:', e);
            }
          }
        } catch (error) {
          console.error('❌ [Tab0] カード情報の取得に失敗:', error);
        }
      }
      
      handleBackToAll();
      return;
    }
    
    const targetBreadcrumb = hierarchyState.breadcrumbs[index];
    if (!targetBreadcrumb) return;
    
    try {
      const allFiles = await getAllGraphvizYamlFiles(organizationId || undefined);
      
      if (targetBreadcrumb.type === 'sites') {
        const siteEquipmentFile = allFiles.find(f => {
          if (f.yamlType !== 'site-equipment' || f.organizationId !== organizationId) {
            return false;
          }
          if (!f.yamlContent) return false;
          try {
            const parsed = yaml.load(f.yamlContent) as any;
            return parsed?.siteId === targetBreadcrumb.id;
          } catch {
            return false;
          }
        });
        
        if (siteEquipmentFile) {
          const params = new URLSearchParams();
          params.set('fileId', siteEquipmentFile.id);
          if (organizationId) params.set('organizationId', organizationId);
          params.set('tab', 'tab0');
          params.set('siteId', targetBreadcrumb.id);
          router.push(`/graphviz?${params.toString()}`);
          return;
        }
      } else if (targetBreadcrumb.type === 'racks') {
        const rackServersFile = allFiles.find(f => {
          if (f.yamlType !== 'rack-servers' || f.organizationId !== organizationId) {
            return false;
          }
          if (!f.yamlContent) return false;
          try {
            const parsed = yaml.load(f.yamlContent) as any;
            return parsed?.rackId === targetBreadcrumb.id;
          } catch {
            return false;
          }
        });
        
        if (rackServersFile) {
          let siteIdForRack: string | undefined;
          const siteEquipmentFile = allFiles.find(f => {
            if (f.yamlType !== 'site-equipment' || f.organizationId !== organizationId) {
              return false;
            }
            if (!f.yamlContent) return false;
            try {
              const siteEqParsed = yaml.load(f.yamlContent) as any;
              return siteEqParsed?.racks?.some((r: any) => r.id === targetBreadcrumb.id);
            } catch {
              return false;
            }
          });
          
          if (siteEquipmentFile && siteEquipmentFile.yamlContent) {
            try {
              const siteEqParsed = yaml.load(siteEquipmentFile.yamlContent) as any;
              siteIdForRack = siteEqParsed?.siteId;
            } catch (e) {
              console.warn('site-equipmentのパースに失敗:', e);
            }
          }
          
          const params = new URLSearchParams();
          params.set('fileId', rackServersFile.id);
          if (organizationId) params.set('organizationId', organizationId);
          params.set('tab', 'tab0');
          if (siteIdForRack) params.set('siteId', siteIdForRack);
          params.set('rackId', targetBreadcrumb.id);
          router.push(`/graphviz?${params.toString()}`);
          return;
        }
      } else if (targetBreadcrumb.type === 'server-details') {
        const serverDetailsFile = allFiles.find(f => {
          if (f.yamlType !== 'server-details' || f.organizationId !== organizationId) {
            return false;
          }
          if (!f.yamlContent) return false;
          try {
            const parsed = yaml.load(f.yamlContent) as any;
            return parsed?.serverId === targetBreadcrumb.id;
          } catch {
            return false;
          }
        });
        
        if (serverDetailsFile) {
          let rackIdForServer: string | undefined;
          let siteIdForServer: string | undefined;
          
          const rackServersFile = allFiles.find(f => {
            if (f.yamlType !== 'rack-servers' || f.organizationId !== organizationId) {
              return false;
            }
            if (!f.yamlContent) return false;
            try {
              const rackServersParsed = yaml.load(f.yamlContent) as any;
              return rackServersParsed?.servers?.some((s: any) => s.id === targetBreadcrumb.id);
            } catch {
              return false;
            }
          });
          
          if (rackServersFile && rackServersFile.yamlContent) {
            try {
              const rackServersParsed = yaml.load(rackServersFile.yamlContent) as any;
              rackIdForServer = rackServersParsed?.rackId;
              
              const siteEquipmentFile = allFiles.find(f => {
                if (f.yamlType !== 'site-equipment' || f.organizationId !== organizationId) {
                  return false;
                }
                if (!f.yamlContent) return false;
                try {
                  const siteEqParsed = yaml.load(f.yamlContent) as any;
                  return siteEqParsed?.racks?.some((r: any) => r.id === rackIdForServer);
                } catch {
                  return false;
                }
              });
              
              if (siteEquipmentFile && siteEquipmentFile.yamlContent) {
                try {
                  const siteEqParsed = yaml.load(siteEquipmentFile.yamlContent) as any;
                  siteIdForServer = siteEqParsed?.siteId;
                } catch (e) {
                  console.warn('site-equipmentのパースに失敗:', e);
                }
              }
            } catch (e) {
              console.warn('rack-serversのパースに失敗:', e);
            }
          }
          
          const params = new URLSearchParams();
          params.set('fileId', serverDetailsFile.id);
          if (organizationId) params.set('organizationId', organizationId);
          params.set('tab', 'tab0');
          if (siteIdForServer) params.set('siteId', siteIdForServer);
          if (rackIdForServer) params.set('rackId', rackIdForServer);
          params.set('serverId', targetBreadcrumb.id);
          router.push(`/graphviz?${params.toString()}`);
          return;
        }
      }
      
      navigateToBreadcrumb(index);
      setIsLoading(true);
      setError(null);
      
      try {
        if (targetBreadcrumb.type === 'sites') {
          const equipment = await getSiteEquipmentBySiteId(
            targetBreadcrumb.id,
            organizationId || undefined
          );
          if (equipment) {
            setSiteEquipment(equipment);
            setRackServers(null);
          }
        } else if (targetBreadcrumb.type === 'racks') {
          const servers = await getRackServersByRackId(
            targetBreadcrumb.id,
            organizationId || undefined
          );
          if (servers) {
            setRackServers(servers);
            if (hierarchyState.selectedSiteId) {
              const equipment = await getSiteEquipmentBySiteId(
                hierarchyState.selectedSiteId,
                organizationId || undefined
              );
              if (equipment) {
                setSiteEquipment(equipment);
              }
            }
          }
        }
      } catch (err: any) {
        console.error('❌ [Tab0] ブレッドクラムデータ取得エラー:', err);
        setError(`データの取得に失敗しました: ${err.message || err}`);
      } finally {
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('❌ [Tab0] ブレッドクラムクリック時のエラー:', error);
      setError(error.message || 'カードの検索に失敗しました');
    }
  }, [hierarchyState, organizationId, navigateToBreadcrumb, handleBackToAll, router, initialFileId, setIsLoading, setError, setSiteEquipment, setRackServers]);
  
  return {
    handleViewDetails,
    handleBreadcrumbClick,
    isLoadingNodeDetails,
  };
}

