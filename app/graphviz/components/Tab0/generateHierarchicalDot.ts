/**
 * 階層的なGraphviz DOT生成
 * タブ0用のDOTコード生成ロジック
 */

import type { 
  SiteTopology, 
  Site, 
  Connection,
  SiteEquipment,
  Rack,
  Equipment,
  RackServers,
  Server,
} from '@/lib/graphvizHierarchyApi';

// ノードIDマッピング（クリックイベント用）
export interface NodeIdMapping {
  nodeId: string;
  type: 'site' | 'rack' | 'equipment' | 'server';
  dataId: string;
  label: string;
}

export interface DotGenerationResult {
  dotCode: string;
  nodeIdMap: Map<string, NodeIdMapping>;
}

/**
 * 棟レベルのDOT生成（最小実装）
 */
export function generateSitesDot(sites: SiteTopology[]): DotGenerationResult {
  const nodeIdMap = new Map<string, NodeIdMapping>();
  let dotCode = 'digraph G {\n';
  dotCode += '  rankdir=TB;\n';  // 上から下へ
  dotCode += '  node [shape=box, style=rounded];\n';
  dotCode += '  edge [arrowhead=normal];\n';
  dotCode += '  size="10,10";\n';
  dotCode += '  ratio=compress;\n\n';
  
  // 各棟トポロジから棟を収集
  const allSites: Array<{ site: Site; topologyId: string }> = [];
  const connections: Connection[] = [];
  
  for (const topology of sites) {
    if (topology.sites && Array.isArray(topology.sites)) {
      for (const site of topology.sites) {
        allSites.push({ site, topologyId: topology.id });
      }
    }
    if (topology.connections && Array.isArray(topology.connections)) {
      connections.push(...topology.connections);
    }
  }
  
  // 棟ノードを生成
  for (const { site, topologyId } of allSites) {
    const rawNodeId = `site_${site.id}`;
    const escapedNodeId = escapeNodeId(rawNodeId);
    
    // ノードIDマッピングに追加（引用符なしのIDをキーとして使用）
    // Graphvizは<title>要素に引用符なしのIDを保存するため
    nodeIdMap.set(rawNodeId, {
      nodeId: escapedNodeId,
      type: 'site',
      dataId: site.id,
      label: site.label,
    });
    
    // ラベルを生成
    let label = site.label;
    if (site.location?.address) {
      label += `\n${site.location.address}`;
    }
    if (site.capacity) {
      const capacityInfo: string[] = [];
      if (site.capacity.racks) {
        capacityInfo.push(`${site.capacity.racks}ラック`);
      }
      if (site.capacity.power) {
        capacityInfo.push(`${site.capacity.power}kW`);
      }
      if (capacityInfo.length > 0) {
        label += `\n[${capacityInfo.join(', ')}]`;
      }
    }
    
    dotCode += `  ${escapedNodeId} [
      label="${escapeLabel(label)}",
      shape=box3d,
      style="rounded,filled",
      fillcolor=lightblue,
      color=blue,
      penwidth=2
    ];\n`;
  }
  
  dotCode += '\n';
  
  // 棟間の接続
  for (const conn of connections) {
    const fromId = escapeNodeId(`site_${conn.from}`);
    const toId = escapeNodeId(`site_${conn.to}`);
    
    // 接続元・接続先のノードID（引用符なし）をチェック
    const fromRawId = `site_${conn.from}`;
    const toRawId = `site_${conn.to}`;
    
    // 接続先が存在するかチェック
    const fromExists = allSites.some(({ site }) => site.id === conn.from);
    const toExists = allSites.some(({ site }) => site.id === conn.to);
    
    if (!fromExists || !toExists) {
      console.warn('⚠️ 接続先の棟が存在しません:', { from: conn.from, to: conn.to });
      continue;
    }
    
    const attributes: string[] = [];
    
    if (conn.type) {
      attributes.push(`label="${escapeLabel(conn.type)}"`);
    }
    if (conn.bandwidth) {
      const existingLabel = attributes.find(attr => attr.startsWith('label='));
      if (existingLabel) {
        const labelValue = existingLabel.match(/label="([^"]*)"/)?.[1] || '';
        attributes[attributes.indexOf(existingLabel)] = `label="${escapeLabel(`${labelValue}\n${conn.bandwidth}`)}"`;
      } else {
        attributes.push(`label="${escapeLabel(conn.bandwidth)}"`);
      }
    }
    if (conn.provider) {
      attributes.push('color=blue');
    } else {
      attributes.push('color=gray');
    }
    attributes.push('style=dashed');
    
    if (attributes.length > 0) {
      dotCode += `  ${fromId} -> ${toId} [${attributes.join(', ')}];\n`;
    } else {
      dotCode += `  ${fromId} -> ${toId};\n`;
    }
  }
  
  dotCode += '}\n';
  
  return { dotCode, nodeIdMap };
}

