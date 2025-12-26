# タブ0: 全体俯瞰UI 技術設計書

## Graphvizでのクリックイベント処理

### 方法1: SVG要素への直接イベントリスナー（推奨）

Graphvizが生成するSVG要素に直接イベントリスナーを追加する方法。

#### 実装手順

1. **DOT生成時にノードIDを保持**
   ```typescript
   const nodeIdMap = new Map<string, { type: string, data: any }>();
   
   function generateHierarchicalDot(data: HierarchicalData): string {
     let dotCode = 'digraph G {\n';
     
     // 各ノードに一意のIDを付与
     for (const site of data.sites) {
       const nodeId = `site_${site.id}`;
       nodeIdMap.set(nodeId, { type: 'site', data: site });
       dotCode += `  ${nodeId} [label="${site.label}", shape=box];\n`;
     }
     
     return dotCode;
   }
   ```

2. **SVGレンダリング後のイベントリスナー追加**
   ```typescript
   useEffect(() => {
     const svgElement = document.querySelector('#graphviz-container svg');
     if (!svgElement) return;
     
     // すべてのノード要素（g要素）にイベントリスナーを追加
     const nodeElements = svgElement.querySelectorAll('g.node');
     
     nodeElements.forEach((nodeElement) => {
       const titleElement = nodeElement.querySelector('title');
       const nodeId = titleElement?.textContent;
       
       if (nodeId && nodeIdMap.has(nodeId)) {
         nodeElement.style.cursor = 'pointer';
         nodeElement.addEventListener('click', (e) => {
           e.stopPropagation();
           handleNodeClick(nodeId);
         });
         
         // ホバー効果
         nodeElement.addEventListener('mouseenter', () => {
           nodeElement.style.opacity = '0.7';
         });
         nodeElement.addEventListener('mouseleave', () => {
           nodeElement.style.opacity = '1';
         });
       }
     });
     
     return () => {
       // クリーンアップ
       nodeElements.forEach((nodeElement) => {
         nodeElement.removeEventListener('click', handleNodeClick);
       });
     };
   }, [dotCode, nodeIdMap]);
   ```

3. **ノードIDのマッピング**
   ```typescript
   // DOT生成時にノードIDと実際のデータIDをマッピング
   const nodeIdToDataId = new Map<string, string>();
   
   // 例: site_tokyo → site_tokyo (実際のデータID)
   nodeIdToDataId.set('site_tokyo', 'site_tokyo');
   ```

### 方法2: GraphvizのURL属性を利用

Graphvizの`URL`属性を使用してクリック可能なリンクを作成。

#### 実装手順

1. **DOT生成時にURL属性を追加**
   ```typescript
   function generateHierarchicalDot(data: HierarchicalData): string {
     let dotCode = 'digraph G {\n';
     
     for (const site of data.sites) {
       const nodeId = `site_${site.id}`;
       // URL属性にカスタムプロトコルを使用
       dotCode += `  ${nodeId} [
         label="${site.label}",
         shape=box,
         URL="graphviz://site/${site.id}",
         tooltip="クリックで棟内機器構成を表示"
       ];\n`;
     }
     
     return dotCode;
   }
   ```

2. **カスタムプロトコルハンドラーの実装**
   ```typescript
   useEffect(() => {
     const handleCustomProtocol = (e: MouseEvent) => {
       const target = e.target as HTMLElement;
       const href = target.getAttribute('href') || target.closest('a')?.getAttribute('href');
       
       if (href && href.startsWith('graphviz://')) {
         e.preventDefault();
         const [, type, id] = href.split('/');
         handleNodeClick(id, type);
       }
     };
     
     document.addEventListener('click', handleCustomProtocol);
     return () => {
       document.removeEventListener('click', handleCustomProtocol);
     };
   }, []);
   ```

### 方法3: データ属性を利用（最も柔軟）

SVG要素にデータ属性を追加して、クリック時にデータを取得。

#### 実装手順

1. **DOT生成時にデータ属性を追加（Graphvizでは直接不可）**
   - Graphvizの制約により、直接データ属性は追加できない
   - レンダリング後にJavaScriptで追加

