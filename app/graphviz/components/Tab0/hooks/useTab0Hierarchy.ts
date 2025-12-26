/**
 * Tab0の階層設定ロジックのカスタムフック
 */

import { useEffect, useState } from 'react';
import { 
  getSiteEquipmentBySiteId,
  getRackServersByRackId,
  getServerDetailsByServerId,
  clearHierarchyCache,
  type SiteEquipment,
  type RackServers,
  type ServerDetails,
} from '@/lib/graphvizHierarchyApi';
import { getGraphvizYamlFile, getAllGraphvizYamlFiles } from '@/lib/graphvizApi';
import * as yaml from 'js-yaml';

interface UseTab0HierarchyProps {
  initialFileId?: string | null;
  organizationId?: string | null;
  initialSiteId?: string | null;
  initialRackId?: string | null;
  initialServerId?: string | null;
  navigateToLevel: (level: 'sites' | 'racks' | 'equipment' | 'server-details', nodeId?: string, nodeLabel?: string) => void;
  reset: () => void;
  setHierarchy: (levels: { level: 'sites' | 'racks' | 'equipment' | 'server-details'; nodeId: string; nodeLabel: string }[]) => void;
}

export function useTab0Hierarchy({
  initialFileId,
  organizationId,
  initialSiteId,
  initialRackId,
  initialServerId,
  navigateToLevel,
  reset,
  setHierarchy,
}: UseTab0HierarchyProps) {
  const [siteEquipment, setSiteEquipment] = useState<SiteEquipment | null>(null);
  const [rackServers, setRackServers] = useState<RackServers | null>(null);
  const [rackServersMap, setRackServersMap] = useState<Map<string, RackServers>>(new Map());
  const [serverDetails, setServerDetails] = useState<ServerDetails | null>(null);
  const [currentCardName, setCurrentCardName] = useState<string | null>(null);
  const [lastFileUpdatedAt, setLastFileUpdatedAt] = useState<string | null>(null);
  
  useEffect(() => {
    const setDefaultHierarchy = async () => {
      if (!initialFileId) {
        return;
      }
      
      try {
        clearHierarchyCache();
        
        const file = await getGraphvizYamlFile(initialFileId);
        
        // ファイルが更新されたかどうかをチェック
        if (lastFileUpdatedAt && file.updatedAt && file.updatedAt === lastFileUpdatedAt) {
          // 更新されていない場合は、階層データのみ再読み込み（キャッシュクリア済み）
          console.log('🔄 [Tab0] ファイルは更新されていません。階層データのみ再読み込みします');
        } else {
          // ファイルが更新された場合、または初回読み込みの場合
          if (file.updatedAt) {
            setLastFileUpdatedAt(file.updatedAt);
          }
          console.log('🔄 [Tab0] ファイルが更新されました。階層データを再読み込みします:', file.updatedAt);
        }
        let cardType = file.yamlType;
        
        if (!cardType && file.yamlContent) {
          try {
            const parsed = yaml.load(file.yamlContent) as any;
            cardType = parsed?.type;
          } catch (e) {
            console.warn('YAMLのパースに失敗:', e);
          }
        }
        
        if (cardType === 'site-equipment' && initialSiteId) {
          console.log('🔄 [Tab0] site-equipmentタイプ: 棟内機器構成を表示', initialSiteId);
          const equipment = await getSiteEquipmentBySiteId(initialSiteId, organizationId || undefined);
          if (equipment) {
            navigateToLevel('sites', initialSiteId, equipment.label);
            setSiteEquipment(equipment);
            
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
          }
        } else if (cardType === 'rack-servers' && initialRackId) {
          console.log('🔄 [Tab0] rack-serversタイプ: 特定のラックのみを表示', initialRackId);
          if (initialSiteId) {
            const equipment = await getSiteEquipmentBySiteId(initialSiteId, organizationId || undefined);
            if (equipment) {
              setSiteEquipment(equipment);
              
              // ラック情報を取得
              const servers = await getRackServersByRackId(initialRackId, organizationId || undefined);
              if (servers) {
                setRackServers(servers);
                
                // 階層を設定: 棟 > ラック
                const rack = equipment.racks?.find(r => r.id === initialRackId);
                if (rack) {
                  setHierarchy([
                    { level: 'sites', nodeId: initialSiteId, nodeLabel: equipment.label },
                    { level: 'racks', nodeId: initialRackId, nodeLabel: rack.label },
                  ]);
                }
              }
              
              // 各ラックのサーバー情報を取得してマップを作成
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
            }
          }
        } else if (cardType === 'server-details' && initialServerId) {
          console.log('🔄 [Tab0] server-detailsタイプ: 機器詳細を表示', initialServerId);
          
          let siteId = initialSiteId;
          let rackId = initialRackId;
          
          if (!siteId || !rackId) {
            console.log('🔄 [Tab0] 階層情報を検索中...', { initialSiteId, initialRackId, initialServerId, organizationId });
            try {
              const allFiles = await getAllGraphvizYamlFiles(organizationId || undefined);
              console.log('🔄 [Tab0] 全ファイル数:', allFiles.length);
              
              let rackServersFile = allFiles.find(f => {
                if (f.yamlType !== 'rack-servers' || f.organizationId !== organizationId) {
                  return false;
                }
                if (!f.yamlContent) return false;
                try {
                  const rackServersParsed = yaml.load(f.yamlContent) as any;
                  const hasServer = rackServersParsed?.servers?.some((s: any) => s.id === initialServerId);
                  if (hasServer) {
                    console.log('✅ [Tab0] rack-serversファイルを発見:', f.id, f.name);
                  }
                  return hasServer;
                } catch {
                  return false;
                }
              });
              
              if (!rackServersFile) {
                console.log('🔄 [Tab0] rack-serversで見つからないため、site-equipmentを検索中...');
                const siteEquipmentFile = allFiles.find(f => {
                  if (f.yamlType !== 'site-equipment' || f.organizationId !== organizationId) {
                    return false;
                  }
                  if (!f.yamlContent) return false;
                  try {
                    const siteEqParsed = yaml.load(f.yamlContent) as any;
                    const hasServer = siteEqParsed?.racks?.some((rack: any) => 
                      rack.equipment?.some((eq: any) => eq.id === initialServerId && eq.type === 'server')
                    );
                    if (hasServer) {
                      console.log('✅ [Tab0] site-equipmentファイルを発見（equipment内）:', f.id, f.name);
                      const foundRack = siteEqParsed?.racks?.find((rack: any) => 
                        rack.equipment?.some((eq: any) => eq.id === initialServerId && eq.type === 'server')
                      );
                      if (foundRack) {
                        rackId = foundRack.id;
                        siteId = siteEqParsed?.siteId;
                        console.log('✅ [Tab0] site-equipmentから階層情報を取得:', { siteId, rackId });
                      }
                    }
                    return hasServer;
                  } catch {
                    return false;
                  }
                });
                
                if (siteEquipmentFile && siteId && rackId) {
                  console.log('✅ [Tab0] site-equipmentから階層情報を取得しました');
                }
              }
              
              if (rackServersFile && rackServersFile.yamlContent) {
                try {
                  const rackServersParsed = yaml.load(rackServersFile.yamlContent) as any;
                  rackId = rackServersParsed?.rackId;
                  console.log('✅ [Tab0] rackIdを取得:', rackId);
                  
                  const siteEquipmentFile = allFiles.find(f => {
                    if (f.yamlType !== 'site-equipment' || f.organizationId !== organizationId) {
                      return false;
                    }
                    if (!f.yamlContent) return false;
                    try {
                      const siteEqParsed = yaml.load(f.yamlContent) as any;
                      const hasRack = siteEqParsed?.racks?.some((r: any) => r.id === rackId);
                      if (hasRack) {
                        console.log('✅ [Tab0] site-equipmentファイルを発見:', f.id, f.name);
                      }
                      return hasRack;
                    } catch {
                      return false;
                    }
                  });
                  
                  if (siteEquipmentFile && siteEquipmentFile.yamlContent) {
                    try {
                      const siteEqParsed = yaml.load(siteEquipmentFile.yamlContent) as any;
                      siteId = siteEqParsed?.siteId;
                      console.log('✅ [Tab0] siteIdを取得:', siteId);
                    } catch (e) {
                      console.warn('⚠️ [Tab0] site-equipmentのパースに失敗:', e);
                    }
                  } else {
                    console.warn('⚠️ [Tab0] site-equipmentファイルが見つかりません (rackId:', rackId, ')');
                  }
                  
                  console.log('✅ [Tab0] 階層情報を検索しました:', { siteId, rackId, serverId: initialServerId });
                } catch (e) {
                  console.warn('⚠️ [Tab0] rack-serversのパースに失敗:', e);
                }
              } else {
                console.warn('⚠️ [Tab0] rack-serversファイルが見つかりません (serverId:', initialServerId, ')');
              }
            } catch (error) {
              console.error('❌ [Tab0] 階層情報の検索に失敗:', error);
            }
          }
          
          if (siteId && rackId) {
            try {
              const equipment = await getSiteEquipmentBySiteId(siteId, organizationId || undefined);
              if (!equipment) {
                console.warn('⚠️ [Tab0] 棟情報が見つかりません:', initialSiteId);
                return;
              }
              
              const servers = await getRackServersByRackId(rackId, organizationId || undefined);
              if (!servers) {
                console.warn('⚠️ [Tab0] ラック情報が見つかりません:', initialRackId);
                return;
              }
              
              const serverDetailsData = await getServerDetailsByServerId(initialServerId, organizationId || undefined);
              if (!serverDetailsData) {
                console.warn('⚠️ [Tab0] 機器詳細が見つかりません:', initialServerId);
                return;
              }
              
              setSiteEquipment(equipment);
              setRackServers(servers);
              setServerDetails(serverDetailsData);
              
              const rack = equipment.racks?.find(r => r.id === rackId);
              const serverLabel = serverDetailsData.label || servers.servers?.find(s => s.id === initialServerId)?.label || initialServerId;
              
              if (rack) {
                console.log('🔄 [Tab0] setHierarchyを呼び出します');
                setHierarchy([
                  { level: 'sites', nodeId: siteId, nodeLabel: equipment.label },
                  { level: 'racks', nodeId: rackId, nodeLabel: rack.label },
                  { level: 'server-details', nodeId: initialServerId, nodeLabel: serverLabel },
                ]);
                console.log('✅ [Tab0] setHierarchyを呼び出しました');
              } else {
                console.warn('⚠️ [Tab0] ラックが見つかりません (rackId:', rackId, ')');
              }
              
              console.log('✅ [Tab0] 機器詳細の階層を構築しました:', {
                siteId: siteId,
                rackId: rackId,
                serverId: initialServerId,
              });
            } catch (error) {
              console.error('❌ [Tab0] 機器詳細の階層構築に失敗:', error);
            }
          } else {
            console.warn('⚠️ [Tab0] 階層情報が不足しています:', {
              initialSiteId,
              initialRackId,
              initialServerId,
            });
          }
        } else if (cardType === 'site-topology') {
          console.log('🔄 [Tab0] site-topologyタイプ: 全体表示');
          setCurrentCardName(file.name || null);
          reset();
        }
      } catch (error) {
        console.error('❌ [Tab0] デフォルト階層の設定に失敗:', error);
      }
    };
    
    setDefaultHierarchy();
  }, [initialFileId, initialSiteId, initialRackId, initialServerId, organizationId, navigateToLevel, reset, setHierarchy, lastFileUpdatedAt]);
  
  // ファイル更新を定期的にチェック（5秒ごと）
  useEffect(() => {
    if (!initialFileId) return;
    
    const checkFileUpdate = async () => {
      try {
        const file = await getGraphvizYamlFile(initialFileId);
        if (file.updatedAt && lastFileUpdatedAt && file.updatedAt !== lastFileUpdatedAt) {
          console.log('🔄 [Tab0] ファイルが更新されました。階層データを再読み込みします');
          setLastFileUpdatedAt(file.updatedAt);
          // 階層データを再読み込みするために、useEffectをトリガー
          clearHierarchyCache();
          
          // カードタイプに応じて階層データを再読み込み
          let cardType = file.yamlType;
          if (!cardType && file.yamlContent) {
            try {
              const parsed = yaml.load(file.yamlContent) as any;
              cardType = parsed?.type;
            } catch (e) {
              console.warn('YAMLのパースに失敗:', e);
            }
          }
          
          if (cardType === 'site-equipment' && initialSiteId) {
            const equipment = await getSiteEquipmentBySiteId(initialSiteId, organizationId || undefined);
            if (equipment) {
              navigateToLevel('sites', initialSiteId, equipment.label);
              setSiteEquipment(equipment);
              
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
            }
          } else if (cardType === 'rack-servers' && initialRackId) {
            if (initialSiteId) {
              const equipment = await getSiteEquipmentBySiteId(initialSiteId, organizationId || undefined);
              if (equipment) {
                setSiteEquipment(equipment);
                
                const servers = await getRackServersByRackId(initialRackId, organizationId || undefined);
                if (servers) {
                  setRackServers(servers);
                  
                  const rack = equipment.racks?.find(r => r.id === initialRackId);
                  if (rack) {
                    setHierarchy([
                      { level: 'sites', nodeId: initialSiteId, nodeLabel: equipment.label },
                      { level: 'racks', nodeId: initialRackId, nodeLabel: rack.label },
                    ]);
                  }
                }
                
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
              }
            }
          } else if (cardType === 'server-details' && initialServerId) {
            let siteId = initialSiteId;
            let rackId = initialRackId;
            
            if (!siteId || !rackId) {
              const allFiles = await getAllGraphvizYamlFiles(organizationId || undefined);
              let rackServersFile = allFiles.find(f => {
                if (f.yamlType !== 'rack-servers' || f.organizationId !== organizationId) {
                  return false;
                }
                if (!f.yamlContent) return false;
                try {
                  const rackServersParsed = yaml.load(f.yamlContent) as any;
                  return rackServersParsed?.servers?.some((s: any) => s.id === initialServerId);
                } catch {
                  return false;
                }
              });
              
              if (rackServersFile && rackServersFile.yamlContent) {
                try {
                  const rackServersParsed = yaml.load(rackServersFile.yamlContent) as any;
                  rackId = rackServersParsed?.rackId;
                  
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
                      siteId = siteEqParsed?.siteId;
                    } catch (e) {
                      console.warn('⚠️ [Tab0] site-equipmentのパースに失敗:', e);
                    }
                  }
                } catch (e) {
                  console.warn('⚠️ [Tab0] rack-serversのパースに失敗:', e);
                }
              }
            }
            
            if (siteId && rackId) {
              const equipment = await getSiteEquipmentBySiteId(siteId, organizationId || undefined);
              if (equipment) {
                const servers = await getRackServersByRackId(rackId, organizationId || undefined);
                if (servers) {
                  const serverDetailsData = await getServerDetailsByServerId(initialServerId, organizationId || undefined);
                  if (serverDetailsData) {
                    setSiteEquipment(equipment);
                    setRackServers(servers);
                    setServerDetails(serverDetailsData);
                    
                    const rack = equipment.racks?.find(r => r.id === rackId);
                    const serverLabel = serverDetailsData.label || servers.servers?.find(s => s.id === initialServerId)?.label || initialServerId;
                    
                    if (rack) {
                      setHierarchy([
                        { level: 'sites', nodeId: siteId, nodeLabel: equipment.label },
                        { level: 'racks', nodeId: rackId, nodeLabel: rack.label },
                        { level: 'server-details', nodeId: initialServerId, nodeLabel: serverLabel },
                      ]);
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ [Tab0] ファイル更新チェックに失敗:', error);
      }
    };
    
    const intervalId = setInterval(checkFileUpdate, 5000); // 5秒ごとにチェック
    
    return () => {
      clearInterval(intervalId);
    };
  }, [initialFileId, initialSiteId, initialRackId, initialServerId, organizationId, lastFileUpdatedAt, navigateToLevel, setHierarchy, setSiteEquipment, setRackServers, setRackServersMap, setServerDetails]);
  
  return {
    siteEquipment,
    setSiteEquipment,
    rackServers,
    setRackServers,
    rackServersMap,
    setRackServersMap,
    serverDetails,
    setServerDetails,
    currentCardName,
    setCurrentCardName,
  };
}