/**
 * ノードIDをエスケープ
 */
function escapeNodeId(id: string): string {
  // GraphvizのノードIDをエスケープ
  // 英数字とアンダースコアのみ許可
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(id)) {
    return id;
  }
  // 特殊文字を含む場合は引用符で囲む
  // ただし、マッピングには引用符なしのIDを保存する
  return `"${id.replace(/"/g, '\\"')}"`;
}

/**
 * ノードIDから引用符を除去（マッピング用）
 */
function unescapeNodeId(id: string): string {
  return id.replace(/^["']|["']$/g, '');
}

/**
 * 棟内機器構成のDOT生成
 */
export function generateSiteEquipmentDot(
  siteEquipment: SiteEquipment,
  rackServersMap?: Map<string, RackServers>,
  filterRackId?: string  // 特定のラックのみを表示する場合のラックID
): DotGenerationResult {
  const nodeIdMap = new Map<string, NodeIdMapping>();
  let dotCode = 'digraph G {\n';
  dotCode += '  rankdir=TB;\n';  // ラックを横並びにするため、上から下へ（rank=sameで横並びにする）
  dotCode += '  node [shape=box, style=rounded];\n';
  dotCode += '  edge [arrowhead=normal];\n';
  dotCode += '  size="10,10";\n';
  dotCode += '  ratio=compress;\n\n';
  
  // ラックをクラスターとして生成（Tab2と同じ形式）
  if (siteEquipment.racks && Array.isArray(siteEquipment.racks)) {
    // filterRackIdが指定されている場合、そのラックのみを表示
    const racksToDisplay = filterRackId 
      ? siteEquipment.racks.filter(rack => rack.id === filterRackId)
      : siteEquipment.racks;
    
    // ラッククラスターのリストを保持（横並びにするため）
    const rackClusters: string[] = [];
    
    for (const rack of racksToDisplay) {
      const rawNodeId = `rack_${rack.id}`;
      const escapedNodeId = escapeNodeId(rawNodeId);
      const rackLabel = rack.label || rack.id;
      
      // ノードIDマッピングに追加（ラック用）
      nodeIdMap.set(rawNodeId, {
        nodeId: escapedNodeId,
        type: 'rack',
        dataId: rack.id,
        label: rack.label,
      });
      
      // ラックをクラスター（subgraph）として表示
      dotCode += `  subgraph cluster_${escapedNodeId} {\n`;
      dotCode += `    label="${escapeLabel(rackLabel)}";\n`;  // クラスターのラベルにラック名を表示
      dotCode += `    style=rounded;\n`;
      dotCode += `    rankdir=LR;\n`;  // クラスター内で横方向に配置（サーバーを縦に並べる）
      
      // ラックを表すクリック可能なノードを追加（クラスターの最初に配置）
      // ノードIDは既存のescapedNodeIdを使用（ノードIDマッピングと一致させるため）
      // このノードはクラスターのラベルとして機能し、クリック可能にする
      dotCode += `    ${escapedNodeId} [
      label="${escapeLabel(rackLabel)}",
      shape=box3d,
      style="rounded,filled",
      fillcolor=lightgray,
      color=gray,
      penwidth=2,
      fontcolor=white
    ];\n`;
      
      // ラック内の機器とサーバーを収集
      const allNodes: Array<{ id: string; escapedId: string; rawId: string; type: 'equipment' | 'server'; label: string }> = [];
      
      // ラックノードを最初に追加（クリック可能にするため）
      allNodes.unshift({
        id: escapedNodeId,
        escapedId: escapedNodeId,
        rawId: rawNodeId,
        type: 'rack' as any,
        label: rackLabel,
      });
      
      // ラック内の機器を生成（Tab2と同じ形式：機器IDを直接使用）
      if (rack.equipment && Array.isArray(rack.equipment)) {
        for (const equipment of rack.equipment) {
          // Tab2と同じように、機器IDを直接使用（プレフィックスなし）
          const escapedEquipmentNodeId = escapeNodeId(equipment.id);
          
          // ノードIDマッピングに追加（機器IDそのものをキーとして使用）
          nodeIdMap.set(equipment.id, {
            nodeId: escapedEquipmentNodeId,
            type: 'equipment',
            dataId: equipment.id,
            label: equipment.label,
          });
          
          // Tab2と同じように、ラベルはそのまま使用（追加情報は表示しない）
          const equipmentLabel = equipment.label || equipment.id;
          const equipmentColor = getEquipmentColor(equipment.type);
          
          dotCode += `    ${escapedEquipmentNodeId} [
            label="${escapeLabel(equipmentLabel)}",
            shape=box3d,
            style="rounded,filled",
            fillcolor=${equipmentColor.fill},
            color=${equipmentColor.border},
            penwidth=1.5
          ];\n`;
          
          allNodes.push({
            id: escapedEquipmentNodeId,
            escapedId: escapedEquipmentNodeId,
            rawId: equipment.id,
            type: 'equipment',
            label: equipmentLabel,
          });
        }
      }
      
      // ラック内のサーバーを生成（rackServersMapから取得、Tab2と同じ形式：サーバーIDを直接使用）
      if (rackServersMap && rackServersMap.has(rack.id)) {
        const rackServers = rackServersMap.get(rack.id)!;
        if (rackServers.servers && Array.isArray(rackServers.servers)) {
          for (const server of rackServers.servers) {
            // Tab2と同じように、サーバーIDを直接使用（プレフィックスなし）
            const escapedServerNodeId = escapeNodeId(server.id);
            
            // ノードIDマッピングに追加（サーバーIDそのものをキーとして使用）
            nodeIdMap.set(server.id, {
              nodeId: escapedServerNodeId,
              type: 'server',
              dataId: server.id,
              label: server.label,
            });
            
            let serverLabel = server.label;
            if (server.model) {
              serverLabel += `\n${server.model}`;
            }
            if (server.specs) {
              const specsInfo: string[] = [];
              if (server.specs.cpu) {
                specsInfo.push(`CPU: ${server.specs.cpu.cores || 'N/A'} cores`);
              }
              if (server.specs.memory) {
                specsInfo.push(`RAM: ${server.specs.memory.total || 'N/A'}`);
              }
              if (specsInfo.length > 0) {
                serverLabel += `\n${specsInfo.join(', ')}`;
              }
            }
            
            dotCode += `    ${escapedServerNodeId} [
              label="${escapeLabel(serverLabel)}",
              shape=box3d,
              style="rounded,filled",
              fillcolor=lightyellow,
              color=orange,
              penwidth=2
            ];\n`;
            
            allNodes.push({
              id: escapedServerNodeId,
              escapedId: escapedServerNodeId,
              rawId: server.id,
              type: 'server',
              label: serverLabel,
            });
          }
        }
      }
      
      // ノードを縦に並べるために不可視の接続を追加
      for (let i = 0; i < allNodes.length - 1; i++) {
        dotCode += `    ${allNodes[i].escapedId} -> ${allNodes[i + 1].escapedId} [style=invis];\n`;
      }
      
      dotCode += '  }\n';
      
      // ラッククラスターのIDを保存（横並びにするため）
      rackClusters.push(escapedNodeId);
    }
    
    // ラックを横並びにするために、各ラックの最初のノード（ラックノード）を同じランクに配置
    if (rackClusters.length > 1) {
      dotCode += '  { rank=same; ';
      dotCode += rackClusters.map(id => id).join('; ');
      dotCode += '; }\n';
    }
  }
  
  // 機器間の接続
  if (siteEquipment.connections && Array.isArray(siteEquipment.connections)) {
    for (const conn of siteEquipment.connections) {
      // 接続形式の判定：from/toが文字列か、オブジェクトか
      let fromDevice: string | undefined;
      let toDevice: string | undefined;
      
      if (typeof conn.from === 'string') {
        // 新しい形式: from/toが直接文字列
        fromDevice = conn.from;
        toDevice = typeof conn.to === 'string' ? conn.to : undefined;
      } else if (conn.from && typeof conn.from === 'object' && 'device' in conn.from) {
        // 既存の形式: from/toがオブジェクト（device, port）
        fromDevice = conn.from.device;
        toDevice = (conn.to && typeof conn.to === 'object' && 'device' in conn.to) ? conn.to.device : undefined;
      }
      
      if (!fromDevice || !toDevice) {
        console.warn('⚠️ [generateSiteEquipmentDot] 接続の形式が不正です:', conn);
        continue;
      }
      
      // nodeIdMapから機器IDで直接検索（Tab2と同じ形式：機器IDを直接使用）
      const fromMapping = nodeIdMap.get(fromDevice);
      const toMapping = nodeIdMap.get(toDevice);
      
      if (!fromMapping || !toMapping) {
        // ノードが見つからない場合のデバッグ情報
        console.warn('⚠️ [generateSiteEquipmentDot] 接続先のノードが見つかりません:', { 
          fromDevice, 
          toDevice,
          fromMapping: fromMapping ? 'found' : 'not found',
          toMapping: toMapping ? 'found' : 'not found',
          nodeIdMapKeys: Array.from(nodeIdMap.keys()).slice(0, 10), // 最初の10個だけ表示
          nodeIdMapEntries: Array.from(nodeIdMap.entries()).slice(0, 10).map(([key, value]) => ({ key, dataId: value.dataId }))
        });
        continue; // 接続をスキップ
      }
      
      // ノードIDがundefinedでないことを確認
      if (!fromMapping.nodeId || !toMapping.nodeId) {
        console.warn('⚠️ [generateSiteEquipmentDot] ノードIDがundefinedです:', { 
          fromMapping, 
          toMapping 
        });
        continue; // 接続をスキップ
      }
      
      const attributes: string[] = [];
      
      // ラベルを構築（複数の情報を結合）
      const labelParts: string[] = [];
      
      const connAny = conn as any; // 型安全性のためanyにキャスト（新しい形式のフィールドに対応）
      if (connAny.type) {
        labelParts.push(connAny.type);
      }
      if (connAny.bandwidth) {
        labelParts.push(connAny.bandwidth);
      }
      if (conn.network) {
        labelParts.push(conn.network);
      }
      if (conn.description) {
        labelParts.push(conn.description);
      }
      
      if (labelParts.length > 0) {
        attributes.push(`label="${escapeLabel(labelParts.join('\\n'))}"`);
      }
      
      // 接続タイプに応じて色を変更
      if (connAny.type === 'fiber') {
        attributes.push('color=orange');
      } else if (connAny.type === 'ethernet') {
        attributes.push('color=blue');
      } else {
        attributes.push('color=blue');
      }
      
      attributes.push('style=solid');
      
      // エスケープされたノードIDを使用
      dotCode += `  ${fromMapping.nodeId} -> ${toMapping.nodeId} [${attributes.join(', ')}];\n`;
    }
  }
  
  dotCode += '}\n';
  
  return { dotCode, nodeIdMap };
}

/**
 * ラック内サーバーのDOT生成
 */
export function generateRackServersDot(rackServers: RackServers): DotGenerationResult {
  const nodeIdMap = new Map<string, NodeIdMapping>();
  let dotCode = 'digraph G {\n';
  dotCode += '  rankdir=TB;\n';
  dotCode += '  node [shape=box, style=rounded];\n';
  dotCode += '  edge [arrowhead=normal];\n';
  dotCode += '  size="10,10";\n';
  dotCode += '  ratio=compress;\n\n';
  
  console.log('🔄 [generateRackServersDot] 開始', {
    rackId: rackServers.rackId,
    serversCount: rackServers.servers?.length || 0,
    hasServers: !!(rackServers.servers && Array.isArray(rackServers.servers) && rackServers.servers.length > 0)
  });
  
  // ラックをクラスターとして表示
  const rawRackNodeId = `rack_${rackServers.rackId}`;
  const escapedRackNodeId = escapeNodeId(rawRackNodeId);
  const rackLabel = rackServers.label || rackServers.rackId || 'ラック';
  
  // ノードIDマッピングに追加（ラック用）
  nodeIdMap.set(rawRackNodeId, {
    nodeId: escapedRackNodeId,
    type: 'rack',
    dataId: rackServers.rackId,
    label: rackLabel,
  });
  
  dotCode += `  subgraph cluster_${escapedRackNodeId} {\n`;
  dotCode += `    label="${escapeLabel(rackLabel)}";\n`;
  dotCode += `    style=rounded;\n`;
  dotCode += `    rankdir=TB;\n`; // サーバーを縦に並べる
  
  // ラックノードを追加（クラスターのラベルとして機能）
  dotCode += `    ${escapedRackNodeId} [
      label="${escapeLabel(rackLabel)}",
      shape=box3d,
      style="rounded,filled",
      fillcolor=lightgray,
      color=gray,
      penwidth=2,
      fontcolor=white
    ];\n`;
  
  // サーバーノードを生成
  const serverIds: string[] = [];
  if (rackServers.servers && Array.isArray(rackServers.servers) && rackServers.servers.length > 0) {
    for (const server of rackServers.servers) {
      const rawNodeId = `server_${server.id}`;
      const escapedNodeId = escapeNodeId(rawNodeId);
      
      // ノードIDマッピングに追加（引用符なしのIDをキーとして使用）
      nodeIdMap.set(rawNodeId, {
        nodeId: escapedNodeId,
        type: 'server',
        dataId: server.id,
        label: server.label,
      });
      
      let label = server.label;
      if (server.model) {
        label += `\n${server.model}`;
      }
      if (server.specs) {
        const specsInfo: string[] = [];
        if (server.specs.cpu) {
          specsInfo.push(`CPU: ${server.specs.cpu.cores || 'N/A'} cores`);
        }
        if (server.specs.memory) {
          specsInfo.push(`RAM: ${server.specs.memory.total || 'N/A'}`);
        }
        if (server.specs.storage) {
          specsInfo.push(`Storage: ${server.specs.storage.capacity || 'N/A'}`);
        }
        if (specsInfo.length > 0) {
          label += `\n${specsInfo.join(', ')}`;
        }
      }
      
      dotCode += `    ${escapedNodeId} [
      label="${escapeLabel(label)}",
      shape=box3d,
      style="rounded,filled",
      fillcolor=lightyellow,
      color=orange,
      penwidth=2
    ];\n`;
      
      // サーバーのポートを表示（タブレット形式）
      if (server.ports && Array.isArray(server.ports)) {
        for (const port of server.ports) {
          const portNodeId = escapeNodeId(`port_${server.id}_${port.id}`);
          
          let portLabel = port.label || port.id;
          
          // type、speed、roleを表示
          const labelParts: string[] = [];
          if (port.type) {
            labelParts.push(port.type);
          }
          if (port.speed) {
            labelParts.push(port.speed);
          }
          if (port.role) {
            labelParts.push(`[${port.role}]`);
          }
          
          if (labelParts.length > 0) {
            portLabel += `\n${labelParts.join(' ')}`;
          }
          
          if (port.ip) {
            portLabel += `\n${port.ip}`;
          }
          
          dotCode += `    ${portNodeId} [
      label="${escapeLabel(portLabel)}",
      shape=tab,
      style=filled,
      fillcolor=lightgray,
      color=gray,
      penwidth=1
    ];\n`;
          
          // サーバーからポートへの接続
          dotCode += `    ${escapedNodeId} -> ${portNodeId} [style=dashed, color=gray, arrowhead=none];\n`;
        }
      }
      
      serverIds.push(escapedNodeId);
    }
    
    // サーバーを縦に並べる（不可視エッジで順序付け）
    if (serverIds.length > 1) {
      for (let i = 0; i < serverIds.length - 1; i++) {
        dotCode += `    ${serverIds[i]} -> ${serverIds[i + 1]} [style=invis];\n`;
      }
    }
  } else {
    // サーバーが空の場合、メッセージを表示
    console.warn('⚠️ [generateRackServersDot] サーバーが空です', {
      rackId: rackServers.rackId,
      hasServers: !!(rackServers.servers && Array.isArray(rackServers.servers)),
      serversLength: rackServers.servers?.length || 0
    });
    dotCode += '    // サーバーデータがありません\n';
  }
  
  dotCode += '  }\n';
  dotCode += '\n';
  
  // サーバー間の接続（クラスター外から接続を定義）
  if (rackServers.servers && Array.isArray(rackServers.servers) && rackServers.servers.length > 1) {
    for (let i = 0; i < rackServers.servers.length; i++) {
      for (let j = i + 1; j < rackServers.servers.length; j++) {
        const server1 = rackServers.servers[i];
        const server2 = rackServers.servers[j];
        
        // サーバー1の接続をチェック
        if (server1.connections && Array.isArray(server1.connections)) {
          for (const conn of server1.connections) {
            if (conn.to.device === server2.id) {
              const fromId = escapeNodeId(`server_${server1.id}`);
              const toId = escapeNodeId(`server_${server2.id}`);
              
              const attributes: string[] = [];
              if (conn.type) {
                attributes.push(`label="${escapeLabel(conn.type)}"`);
              }
              attributes.push('color=blue');
              attributes.push('style=solid');
              
              dotCode += `  ${fromId} -> ${toId} [${attributes.join(', ')}];\n`;
            }
          }
        }
      }
    }
  }
  
  dotCode += '}\n';
  
  console.log('✅ [generateRackServersDot] 完了', {
    dotCodeLength: dotCode.length,
    nodeMapSize: nodeIdMap.size
  });
  
  return { dotCode, nodeIdMap };
}

/**
 * 機器タイプに応じた色を取得
 */
function getEquipmentColor(type?: string): { fill: string; border: string } {
  switch (type) {
    case 'server':
      return { fill: 'lightyellow', border: 'orange' };
    case 'switch':
      return { fill: 'lightcyan', border: 'cyan' };
    case 'router':
      return { fill: 'lightpink', border: 'pink' };
    case 'firewall':
      return { fill: 'lightcoral', border: 'red' };
    case 'storage':
      return { fill: 'lightsteelblue', border: 'steelblue' };
    default:
      return { fill: 'lightgray', border: 'gray' };
  }
}

/**
 * ラベルをエスケープ
 */
function escapeLabel(label: string): string {
  return label
    .replace(/\\/g, '\\\\')  // バックスラッシュをエスケープ
    .replace(/"/g, '\\"')     // ダブルクォートをエスケープ
    .replace(/\n/g, '\\n')    // 改行をエスケープ
    .replace(/\r/g, '');      // キャリッジリターンを削除
}

