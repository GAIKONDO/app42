/**
 * Graphvizタブコンポーネント
 * 組織に紐づくGraphvizファイルの一覧を表示
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAllGraphvizYamlFiles, deleteGraphvizYamlFile, createGraphvizYamlFile, updateGraphvizYamlFile, type GraphvizYamlFile } from '@/lib/graphvizApi';
import { parseYamlFile } from '@/app/graphviz/components/utils/yamlToDotAdvanced';
import * as yaml from 'js-yaml';
import DeleteConfirmModal from '@/app/settings/components/DeleteConfirmModal';
import AddGraphvizModal from '../modals/AddGraphvizModal';
import ViewModeSelector from './graphviz/ViewModeSelector';
import HierarchyFilterButtons from './graphviz/HierarchyFilterButtons';
import CardView from './graphviz/CardView';
import ListView from './graphviz/ListView';
import FinderView from './graphviz/FinderView';

interface GraphvizTabProps {
  organizationId: string;
  tabRef?: React.RefObject<HTMLDivElement>;
  onDownloadImage?: (tab: string) => void;
  onFilesChange?: (count: number) => void;
}

export default function GraphvizTab({
  organizationId,
  tabRef,
  onDownloadImage,
  onFilesChange,
}: GraphvizTabProps) {
  const router = useRouter();
  const [files, setFiles] = useState<GraphvizYamlFile[]>([]);
  const [allFiles, setAllFiles] = useState<GraphvizYamlFile[]>([]); // すべてのファイルを保持
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; fileId: string; fileName: string } | null>(null);
  
  // 階層フィルターの状態
  type HierarchyFilter = 'all' | 'site-topology' | 'site-equipment' | 'rack-servers' | 'server-details' | 'other';
  const [hierarchyFilter, setHierarchyFilter] = useState<HierarchyFilter>('all');
  
  // 追加モーダルの状態
  const [showAddGraphvizModal, setShowAddGraphvizModal] = useState(false);
  const [newGraphvizName, setNewGraphvizName] = useState('');
  const [newGraphvizDescription, setNewGraphvizDescription] = useState('');
  const [newGraphvizType, setNewGraphvizType] = useState<string>('site-topology');
  const [newGraphvizParentId, setNewGraphvizParentId] = useState<string>('');
  const [newGraphvizId, setNewGraphvizId] = useState<string>('');
  const [savingGraphviz, setSavingGraphviz] = useState(false);
  
  // 親ファイル一覧（タイプに応じて動的に取得）
  const [parentFiles, setParentFiles] = useState<Array<{ id: string; name: string; data: any }>>([]);
  const [loadingParentFiles, setLoadingParentFiles] = useState(false);
  
  // 選択された親カード内のSite一覧（site-equipmentの場合）
  const [selectedParentSites, setSelectedParentSites] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  
  // 編集機能の状態
  const [editingGraphvizId, setEditingGraphvizId] = useState<string | null>(null);
  const [editingGraphvizName, setEditingGraphvizName] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState(false);
  
  // 表示形式の状態（カード形式、リスト形式、Finder形式）
  type ViewMode = 'card' | 'list' | 'finder';
  const [viewMode, setViewMode] = useState<ViewMode>('finder');
  
  // ユニークIDを生成（yaml_プレフィックス付き）
  const generateGraphvizId = useCallback(() => {
    return `yaml_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 階層フィルターを適用する関数
  const getFilteredFiles = useCallback((filesToFilter: GraphvizYamlFile[], filter: HierarchyFilter): GraphvizYamlFile[] => {
    if (filter === 'all') {
      return filesToFilter;
    }
    if (filter === 'other') {
      // 階層構造以外のタイプ（topology, device, links, intent, unknown）
      return filesToFilter.filter(file => 
        !file.yamlType || 
        !['site-topology', 'site-equipment', 'rack-servers', 'server-details'].includes(file.yamlType)
      );
    }
    return filesToFilter.filter(file => file.yamlType === filter);
  }, []);
  
  // ファイル一覧を取得
  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      // 組織IDでフィルタリング（将来的に実装）
      // 現時点では、すべてのファイルを取得して、organizationIdでフィルタリング
      const fetchedFiles = await getAllGraphvizYamlFiles();
      // organizationIdでフィルタリング（organizationIdが一致するもののみ）
      const orgFilteredFiles = fetchedFiles.filter(file => file.organizationId === organizationId);
      setAllFiles(orgFilteredFiles);
      
      // 階層フィルターを適用
      const filtered = getFilteredFiles(orgFilteredFiles, hierarchyFilter);
      setFiles(filtered);
      
      // 親コンポーネントに件数を通知（フィルター適用後の件数）
      onFilesChange?.(filtered.length);
    } catch (error: any) {
      console.error('ファイル一覧の取得に失敗:', error);
      alert(`ファイル一覧の取得に失敗しました: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, hierarchyFilter, getFilteredFiles, onFilesChange]);
  
  // 階層フィルター変更時の処理
  const handleHierarchyFilterChange = useCallback((filter: HierarchyFilter) => {
    setHierarchyFilter(filter);
    
    // 現在のallFilesからフィルターを適用
    const filtered = getFilteredFiles(allFiles, filter);
    setFiles(filtered);
    
    // 親コンポーネントに件数を通知
    onFilesChange?.(filtered.length);
  }, [allFiles, getFilteredFiles, onFilesChange]);
  
  // allFilesが更新されたときに、現在のフィルターを再適用
  useEffect(() => {
    if (allFiles.length > 0) {
      const filtered = getFilteredFiles(allFiles, hierarchyFilter);
      setFiles(filtered);
      onFilesChange?.(filtered.length);
    }
  }, [allFiles, hierarchyFilter, getFilteredFiles, onFilesChange]);

  // ファイルを削除
  const handleDelete = useCallback(async (fileId: string) => {
    setIsLoading(true);
    try {
      await deleteGraphvizYamlFile(fileId);
      await loadFiles(); // ファイル一覧を更新
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error('ファイルの削除に失敗:', error);
      alert(`ファイルの削除に失敗しました: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadFiles]);

  // Graphvizページに遷移（ファイルIDをクエリパラメータで渡す）
  const handleOpenFile = useCallback(async (fileId: string) => {
    try {
      // ファイル情報を取得
      const file = await getAllGraphvizYamlFiles(organizationId).then(files => 
        files.find(f => f.id === fileId)
      );
      
      if (!file) {
        // ファイルが見つからない場合は通常の遷移
        router.push(`/graphviz?fileId=${fileId}&organizationId=${organizationId}`);
        return;
      }
      
      // YAMLコンテンツをパース
      try {
        const parsed = yaml.load(file.yamlContent) as any;
        const yamlType = file.yamlType || parsed?.type;
        
        if (yamlType === 'site-topology') {
          // site-topologyタイプの場合、最初のsiteのIDを取得
          if (parsed?.sites && Array.isArray(parsed.sites) && parsed.sites.length > 0) {
            const firstSiteId = parsed.sites[0].id;
            if (firstSiteId) {
              router.push(`/graphviz?fileId=${fileId}&organizationId=${organizationId}&siteId=${encodeURIComponent(firstSiteId)}&tab=tab0`);
              return;
            }
          }
        } else if (yamlType === 'site-equipment') {
          // site-equipmentタイプの場合、siteIdを取得
          if (parsed?.siteId) {
            const siteId = parsed.siteId;
            router.push(`/graphviz?fileId=${fileId}&organizationId=${organizationId}&siteId=${encodeURIComponent(siteId)}&tab=tab0`);
            return;
          }
        } else if (yamlType === 'rack-servers') {
          // rack-serversタイプの場合、rackIdを取得し、そのラックが属する棟のsiteIdも取得
          if (parsed?.rackId) {
            const rackId = parsed.rackId;
            // ラックが属する棟のsiteIdを検索
            try {
              const allFiles = await getAllGraphvizYamlFiles();
              const siteEquipmentFile = allFiles.find(f => {
                if (f.yamlType !== 'site-equipment' || f.organizationId !== organizationId) {
                  return false;
                }
                if (!f.yamlContent) return false;
                try {
                  const siteEqParsed = yaml.load(f.yamlContent) as any;
                  if (siteEqParsed?.racks && Array.isArray(siteEqParsed.racks)) {
                    return siteEqParsed.racks.some((rack: any) => rack.id === rackId);
                  }
                  return false;
                } catch {
                  return false;
                }
              });
              
              if (siteEquipmentFile && siteEquipmentFile.yamlContent) {
                try {
                  const siteEqParsed = yaml.load(siteEquipmentFile.yamlContent) as any;
                  const siteId = siteEqParsed?.siteId;
                  if (siteId) {
                    router.push(`/graphviz?fileId=${fileId}&organizationId=${organizationId}&siteId=${encodeURIComponent(siteId)}&rackId=${encodeURIComponent(rackId)}&tab=tab0`);
                    return;
                  }
                } catch (e) {
                  console.warn('site-equipmentのパースに失敗:', e);
                }
              }
            } catch (error) {
              console.error('siteIdの検索に失敗:', error);
            }
            // siteIdが見つからない場合でも、rackIdのみで遷移
            router.push(`/graphviz?fileId=${fileId}&organizationId=${organizationId}&rackId=${encodeURIComponent(rackId)}&tab=tab0`);
            return;
          }
        } else if (yamlType === 'server-details') {
          // server-detailsタイプの場合、serverIdを取得し、そのサーバーが属するrackIdとsiteIdも検索
          if (parsed?.serverId) {
            const serverId = parsed.serverId;
            let rackIdForServer: string | undefined;
            let siteIdForServer: string | undefined;
            
            // serverIdを含むrack-serversファイルを検索
            try {
              const allFiles = await getAllGraphvizYamlFiles(organizationId);
              let rackServersFile = allFiles.find(f => {
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
              
              // rack-serversで見つからない場合、site-equipmentのequipmentを検索
              if (!rackServersFile) {
                const siteEquipmentFile = allFiles.find(f => {
                  if (f.yamlType !== 'site-equipment' || f.organizationId !== organizationId) {
                    return false;
                  }
                  if (!f.yamlContent) return false;
                  try {
                    const siteEqParsed = yaml.load(f.yamlContent) as any;
                    // racks[].equipment[]の中にserverIdがあるかチェック
                    const hasServer = siteEqParsed?.racks?.some((rack: any) => 
                      rack.equipment?.some((eq: any) => eq.id === serverId && eq.type === 'server')
                    );
                    if (hasServer) {
                      // 該当するrackIdを取得
                      const foundRack = siteEqParsed?.racks?.find((rack: any) => 
                        rack.equipment?.some((eq: any) => eq.id === serverId && eq.type === 'server')
                      );
                      if (foundRack) {
                        rackIdForServer = foundRack.id;
                        siteIdForServer = siteEqParsed?.siteId;
                      }
                    }
                    return hasServer;
                  } catch {
                    return false;
                  }
                });
              }
              
              if (rackServersFile && rackServersFile.yamlContent) {
                try {
                  const rackServersParsed = yaml.load(rackServersFile.yamlContent) as any;
                  rackIdForServer = rackServersParsed?.rackId;
                  
                  // rackIdからsiteIdを検索
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
            } catch (error) {
              console.error('rackId/siteIdの検索に失敗:', error);
            }
            
            // 階層情報を構築して遷移
            const params = new URLSearchParams();
            params.set('fileId', fileId);
            if (organizationId) params.set('organizationId', organizationId);
            if (siteIdForServer) params.set('siteId', encodeURIComponent(siteIdForServer));
            if (rackIdForServer) params.set('rackId', encodeURIComponent(rackIdForServer));
            params.set('serverId', encodeURIComponent(serverId));
            params.set('tab', 'tab0');
            router.push(`/graphviz?${params.toString()}`);
            return;
          }
        }
      } catch (e) {
        console.warn('YAMLのパースに失敗:', e);
      }
      
      // 通常の遷移
      router.push(`/graphviz?fileId=${fileId}&organizationId=${organizationId}`);
    } catch (error) {
      console.error('ファイル情報の取得に失敗:', error);
      // エラー時は通常の遷移
      router.push(`/graphviz?fileId=${fileId}&organizationId=${organizationId}`);
    }
  }, [router, organizationId]);

  // 親ファイル一覧を取得
  const loadParentFiles = useCallback(async (type: string) => {
    setLoadingParentFiles(true);
    try {
      const allFiles = await getAllGraphvizYamlFiles(organizationId);
      let parentType: string | null = null;
      
      // タイプに応じて親タイプを決定
      switch (type) {
        case 'site-equipment':
          parentType = 'site-topology';
          break;
        case 'rack-servers':
          parentType = 'site-equipment';
          break;
        case 'server-details':
          parentType = 'rack-servers';
          break;
        default:
          parentType = null;
      }
      
      if (!parentType) {
        setParentFiles([]);
        setLoadingParentFiles(false);
        return;
      }
      
      // 親タイプのファイルをフィルタリング
      // yamlTypeが設定されていない場合は、YAMLコンテンツからtypeを読み取る
      const filtered = allFiles
        .filter(file => {
          // まずyamlTypeをチェック
          if (file.yamlType === parentType) {
            return true;
          }
          
          // yamlTypeが設定されていない、または一致しない場合は、YAMLコンテンツからtypeを読み取る
          try {
            const parsed = yaml.load(file.yamlContent) as any;
            const yamlContentType = parsed?.type;
            return yamlContentType === parentType;
          } catch {
            return false;
          }
        })
        .map(file => {
          try {
            const parsed = yaml.load(file.yamlContent) as any;
            return {
              id: file.id,
              name: file.name,
              data: parsed,
            };
          } catch {
            return null;
          }
        })
        .filter((f): f is { id: string; name: string; data: any } => f !== null);
      
      console.log('🔄 [loadParentFiles] 親ファイル検索結果:', {
        type,
        parentType,
        allFilesCount: allFiles.length,
        filteredCount: filtered.length,
        filtered: filtered.map(f => ({ id: f.id, name: f.name, type: f.data?.type })),
      });
      
      setParentFiles(filtered);
    } catch (error) {
      console.error('親ファイル一覧の取得に失敗:', error);
      setParentFiles([]);
    } finally {
      setLoadingParentFiles(false);
    }
  }, [organizationId]);
  
  // 親カードが選択されたときに、そのカード内のSite一覧を取得
  const handleParentIdChange = useCallback((parentId: string) => {
    setNewGraphvizParentId(parentId);
    setSelectedSiteId(''); // Site IDをリセット
    
    // site-equipmentの場合、親カード内のSite一覧を取得
    if (newGraphvizType === 'site-equipment' && parentId) {
      const parentFile = parentFiles.find(f => f.id === parentId);
      if (parentFile && parentFile.data && parentFile.data.sites && Array.isArray(parentFile.data.sites)) {
        const sites = parentFile.data.sites.map((site: any) => ({
          id: site.id || '',
          label: site.label || site.id || '',
        })).filter((site: { id: string; label: string }) => site.id);
        setSelectedParentSites(sites);
        console.log('🔄 [handleParentIdChange] Site一覧を取得:', { parentId, sitesCount: sites.length, sites });
      } else {
        setSelectedParentSites([]);
      }
    } else {
      setSelectedParentSites([]);
    }
  }, [newGraphvizType, parentFiles]);
  
  // タイプ変更時に親ファイル一覧を更新
  const handleTypeChange = useCallback((type: string) => {
    setNewGraphvizType(type);
    setNewGraphvizParentId(''); // 親IDをリセット
    setSelectedSiteId(''); // Site IDをリセット
    setSelectedParentSites([]); // Site一覧をリセット
    loadParentFiles(type);
  }, [loadParentFiles]);
  
  // 追加モーダルを開く
  const handleOpenAddModal = useCallback(() => {
    const newId = generateGraphvizId();
    setNewGraphvizId(newId);
    setNewGraphvizName('');
    setNewGraphvizDescription('');
    setNewGraphvizType('site-topology'); // デフォルトはsite-topology
    setNewGraphvizParentId('');
    setSelectedSiteId('');
    setSelectedParentSites([]);
    loadParentFiles('site-topology');
    setShowAddGraphvizModal(true);
  }, [generateGraphvizId, loadParentFiles]);

  // YAMLテンプレートを生成
  const generateYamlTemplate = useCallback((type: string, name: string, description: string, parentId?: string, siteId?: string): string => {
    const id = name.replace(/\s+/g, '_');
    
    // 親ファイルからIDを取得
    let parentReferenceId = '';
    
    if (type === 'site-equipment' && siteId) {
      // site-equipmentの場合、選択されたSite IDを使用
      parentReferenceId = siteId;
    } else if (parentId) {
      const parentFile = parentFiles.find(f => f.id === parentId);
      if (parentFile && parentFile.data) {
        // タイプに応じて親ファイルから適切なIDを取得
        if (type === 'rack-servers') {
          // site-equipmentから最初のrack.idを取得
          if (parentFile.data.racks && parentFile.data.racks.length > 0) {
            parentReferenceId = parentFile.data.racks[0].id || '';
          } else {
            // racksが空の場合は、親ファイルのidを使用（後で手動で設定）
            parentReferenceId = parentFile.data.id || '';
          }
        } else if (type === 'server-details') {
          // rack-serversから最初のserver.idを取得
          if (parentFile.data.servers && parentFile.data.servers.length > 0) {
            parentReferenceId = parentFile.data.servers[0].id || '';
          } else {
            // serversが空の場合は、親ファイルのidを使用（後で手動で設定）
            parentReferenceId = parentFile.data.id || '';
          }
        }
      }
    }
    
    switch (type) {
      case 'site-topology':
        return `id: ${id}
type: site-topology
label: ${name}
description: ${description || ''}
sites: []
connections: []
`;
      case 'site-equipment':
        return `id: ${id}
type: site-equipment
label: ${name}
description: ${description || ''}
siteId: "${parentReferenceId}"
racks: []
connections: []
`;
      case 'rack-servers':
        return `id: ${id}
type: rack-servers
label: ${name}
description: ${description || ''}
rackId: "${parentReferenceId}"
servers: []
`;
      case 'server-details':
        return `id: ${id}
type: server-details
label: ${name}
description: ${description || ''}
serverId: "${parentReferenceId}"
os: {}
middleware: []
applications: []
sequences: []
`;
      case 'topology':
        return `id: ${id}
type: topology
label: ${name}
description: ${description || ''}
layers: []
nodes: []
edges: []
`;
      case 'device':
        return `id: ${id}
type: device
label: ${name}
description: ${description || ''}
ports: []
`;
      case 'links':
        return `id: ${id}
type: links
label: ${name}
description: ${description || ''}
connections: []
`;
      case 'intent':
        return `id: ${id}
type: intent
label: ${name}
description: ${description || ''}
rules: []
`;
      default:
        return `id: ${id}
type: ${type}
label: ${name}
description: ${description || ''}
`;
    }
  }, [parentFiles]);

  // Graphvizファイルを追加
  const handleAddGraphviz = useCallback(async () => {
    if (!newGraphvizName.trim()) {
      alert('名前を入力してください');
      return;
    }

    try {
      setSavingGraphviz(true);
      
      // 選択されたタイプに応じてYAMLテンプレートを生成
      const emptyYaml = generateYamlTemplate(
        newGraphvizType, 
        newGraphvizName, 
        newGraphvizDescription, 
        newGraphvizParentId,
        newGraphvizType === 'site-equipment' ? selectedSiteId : undefined
      );

      // YAMLタイプを検出
      const parsed = parseYamlFile(emptyYaml);
      const detectedYamlType = parsed?.type || newGraphvizType;
      
      await createGraphvizYamlFile(
        newGraphvizName.trim(),
        emptyYaml,
        {
          description: newGraphvizDescription.trim() || undefined,
          yamlType: detectedYamlType !== 'unknown' ? detectedYamlType : newGraphvizType,
          organizationId: organizationId,
        }
      );
      
      // ファイル一覧を更新
      await loadFiles();
      
      // モーダルを閉じてフォームをリセット
      setShowAddGraphvizModal(false);
      setNewGraphvizName('');
      setNewGraphvizDescription('');
      setNewGraphvizType('site-topology');
      setNewGraphvizParentId('');
      setNewGraphvizId('');
    } catch (error: any) {
      console.error('Graphvizファイルの追加に失敗:', error);
      alert(`追加に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingGraphviz(false);
    }
  }, [newGraphvizName, newGraphvizDescription, newGraphvizType, newGraphvizParentId, selectedSiteId, organizationId, loadFiles, generateYamlTemplate]);
  
  // 編集開始
  const handleStartEdit = useCallback((file: GraphvizYamlFile) => {
    setEditingGraphvizId(file.id);
    setEditingGraphvizName(file.name);
  }, []);
  
  // 編集キャンセル
  const handleCancelEdit = useCallback(() => {
    setEditingGraphvizId(null);
    setEditingGraphvizName('');
  }, []);
  
  // 編集保存
  const handleSaveEdit = useCallback(async (fileId: string) => {
    if (!editingGraphvizName.trim()) {
      alert('名前を入力してください');
      return;
    }
    
    try {
      setSavingEdit(true);
      
      await updateGraphvizYamlFile(fileId, {
        name: editingGraphvizName.trim(),
      });
      
      // ファイル一覧を再読み込み
      await loadFiles();
      
      // 編集モードを終了
      setEditingGraphvizId(null);
      setEditingGraphvizName('');
    } catch (error: any) {
      console.error('編集の保存に失敗:', error);
      alert(`編集の保存に失敗しました: ${error.message || '不明なエラー'}`);
    } finally {
      setSavingEdit(false);
    }
  }, [editingGraphvizName, loadFiles]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  return (
    <div ref={tabRef}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => onDownloadImage && onDownloadImage('graphviz')}
          title="Graphvizを画像としてダウンロード"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            padding: 0,
            fontSize: '14px',
            color: '#6B7280',
            backgroundColor: 'transparent',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
            e.currentTarget.style.borderColor = '#D1D5DB';
            e.currentTarget.style.color = '#374151';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = '#E5E7EB';
            e.currentTarget.style.color = '#6B7280';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 2.5V12.5M10 12.5L6.25 8.75M10 12.5L13.75 8.75M2.5 15V16.25C2.5 16.913 3.037 17.5 3.75 17.5H16.25C16.963 17.5 17.5 16.913 17.5 16.25V15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
            Graphviz ({files.length}件)
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <ViewModeSelector viewMode={viewMode} onViewModeChange={setViewMode} />
            <button
              onClick={handleOpenAddModal}
              style={{
                padding: '8px 16px',
                backgroundColor: '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#059669';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#10B981';
              }}
            >
              + 追加
            </button>
          </div>
        </div>
        
        <HierarchyFilterButtons 
          hierarchyFilter={hierarchyFilter} 
          onFilterChange={handleHierarchyFilterChange} 
        />
      </div>
      {isLoading && files.length === 0 ? (
        <p style={{ color: 'var(--color-text-light)', padding: '20px', textAlign: 'center' }}>
          読み込み中...
        </p>
      ) : files.length === 0 ? (
        <p style={{ color: 'var(--color-text-light)', padding: '20px', textAlign: 'center' }}>
          Graphvizファイルが登録されていません
        </p>
      ) : viewMode === 'card' ? (
        <CardView
          files={files}
          editingGraphvizId={editingGraphvizId}
          editingGraphvizName={editingGraphvizName}
          savingEdit={savingEdit}
          onFileClick={handleOpenFile}
          onStartEdit={handleStartEdit}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveEdit}
          onEditNameChange={setEditingGraphvizName}
          onDeleteClick={(fileId, fileName) => setDeleteConfirm({ isOpen: true, fileId, fileName })}
        />
      ) : viewMode === 'list' ? (
        <ListView
          files={files}
          editingGraphvizId={editingGraphvizId}
          editingGraphvizName={editingGraphvizName}
          savingEdit={savingEdit}
          onFileClick={handleOpenFile}
          onStartEdit={handleStartEdit}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveEdit}
          onEditNameChange={setEditingGraphvizName}
          onDeleteClick={(fileId, fileName) => setDeleteConfirm({ isOpen: true, fileId, fileName })}
        />
      ) : (
        <FinderView
          allFiles={allFiles}
          editingGraphvizId={editingGraphvizId}
          editingGraphvizName={editingGraphvizName}
          savingEdit={savingEdit}
          onFileClick={handleOpenFile}
          onStartEdit={handleStartEdit}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveEdit}
          onEditNameChange={setEditingGraphvizName}
          onDeleteClick={(fileId, fileName) => setDeleteConfirm({ isOpen: true, fileId, fileName })}
          getFilteredFiles={getFilteredFiles}
        />
      )}

      {/* 追加モーダル */}
      <AddGraphvizModal
        isOpen={showAddGraphvizModal}
        newGraphvizId={newGraphvizId}
        newGraphvizName={newGraphvizName}
        newGraphvizDescription={newGraphvizDescription}
        newGraphvizType={newGraphvizType}
        newGraphvizParentId={newGraphvizParentId}
        selectedSiteId={selectedSiteId}
        selectedParentSites={selectedParentSites}
        parentFiles={parentFiles}
        loadingParentFiles={loadingParentFiles}
        savingGraphviz={savingGraphviz}
        onClose={() => {
          setShowAddGraphvizModal(false);
          setNewGraphvizName('');
          setNewGraphvizDescription('');
          setNewGraphvizType('site-topology');
          setNewGraphvizParentId('');
          setSelectedSiteId('');
          setSelectedParentSites([]);
          setNewGraphvizId('');
        }}
        onSave={handleAddGraphviz}
        onNameChange={setNewGraphvizName}
        onDescriptionChange={setNewGraphvizDescription}
        onTypeChange={handleTypeChange}
        onParentIdChange={handleParentIdChange}
        onSiteIdChange={setSelectedSiteId}
      />

      {/* 削除確認モーダル */}
      {deleteConfirm && (
        <DeleteConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm.fileId)}
        />
      )}
    </div>
  );
}