2. **レンダリング後のデータ属性追加**
   ```typescript
   useEffect(() => {
     const svgElement = document.querySelector('#graphviz-container svg');
     if (!svgElement) return;
     
     const nodeElements = svgElement.querySelectorAll('g.node');
     
     nodeElements.forEach((nodeElement) => {
       const titleElement = nodeElement.querySelector('title');
       const nodeId = titleElement?.textContent;
       
       if (nodeId) {
         const nodeInfo = nodeIdMap.get(nodeId);
         if (nodeInfo) {
           // データ属性を追加
           nodeElement.setAttribute('data-node-id', nodeId);
           nodeElement.setAttribute('data-node-type', nodeInfo.type);
           nodeElement.setAttribute('data-node-data-id', nodeInfo.data.id);
           
           // クリックイベント
           nodeElement.addEventListener('click', (e) => {
             const clickedNodeId = (e.currentTarget as HTMLElement).getAttribute('data-node-data-id');
             const clickedNodeType = (e.currentTarget as HTMLElement).getAttribute('data-node-type');
             if (clickedNodeId && clickedNodeType) {
               handleNodeClick(clickedNodeId, clickedNodeType as any);
             }
           });
         }
       }
     });
   }, [dotCode]);
   ```

## データ取得API設計

### API関数の定義

```typescript
// lib/graphvizHierarchyApi.ts

/**
 * 全棟間ネットワークを取得（タブ1のデータ）
 */
export async function getAllSiteTopologies(
  organizationId?: string
): Promise<SiteTopology[]> {
  // タブ1のデータを取得
  const files = await getAllGraphvizYamlFiles(organizationId);
  return files
    .filter(file => {
      try {
        const parsed = yaml.load(file.yamlContent);
        return parsed?.type === 'site-topology';
      } catch {
        return false;
      }
    })
    .map(file => {
      const parsed = yaml.load(file.yamlContent);
      return {
        ...parsed,
        fileId: file.id,
      };
    });
}

/**
 * 棟内機器構成を取得（タブ2のデータ）
 */
export async function getSiteEquipmentBySiteId(
  siteId: string,
  organizationId?: string
): Promise<SiteEquipment | null> {
  const files = await getAllGraphvizYamlFiles(organizationId);
  for (const file of files) {
    try {
      const parsed = yaml.load(file.yamlContent);
      if (parsed?.type === 'site-equipment' && parsed?.siteId === siteId) {
        return {
          ...parsed,
          fileId: file.id,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * ラック内サーバーを取得（タブ3のデータ）
 */
export async function getRackServersByRackId(
  rackId: string,
  organizationId?: string
): Promise<RackServers | null> {
  const files = await getAllGraphvizYamlFiles(organizationId);
  for (const file of files) {
    try {
      const parsed = yaml.load(file.yamlContent);
      if (parsed?.type === 'rack-servers' && parsed?.rackId === rackId) {
        return {
          ...parsed,
          fileId: file.id,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * サーバー詳細を取得（タブ4のデータ）
 */
export async function getServerDetailsByServerId(
  serverId: string,
  organizationId?: string
): Promise<ServerDetails | null> {
  const files = await getAllGraphvizYamlFiles(organizationId);
  for (const file of files) {
    try {
      const parsed = yaml.load(file.yamlContent);
      if (parsed?.type === 'server-details' && parsed?.serverId === serverId) {
        return {
          ...parsed,
          fileId: file.id,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * 階層的なデータを統合して取得
 */
export async function getHierarchicalData(
  organizationId?: string
): Promise<HierarchicalData> {
  // 1. 全棟データを取得
  const sites = await getAllSiteTopologies(organizationId);
  
  // 2. 各棟の機器構成を取得
  const hierarchicalSites = await Promise.all(
    sites.map(async (site) => {
      const equipment = await getSiteEquipmentBySiteId(site.id, organizationId);
      
      if (!equipment) {
        return {
          ...site,
          racks: [],
        };
      }
      
      // 3. 各ラックのサーバーを取得
      const racks = await Promise.all(
        (equipment.racks || []).map(async (rack) => {
          const rackServers = await getRackServersByRackId(rack.id, organizationId);
          
          // 4. 各サーバーの詳細を取得
          const servers = await Promise.all(
            (rackServers?.servers || []).map(async (server) => {
              const serverDetails = await getServerDetailsByServerId(
                server.id,
                organizationId
              );
              return {
                ...server,
                details: serverDetails || undefined,
              };
            })
          );
          
          return {
            ...rack,
            servers: servers.length > 0 ? servers : undefined,
          };
        })
      );
      
      return {
        ...site,
        racks: racks,
      };
    })
  );
  
  return {
    sites: hierarchicalSites,
  };
}
```

## DOT生成ロジックの詳細

### 階層レベル別のDOT生成

```typescript
function generateHierarchicalDot(
  data: HierarchicalData,
  level: 'all' | 'sites' | 'racks' | 'equipment' = 'all'
): string {
  let dotCode = 'digraph G {\n';
  dotCode += '  rankdir=TB;\n';  // 上から下へ
  dotCode += '  node [shape=box, style=rounded];\n';
  dotCode += '  edge [arrowhead=normal];\n\n';
  
  switch (level) {
    case 'all':
      // 全棟を表示
      dotCode += generateSitesLevel(data.sites);
      break;
    case 'sites':
      // 選択された棟のラックを表示
      dotCode += generateRacksLevel(data.sites, selectedSiteId);
      break;
    case 'racks':
      // 選択されたラックの機器を表示
      dotCode += generateEquipmentLevel(data.sites, selectedSiteId, selectedRackId);
      break;
    case 'equipment':
      // 選択された機器の詳細を表示
      dotCode += generateEquipmentDetailsLevel(data.sites, selectedSiteId, selectedRackId, selectedEquipmentId);
      break;
  }
  
  dotCode += '}\n';
  return dotCode;
}

function generateSitesLevel(sites: SiteNode[]): string {
  let dotCode = '';
  
  for (const site of sites) {
    const nodeId = `site_${site.id}`;
    dotCode += `  ${nodeId} [
      label="${site.label}\\n${site.location?.address || ''}",
      shape=box,
      style=rounded,
      fillcolor=lightblue,
      color=blue,
      penwidth=2
    ];\n`;
    
    // 棟間の接続
    if (site.connections) {
      for (const conn of site.connections) {
        const fromId = `site_${conn.from}`;
        const toId = `site_${conn.to}`;
        dotCode += `  ${fromId} -> ${toId} [
          label="${conn.bandwidth || ''}",
          color=gray,
          style=dashed
        ];\n`;
      }
    }
  }
  
  return dotCode;
}

function generateRacksLevel(sites: SiteNode[], selectedSiteId: string): string {
  let dotCode = '';
  
  const selectedSite = sites.find(s => s.id === selectedSiteId);
  if (!selectedSite || !selectedSite.racks) {
    return '  // データがありません\n';
  }
  
  // 棟ノード
  const siteNodeId = `site_${selectedSite.id}`;
  dotCode += `  ${siteNodeId} [
    label="${selectedSite.label}",
    shape=box,
    style=rounded,
    fillcolor=lightblue,
    color=blue,
    penwidth=2
  ];\n`;
  
  // ラックをクラスターとして表示
  for (const rack of selectedSite.racks) {
    const clusterId = `cluster_rack_${rack.id}`;
    dotCode += `  subgraph ${clusterId} {\n`;
    dotCode += `    label="${rack.label}";\n`;
    dotCode += `    style=rounded;\n`;
    dotCode += `    color=green;\n`;
    
    const rackNodeId = `rack_${rack.id}`;
    dotCode += `    ${rackNodeId} [
      label="${rack.label}\\n${rack.location?.floor || ''}階 ${rack.location?.row || ''}列",
      shape=box,
      fillcolor=lightgreen,
      color=green
    ];\n`;
    
    // 棟からラックへの接続
    dotCode += `    ${siteNodeId} -> ${rackNodeId} [style=dashed, color=gray];\n`;
    
    dotCode += '  }\n';
  }
  
  return dotCode;
}
```

## 状態管理の詳細

### 階層状態の型定義

```typescript
interface HierarchyState {
  // 現在の表示レベル
  currentLevel: 'all' | 'sites' | 'racks' | 'equipment' | 'server-details';
  
  // 選択されたノード
  selectedSiteId?: string;
  selectedRackId?: string;
  selectedEquipmentId?: string;
  selectedServerId?: string;
  
  // ブレッドクラム
  breadcrumbs: BreadcrumbItem[];
  
  // 読み込み状態
  isLoading: boolean;
  error: string | null;
  
  // データ
  hierarchicalData: HierarchicalData | null;
}

interface BreadcrumbItem {
  id: string;
  label: string;
  type: 'all' | 'site' | 'rack' | 'equipment' | 'server';
  onClick: () => void;
}
```

### 状態更新のロジック

```typescript
const [hierarchyState, setHierarchyState] = useState<HierarchyState>({
  currentLevel: 'all',
  breadcrumbs: [],
  isLoading: false,
  error: null,
  hierarchicalData: null,
});

const handleNodeClick = async (
  nodeId: string,
  nodeType: 'site' | 'rack' | 'equipment' | 'server'
) => {
  setHierarchyState(prev => ({ ...prev, isLoading: true, error: null }));
  
  try {
    switch (nodeType) {
      case 'site':
        // 棟をクリック → ラックレベルを表示
        const siteEquipment = await getSiteEquipmentBySiteId(nodeId, organizationId);
        setHierarchyState(prev => ({
          ...prev,
          currentLevel: 'racks',
          selectedSiteId: nodeId,
          selectedRackId: undefined,
          selectedEquipmentId: undefined,
          breadcrumbs: [
            ...prev.breadcrumbs,
            { id: nodeId, label: siteEquipment?.label || nodeId, type: 'site', onClick: () => {} },
          ],
        }));
        break;
        
      case 'rack':
        // ラックをクリック → 機器レベルを表示
        setHierarchyState(prev => ({
          ...prev,
          currentLevel: 'equipment',
          selectedRackId: nodeId,
          selectedEquipmentId: undefined,
          breadcrumbs: [
            ...prev.breadcrumbs,
            { id: nodeId, label: 'ラック', type: 'rack', onClick: () => {} },
          ],
        }));
        break;
        
      case 'equipment':
        // 機器をクリック → 機器詳細またはタブ遷移
        const equipment = findEquipment(nodeId);
        if (equipment?.type === 'server') {
          // サーバーの場合はタブ4に遷移
          router.push(`/graphviz?tab=tab4&serverId=${nodeId}&organizationId=${organizationId}`);
        } else {
          // その他の機器はタブ2に遷移
          router.push(`/graphviz?tab=tab2&equipmentId=${nodeId}&organizationId=${organizationId}`);
        }
        break;
        
      case 'server':
        // サーバーをクリック → タブ4に遷移
        router.push(`/graphviz?tab=tab4&serverId=${nodeId}&organizationId=${organizationId}`);
        break;
    }
  } catch (error) {
    setHierarchyState(prev => ({
      ...prev,
      error: error.message,
    }));
  } finally {
    setHierarchyState(prev => ({ ...prev, isLoading: false }));
  }
};
```

## パフォーマンス最適化

### データの遅延読み込み

```typescript
// 初期表示は棟レベルまで
const [loadedLevels, setLoadedLevels] = useState<Set<string>>(new Set(['sites']));

const loadLevelData = async (level: string) => {
  if (loadedLevels.has(level)) {
    return; // 既に読み込み済み
  }
  
  // 必要なデータを読み込む
  // ...
  
  setLoadedLevels(prev => new Set([...prev, level]));
};
```

### Graphvizレンダリングの最適化

- 大量ノード時は簡略化表示
- ズーム・パン機能の実装
- レンダリングの非同期処理

## まとめ

この技術設計書に基づいて、段階的に実装を進めることで、階層的な全体俯瞰UIを実現できます。特に重要なのは：

1. **Graphvizでのクリックイベント処理**: SVG要素への直接イベントリスナー追加が最も確実
2. **データ取得API**: 各タブのデータを統合して取得するAPIの実装
3. **階層的なDOT生成**: レベルに応じた適切なDOT生成
4. **状態管理**: 階層状態とブレッドクラムの管理

