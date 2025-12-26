/**
 * YAML→Graphviz DOT変換ロジック（新設計対応）
 * 4単位（topology, device, links, intent）に対応
 */

import * as yaml from 'js-yaml';
import type { ViewType } from './viewTypes';
import { detectYamlType } from './yamlSchemas';

export interface ConversionResult {
  dotCode: string;
  error?: string;
}

export interface YamlData {
  topology?: any;
  devices?: any[];
  links?: any;
  intents?: any[];
  // 新しい階層構造
  siteTopology?: any;
  siteEquipment?: any;
  rackServers?: any;
  serverDetails?: any;
}

/**
 * YAMLデータをGraphviz DOT形式に変換（Viewタイプ対応）
 */
export function convertYamlToDotAdvanced(
  yamlData: YamlData,
  viewType: ViewType = 'full'
): ConversionResult {
  try {
    let dotCode = 'digraph G {\n';
    dotCode += '  rankdir=TB;\n';  // ラックを横並びにするため、上から下へ（rank=sameで横並びにする）
    dotCode += '  node [shape=box3d, style="rounded,filled"];\n';
    // サイズ制限を追加（横幅に合わせる）
    dotCode += '  size="10,10";\n';
    dotCode += '  ratio=compress;\n\n';

    // データタイプに応じて変換
    if (yamlData.siteTopology) {
      dotCode += generateSiteTopologyView(yamlData.siteTopology);
    } else if (yamlData.siteEquipment) {
      dotCode += generateSiteEquipmentView(yamlData.siteEquipment);
    } else if (yamlData.rackServers) {
      dotCode += generateRackServersView(yamlData.rackServers);
    } else if (yamlData.serverDetails) {
      dotCode += generateServerDetailsView(yamlData.serverDetails);
    } else {
      // 既存のViewタイプに応じて変換
      switch (viewType) {
        case 'topology':
          dotCode += generateTopologyView(yamlData);
          break;
        case 'device':
          dotCode += generateDeviceView(yamlData);
          break;
        case 'connection':
          dotCode += generateConnectionView(yamlData);
          break;
        case 'full':
          dotCode += generateFullView(yamlData);
          break;
        case 'intent':
          dotCode += generateIntentView(yamlData);
          break;
      }
    }

    dotCode += '}\n';
    return { dotCode };
  } catch (error: any) {
    return {
      dotCode: '',
      error: error.message || '変換に失敗しました。'
    };
  }
}

/**
 * Topology View: トポロジ構造のみ
 */
function generateTopologyView(data: YamlData): string {
  let dotCode = '';
  
  if (!data.topology) {
    return '  // トポロジデータがありません\n';
  }

  // ネットワーク単位で処理（複数ネットワーク対応）
  const networks = data.topology.networks || [];
  
  if (networks.length === 0) {
    // 旧形式（layersのみ）のサポート
    if (data.topology.layers) {
      const layers = data.topology.layers;
      for (const layer of layers) {
        const layerId = escapeNodeId(`layer_${layer.id}`);
        dotCode += `  ${layerId} [label="${escapeLabel(layer.label || layer.id)}", shape=box3d, style="rounded,filled", fillcolor=lightblue, color=blue, penwidth=2];\n`;
      }
      for (let i = 0; i < layers.length - 1; i++) {
        const fromId = escapeNodeId(`layer_${layers[i].id}`);
        const toId = escapeNodeId(`layer_${layers[i + 1].id}`);
        dotCode += `  ${fromId} -> ${toId} [style=dashed];\n`;
      }
      return dotCode;
    }
    return '  // トポロジデータがありません\n';
  }

  // 各ネットワークのレイヤーを表示
  for (const network of networks) {
    if (!network.layers) continue;
    
    const networkPrefix = network.id || network.label || 'network';
    
    // ネットワークをクラスターとして表示
    dotCode += `  subgraph cluster_${escapeNodeId(networkPrefix)} {\n`;
    dotCode += `    label="${escapeLabel(network.label || network.id)}";\n`;
    dotCode += `    style=rounded;\n`;
    
    const layers = network.layers;
    for (const layer of layers) {
      const layerId = escapeNodeId(`${networkPrefix}_${layer.id}`);
      dotCode += `    ${layerId} [label="${escapeLabel(layer.label || layer.id)}", shape=box3d, style="rounded,filled", fillcolor=lightblue, color=blue, penwidth=2];\n`;
      
      // バリアントがある場合
      if (layer.variants && Array.isArray(layer.variants)) {
        for (const variant of layer.variants) {
          const variantId = escapeNodeId(`${networkPrefix}_${variant.id}`);
          dotCode += `    ${variantId} [label="${escapeLabel(variant.label || variant.id)}", shape=box3d, style="rounded,filled,dashed", fillcolor=lightgray, color=gray, penwidth=1.5];\n`;
          dotCode += `    ${layerId} -> ${variantId} [style=dotted];\n`;
        }
      }
    }
    
    // レイヤー間の接続（階層順）
    for (let i = 0; i < layers.length - 1; i++) {
      const fromId = escapeNodeId(`${networkPrefix}_${layers[i].id}`);
      const toId = escapeNodeId(`${networkPrefix}_${layers[i + 1].id}`);
      dotCode += `    ${fromId} -> ${toId} [style=dashed];\n`;
    }
    
    dotCode += '  }\n';
  }

  return dotCode;
}

/**
 * Device View: デバイスとそのポート
 */
function generateDeviceView(data: YamlData): string {
  let dotCode = '';
  
  if (!data.devices || data.devices.length === 0) {
    return '  // デバイスデータがありません\n';
  }

  // デバイスをノードとして表示
  for (const device of data.devices) {
    const deviceId = escapeNodeId(device.id);
    const deviceLabel = device.label || device.id;
    dotCode += `  ${deviceId} [label="${escapeLabel(deviceLabel)}", shape=box3d, style="rounded,filled", fillcolor=lightcyan, color=cyan, penwidth=2];\n`;

    // ポートをサブノードとして表示（タブレット形式）
    if (device.ports && Array.isArray(device.ports)) {
      for (const port of device.ports) {
        const portId = escapeNodeId(`${device.id}_${port.id}`);
        const portLabel = port.label || port.id;
        dotCode += `  ${portId} [label="${escapeLabel(portLabel)}", shape=tab, style=filled, fillcolor=lightgray, color=gray, penwidth=1];\n`;
        dotCode += `  ${deviceId} -> ${portId} [style=dashed, color=gray, arrowhead=none];\n`;
      }
    }
  }

  return dotCode;
}

/**
 * Connection View: 接続関係のみ
 */
function generateConnectionView(data: YamlData): string {
  let dotCode = '';
  
  if (!data.links || !data.links.connections) {
    return '  // 接続データがありません\n';
  }

  const connections = data.links.connections;
  const deviceSet = new Set<string>();

  // 接続に含まれるデバイスを収集
  for (const conn of connections) {
    if (conn.from && conn.from.device) {
      deviceSet.add(conn.from.device);
    }
    if (conn.to && conn.to.device) {
      deviceSet.add(conn.to.device);
    }
  }

  // デバイスをノードとして表示
  for (const deviceId of deviceSet) {
    dotCode += `  ${escapeNodeId(deviceId)} [label="${escapeLabel(deviceId)}", shape=box3d, style="rounded,filled", fillcolor=lightcyan, color=cyan, penwidth=2];\n`;
  }

  dotCode += '\n';

  // 接続をエッジとして表示
  for (const conn of connections) {
    if (!conn.from || !conn.to) continue;
    
    const fromDevice = conn.from.device;
    const toDevice = conn.to.device;
    const fromPort = conn.from.port;
    const toPort = conn.to.port;
    
    const fromId = escapeNodeId(fromDevice);
    const toId = escapeNodeId(toDevice);
    
    const attributes: string[] = [];
    
    // ポート情報
    if (fromPort && toPort) {
      attributes.push(`label="${escapeLabel(`${fromPort} → ${toPort}`)}"`);
    } else if (fromPort) {
      attributes.push(`label="${escapeLabel(fromPort)}"`);
    }
    
    // ケーブルタイプ情報（オプション）
    if (conn.cable_type) {
      const cableInfo = conn.cable_spec ? `${conn.cable_type} (${conn.cable_spec})` : conn.cable_type;
      if (attributes.length > 0) {
        // 既にラベルがある場合はツールチップとして追加
        const existingLabel = attributes.find(attr => attr.startsWith('label='));
        if (existingLabel) {
          const labelValue = existingLabel.match(/label="([^"]*)"/)?.[1] || '';
          attributes[attributes.indexOf(existingLabel)] = `label="${escapeLabel(`${labelValue}\\n${cableInfo}`)}"`;
        }
      } else {
        attributes.push(`label="${escapeLabel(cableInfo)}"`);
      }
    }
    
    // ステータス
    if (conn.status === 'inactive') {
      attributes.push('style=dashed');
      attributes.push('color=gray');
    }
    
    // 場所情報（別フロア・別ラック）
    if (conn.location) {
      if (conn.location === 'other_floor') {
        attributes.push('color=red');
        attributes.push('style=dashed');
      } else if (conn.location === 'other_rack') {
        attributes.push('color=orange');
        attributes.push('style=dashed');
      }
    }
    
    if (attributes.length > 0) {
      dotCode += `  ${fromId} -> ${toId} [${attributes.join(', ')}];\n`;
    } else {
      dotCode += `  ${fromId} -> ${toId};\n`;
    }
  }

  return dotCode;
}

/**
 * Full View: すべてを統合表示
 */
function generateFullView(data: YamlData): string {
  let dotCode = '';
  
  // Topology + Devices + Links を統合
  dotCode += generateTopologyView(data);
  dotCode += '\n';
  dotCode += generateDeviceView(data);
  dotCode += '\n';
  dotCode += generateConnectionView(data);

  return dotCode;
}

/**
 * Intent View: ルール違反をハイライト
 */
function generateIntentView(data: YamlData): string {
  let dotCode = '';
  
  // Full Viewをベースに
  dotCode += generateFullView(data);
  
  // Intentルールの違反を検出してハイライト（将来実装）
  // 現時点ではFull Viewと同じ
  dotCode += '\n  // Intent validation (将来実装)\n';

  return dotCode;
}

/**
 * 単一YAMLファイルをパースしてYamlDataに変換
 */
export function parseYamlFile(yamlContent: string): { data: YamlData; type: string } | null {
  try {
    const parsed = yaml.load(yamlContent) as any;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const type = detectYamlType(parsed);
    
    const data: YamlData = {};
    
    switch (type) {
      case 'site-topology':
        data.siteTopology = parsed;
        break;
      case 'site-equipment':
        data.siteEquipment = parsed;
        break;
      case 'rack-servers':
        data.rackServers = parsed;
        break;
      case 'server-details':
        data.serverDetails = parsed;
        break;
      case 'topology':
        data.topology = parsed;
        break;
      case 'device':
        data.devices = [parsed];
        break;
      case 'links':
        data.links = parsed;
        break;
      case 'intent':
        data.intents = [parsed];
        break;
      default:
        return null;
    }

    return { data, type };
  } catch (error) {
    return null;
  }
}

/**
 * 複数YAMLファイルを統合
 */
export function mergeYamlFiles(files: Array<{ content: string; type: string }>): YamlData {
  const merged: YamlData = {
    devices: [],
    intents: [],
  };

  for (const file of files) {
    const parsed = parseYamlFile(file.content);
    if (!parsed) continue;

    switch (parsed.type) {
      case 'topology':
        merged.topology = parsed.data.topology;
        break;
      case 'device':
        if (parsed.data.devices) {
          merged.devices = [...(merged.devices || []), ...parsed.data.devices];
        }
        break;
      case 'links':
        merged.links = parsed.data.links;
        break;
      case 'intent':
        if (parsed.data.intents) {
          merged.intents = [...(merged.intents || []), ...parsed.data.intents];
        }
        break;
    }
  }

  return merged;
}

/**
 * ノードIDをエスケープ
 */
function escapeNodeId(id: string): string {
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(id)) {
    return id;
  }
  return `"${id.replace(/"/g, '\\"')}"`;
}

/**
 * ラベルをエスケープ
 */
function escapeLabel(label: string): string {
  return label.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

/**
 * タブ1: 棟間ネットワーク View
 */
function generateSiteTopologyView(data: any): string {
  let dotCode = '';
  
  if (!data.sites || data.sites.length === 0) {
    return '  // 棟データがありません\n';
  }

  // 棟をノードとして表示
  for (const site of data.sites) {
    const siteId = escapeNodeId(site.id);
    const siteLabel = site.label || site.id;
    const location = site.location ? `\\n${site.location.address || ''}` : '';
    dotCode += `  ${siteId} [label="${escapeLabel(`${siteLabel}${location}`)}", shape=box3d, style="rounded,filled", fillcolor=lightblue, color=blue, penwidth=2];\n`;
  }

  dotCode += '\n';

  // 棟間の接続を表示
  if (data.connections && Array.isArray(data.connections)) {
    for (const conn of data.connections) {
      if (!conn.from || !conn.to) continue;
      
      const fromId = escapeNodeId(conn.from);
      const toId = escapeNodeId(conn.to);
      const attributes: string[] = [];
      
      if (conn.type) {
        attributes.push(`label="${escapeLabel(conn.type)}"`);
      }
      if (conn.bandwidth) {
        const existingLabel = attributes.find(attr => attr.startsWith('label='));
        if (existingLabel) {
          const labelValue = existingLabel.match(/label="([^"]*)"/)?.[1] || '';
          attributes[attributes.indexOf(existingLabel)] = `label="${escapeLabel(`${labelValue}\\n${conn.bandwidth}`)}"`;
        } else {
          attributes.push(`label="${escapeLabel(conn.bandwidth)}"`);
        }
      }
      if (conn.provider) {
        attributes.push(`color=blue`);
      }
      
      if (attributes.length > 0) {
        dotCode += `  ${fromId} -> ${toId} [${attributes.join(', ')}];\n`;
      } else {
        dotCode += `  ${fromId} -> ${toId};\n`;
      }
    }
  }

  return dotCode;
}

/**
 * タブ2: 棟内機器構成 View
 */
function generateSiteEquipmentView(data: any): string {
  let dotCode = '';
  
  if (!data.racks || data.racks.length === 0) {
    return '  // ラックデータがありません\n';
  }

  // ラッククラスターのリストを保持（横並びにするため）
  const rackClusters: string[] = [];

  // ラックをクラスターとして表示
  for (const rack of data.racks) {
    const rackId = escapeNodeId(rack.id);
    const rackLabel = rack.label || rack.id;
    
    dotCode += `  subgraph cluster_${rackId} {\n`;
    dotCode += `    label="${escapeLabel(rackLabel)}";\n`;
    dotCode += `    style=rounded;\n`;
    dotCode += `    rankdir=LR;\n`;  // クラスター内で横方向に配置（サーバーを縦に並べる）
    
    // ラックノードを追加（横並びにするためのアンカー）
    dotCode += `    ${rackId} [
      label="${escapeLabel(rackLabel)}",
      shape=box3d,
      style="rounded,filled",
      fillcolor=lightgray,
      color=gray,
      penwidth=2,
      fontcolor=white
    ];\n`;
    
    // ラック内の機器を表示
    const equipmentNodes: string[] = [rackId]; // ラックノードを最初に追加
    
    if (rack.equipment && Array.isArray(rack.equipment)) {
      for (const equipment of rack.equipment) {
        const eqId = escapeNodeId(equipment.id);
        const eqLabel = equipment.label || equipment.id;
        const eqType = equipment.type || 'unknown';
        
        // 機器タイプに応じて色を変更
        let fillColor = 'lightgray';
        let borderColor = 'gray';
        if (eqType === 'server') {
          fillColor = 'lightyellow';
          borderColor = 'orange';
        } else if (eqType === 'switch') {
          fillColor = 'lightcyan';
          borderColor = 'cyan';
        } else if (eqType === 'router') {
          fillColor = 'lightpink';
          borderColor = 'pink';
        }
        
        dotCode += `    ${eqId} [label="${escapeLabel(eqLabel)}", shape=box3d, style="rounded,filled", fillcolor=${fillColor}, color=${borderColor}, penwidth=1.5];\n`;
        equipmentNodes.push(eqId);
      }
    }
    
    // ノードを縦に並べるために不可視の接続を追加
    for (let i = 0; i < equipmentNodes.length - 1; i++) {
      dotCode += `    ${equipmentNodes[i]} -> ${equipmentNodes[i + 1]} [style=invis];\n`;
    }
    
    dotCode += '  }\n';
    
    // ラッククラスターのIDを保存（横並びにするため）
    rackClusters.push(rackId);
  }
  
  // ラックを横並びにするために、各ラックの最初のノード（ラックノード）を同じランクに配置
  if (rackClusters.length > 1) {
    dotCode += '  { rank=same; ';
    dotCode += rackClusters.map(id => id).join('; ');
    dotCode += '; }\n';
  }

  dotCode += '\n';

  // 機器間の接続を表示
  if (data.connections && Array.isArray(data.connections)) {
    for (const conn of data.connections) {
      if (!conn.from || !conn.to) continue;
      
      // 接続形式の判定：from/toが文字列か、オブジェクトか
      let fromDevice: string | undefined;
      let toDevice: string | undefined;
      let fromPort: string | undefined;
      let toPort: string | undefined;
      
      if (typeof conn.from === 'string') {
        // 新しい形式: from/toが直接文字列
        fromDevice = conn.from;
        toDevice = typeof conn.to === 'string' ? conn.to : undefined;
      } else if (conn.from && typeof conn.from === 'object' && 'device' in conn.from) {
        // 既存の形式: from/toがオブジェクト（device, port）
        fromDevice = conn.from.device;
        toDevice = (conn.to && typeof conn.to === 'object' && 'device' in conn.to) ? conn.to.device : undefined;
        fromPort = conn.from.port;
        toPort = (conn.to && typeof conn.to === 'object' && 'port' in conn.to) ? conn.to.port : undefined;
      }
      
      if (!fromDevice || !toDevice) {
        console.warn('⚠️ [generateSiteEquipmentView] 接続の形式が不正です:', conn);
        continue;
      }
      
      const fromId = escapeNodeId(fromDevice);
      const toId = escapeNodeId(toDevice);
      
      // ノードIDがundefinedでないことを確認
      if (!fromId || !toId || fromId === 'undefined' || toId === 'undefined') {
        console.warn('⚠️ [generateSiteEquipmentView] ノードIDが無効です:', { fromDevice, toDevice, fromId, toId });
        continue;
      }
      
      const attributes: string[] = [];
      
      const connAny = conn as any; // 型安全性のためanyにキャスト
      if (fromPort && toPort) {
        attributes.push(`label="${escapeLabel(`${fromPort} → ${toPort}`)}"`);
      }
      if (connAny.type) {
        const existingLabel = attributes.find(attr => attr.startsWith('label='));
        if (existingLabel) {
          const labelValue = existingLabel.match(/label="([^"]*)"/)?.[1] || '';
          attributes[attributes.indexOf(existingLabel)] = `label="${escapeLabel(`${labelValue}\\n${connAny.type}`)}"`;
        } else {
          attributes.push(`label="${escapeLabel(connAny.type)}"`);
        }
      }
      if (connAny.bandwidth) {
        const existingLabel = attributes.find(attr => attr.startsWith('label='));
        if (existingLabel) {
          const labelValue = existingLabel.match(/label="([^"]*)"/)?.[1] || '';
          attributes[attributes.indexOf(existingLabel)] = `label="${escapeLabel(`${labelValue}\\n${connAny.bandwidth}`)}"`;
        } else {
          attributes.push(`label="${escapeLabel(connAny.bandwidth)}"`);
        }
      }
      if (conn.network) {
        const existingLabel = attributes.find(attr => attr.startsWith('label='));
        if (existingLabel) {
          const labelValue = existingLabel.match(/label="([^"]*)"/)?.[1] || '';
          attributes[attributes.indexOf(existingLabel)] = `label="${escapeLabel(`${labelValue}\\n${conn.network}`)}"`;
        } else {
          attributes.push(`label="${escapeLabel(conn.network)}"`);
        }
      }
      if (conn.description) {
        const existingLabel = attributes.find(attr => attr.startsWith('label='));
        if (existingLabel) {
          const labelValue = existingLabel.match(/label="([^"]*)"/)?.[1] || '';
          attributes[attributes.indexOf(existingLabel)] = `label="${escapeLabel(`${labelValue}\\n${conn.description}`)}"`;
        } else {
          attributes.push(`label="${escapeLabel(conn.description)}"`);
        }
      }
      
      // 接続タイプに応じて色を変更
      if (connAny.type === 'fiber') {
        attributes.push('color=orange');
      } else if (connAny.type === 'ethernet') {
        attributes.push('color=blue');
      } else {
        attributes.push('color=blue');
      }
      
      if (attributes.length > 0) {
        dotCode += `  ${fromId} -> ${toId} [${attributes.join(', ')}];\n`;
      } else {
        dotCode += `  ${fromId} -> ${toId};\n`;
      }
    }
  }

  return dotCode;
}

/**
 * タブ3: ラック内サーバー・ポート View
 */
function generateRackServersView(data: any): string {
  let dotCode = '';
  
  if (!data.servers || data.servers.length === 0) {
    return '  // サーバーデータがありません\n';
  }

  // ラックをクラスターとして表示
  const rackId = escapeNodeId(data.rackId || `rack_${data.id || 'unknown'}`);
  const rackLabel = data.label || data.rackId || 'ラック';
  
  dotCode += `  subgraph cluster_${rackId} {\n`;
  dotCode += `    label="${escapeLabel(rackLabel)}";\n`;
  dotCode += `    style=rounded;\n`;
  dotCode += `    rankdir=TB;\n`; // サーバーを縦に並べる
  
  // ラックノードを追加（クラスターのラベルとして機能）
  dotCode += `    ${rackId} [
      label="${escapeLabel(rackLabel)}",
      shape=box3d,
      style="rounded,filled",
      fillcolor=lightgray,
      color=gray,
      penwidth=2,
      fontcolor=white
    ];\n`;

  // サーバーをノードとして表示
  const serverIds: string[] = [];
  for (const server of data.servers) {
    const serverId = escapeNodeId(server.id);
    serverIds.push(serverId);
    const serverLabel = server.label || server.id;
    const model = server.model ? `\\n${server.model}` : '';
    dotCode += `    ${serverId} [label="${escapeLabel(`${serverLabel}${model}`)}", shape=box3d, style="rounded,filled", fillcolor=lightyellow, color=orange, penwidth=2];\n`;

    // ポートをサブノードとして表示（タブレット形式）
    if (server.ports && Array.isArray(server.ports)) {
      for (const port of server.ports) {
        const portId = escapeNodeId(`${server.id}_${port.id}`);
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
          portLabel += `\\n${labelParts.join(' ')}`;
        }
        
        dotCode += `    ${portId} [label="${escapeLabel(portLabel)}", shape=tab, style=filled, fillcolor=lightgray, color=gray, penwidth=1];\n`;
        dotCode += `    ${serverId} -> ${portId} [style=dashed, color=gray, arrowhead=none];\n`;
      }
    }
  }

  // サーバーを縦に並べる（不可視エッジで順序付け）
  if (serverIds.length > 1) {
    for (let i = 0; i < serverIds.length - 1; i++) {
      dotCode += `    ${serverIds[i]} -> ${serverIds[i + 1]} [style=invis];\n`;
    }
  }

  dotCode += '  }\n';
  dotCode += '\n';

  // サーバー間の接続を表示（クラスター外から接続を定義）
  for (const server of data.servers) {
    if (server.connections && Array.isArray(server.connections)) {
      for (const conn of server.connections) {
        if (!conn.from || !conn.to) continue;
        
        const fromPortId = escapeNodeId(`${server.id}_${conn.from.port}`);
        const toDevice = conn.to.device;
        const toPort = conn.to.port;
        const toPortId = escapeNodeId(`${toDevice}_${toPort}`);
        
        const attributes: string[] = [];
        if (conn.type) {
          attributes.push(`label="${escapeLabel(conn.type)}"`);
        }
        
        if (attributes.length > 0) {
          dotCode += `  ${fromPortId} -> ${toPortId} [${attributes.join(', ')}];\n`;
        } else {
          dotCode += `  ${fromPortId} -> ${toPortId};\n`;
        }
      }
    }
  }

  return dotCode;
}

/**
 * タブ4: 機器詳細・シーケンス View
 */
function generateServerDetailsView(data: any): string {
  let dotCode = '';
  
  // サーバー/機器の基本情報を表示
  const serverLabel = data.label || data.id || '機器詳細';
  const serverId = escapeNodeId(`server_${data.id || 'details'}`);
  
  // ハードウェア情報がある場合、サーバーノードに表示
  let serverNodeLabel = serverLabel;
  if (data.hardware) {
    if (data.hardware.model) {
      serverNodeLabel += `\\n${data.hardware.model}`;
    }
    if (data.hardware.serialNumber) {
      serverNodeLabel += `\\nS/N: ${data.hardware.serialNumber}`;
    }
  }
  
  dotCode += `  ${serverId} [label="${escapeLabel(serverNodeLabel)}", shape=box3d, style="rounded,filled", fillcolor=lightyellow, color=orange, penwidth=2];\n`;
  dotCode += '\n';
  
  // スロット情報を表示（縦並びに自動配置）
  if (data.slots && Array.isArray(data.slots) && data.slots.length > 0) {
    dotCode += '  // ドライブベイ・スロット\n';
    const slotsClusterId = escapeNodeId(`slots_${data.id || 'details'}`);
    dotCode += `  subgraph cluster_${slotsClusterId} {\n`;
    dotCode += `    label="ドライブベイ";\n`;
    dotCode += `    style=rounded;\n`;
    dotCode += `    rankdir=TB;\n`; // 縦方向に配置
    
    const slotIds: string[] = [];
    for (const slot of data.slots) {
      const slotId = escapeNodeId(slot.id || `slot_${slot.label}`);
      slotIds.push(slotId);
      
      let slotLabel = slot.label || slot.id;
      if (slot.status && slot.status !== 'empty') {
        slotLabel += `\\n[${slot.status}]`;
      }
      if (slot.capacity) {
        slotLabel += `\\n${slot.capacity}`;
      }
      
      const slotColor = slot.status === 'failed' ? 'lightcoral' : 
                       slot.status === 'installed' ? 'lightgreen' : 'lightgray';
      const borderColor = slot.status === 'failed' ? 'red' : 
                         slot.status === 'installed' ? 'green' : 'gray';
      
      dotCode += `    ${slotId} [label="${escapeLabel(slotLabel)}", shape=box3d, style="rounded,filled", fillcolor=${slotColor}, color=${borderColor}, penwidth=1.5];\n`;
    }
    
    // スロットを縦に並べる（不可視エッジで順序付け）
    for (let i = 0; i < slotIds.length - 1; i++) {
      dotCode += `    ${slotIds[i]} -> ${slotIds[i + 1]} [style=invis];\n`;
    }
    
    dotCode += '  }\n';
    dotCode += '\n';
    
    // サーバーからスロットクラスターへの接続
    dotCode += `  ${serverId} -> ${slotsClusterId} [style=invis];\n`;
    dotCode += '\n';
  }
  
  // フロントパネルポートを表示（縦並びに自動配置）
  if (data.frontPanelPorts && Array.isArray(data.frontPanelPorts) && data.frontPanelPorts.length > 0) {
    dotCode += '  // フロントパネルポート\n';
    const frontPortsClusterId = escapeNodeId(`front_ports_${data.id || 'details'}`);
    dotCode += `  subgraph cluster_${frontPortsClusterId} {\n`;
    dotCode += `    label="フロントパネル";\n`;
    dotCode += `    style=rounded;\n`;
    dotCode += `    rankdir=TB;\n`; // 縦方向に配置
    
    const frontPortIds: string[] = [];
    for (const port of data.frontPanelPorts) {
      const portId = escapeNodeId(port.id || `port_${port.label}`);
      frontPortIds.push(portId);
      const portLabel = port.label || port.id;
      const portType = port.type || 'unknown';
      
      let fillColor = 'lightgray';
      let borderColor = 'gray';
      if (portType === 'VGA') {
        fillColor = 'lightblue';
        borderColor = 'blue';
      } else if (portType === 'USB') {
        fillColor = 'lightcyan';
        borderColor = 'cyan';
      } else if (portType === 'button') {
        fillColor = 'lightpink';
        borderColor = 'pink';
      }
      
      dotCode += `    ${portId} [label="${escapeLabel(portLabel)}", shape=tab, style="rounded,filled", fillcolor=${fillColor}, color=${borderColor}, penwidth=1.5];\n`;
    }
    
    // フロントパネルポートを縦に並べる（不可視エッジで順序付け）
    for (let i = 0; i < frontPortIds.length - 1; i++) {
      dotCode += `    ${frontPortIds[i]} -> ${frontPortIds[i + 1]} [style=invis];\n`;
    }
    
    dotCode += '  }\n';
    dotCode += '\n';
    
    // サーバーからフロントパネルポートクラスターへの接続
    dotCode += `  ${serverId} -> ${frontPortsClusterId} [style=invis];\n`;
    dotCode += '\n';
  }
  
  // ネットワークポートを表示（縦並びに自動配置）
  if (data.ports && Array.isArray(data.ports) && data.ports.length > 0) {
    dotCode += '  // ネットワークポート\n';
    const portsClusterId = escapeNodeId(`ports_${data.id || 'details'}`);
    dotCode += `  subgraph cluster_${portsClusterId} {\n`;
    dotCode += `    label="ネットワークポート";\n`;
    dotCode += `    style=rounded;\n`;
    dotCode += `    rankdir=TB;\n`; // 縦方向に配置
    
    const portIds: string[] = [];
    for (const port of data.ports) {
      const portId = escapeNodeId(port.id || `port_${port.label}`);
      portIds.push(portId);
      
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
        portLabel += `\\n${labelParts.join(' ')}`;
      }
      
      if (port.ip) {
        portLabel += `\\n${port.ip}`;
      }
      
      // ポートのroleに応じて色を変更
      let fillColor = 'lightcyan';
      let borderColor = 'cyan';
      if (port.role === 'management') {
        fillColor = 'lightgreen';
        borderColor = 'green';
      } else if (port.role === 'public') {
        fillColor = 'lightyellow';
        borderColor = 'orange';
      } else if (port.role === 'internal') {
        fillColor = 'lightcyan';
        borderColor = 'cyan';
      } else if (port.role === 'storage') {
        fillColor = 'lavender';
        borderColor = 'purple';
      } else if (port.role === 'backup') {
        fillColor = 'lightcoral';
        borderColor = 'red';
      } else if (port.role === 'unused') {
        fillColor = 'lightgray';
        borderColor = 'gray';
      }
      
      dotCode += `    ${portId} [label="${escapeLabel(portLabel)}", shape=tab, style="rounded,filled", fillcolor=${fillColor}, color=${borderColor}, penwidth=1.5];\n`;
    }
    
    // ポートを縦に並べる（不可視エッジで順序付け）
    for (let i = 0; i < portIds.length - 1; i++) {
      dotCode += `    ${portIds[i]} -> ${portIds[i + 1]} [style=invis];\n`;
    }
    
    dotCode += '  }\n';
    dotCode += '\n';
    
    // サーバーからポートクラスターへの接続（不可視）
    dotCode += `  ${serverId} -> ${portsClusterId} [style=invis];\n`;
    dotCode += '\n';
  }
  
  // シーケンス図を生成
  if (data.sequences && Array.isArray(data.sequences) && data.sequences.length > 0) {
    dotCode += '  // シーケンス図\n';
    for (const sequence of data.sequences) {
      if (!sequence.participants || !sequence.steps) continue;
      
      dotCode += `  // シーケンス: ${sequence.label || sequence.id}\n`;
      
      // 参加者をノードとして表示
      for (const participant of sequence.participants) {
        const partId = escapeNodeId(participant);
        dotCode += `  ${partId} [label="${escapeLabel(participant)}", shape=box3d, style="rounded,filled", fillcolor=lightblue, color=blue, penwidth=2];\n`;
      }
      
      dotCode += '\n';
      
      // ステップをエッジとして表示
      for (const step of sequence.steps) {
        if (!step.from || !step.to) continue;
        
        const fromId = escapeNodeId(step.from);
        const toId = escapeNodeId(step.to);
        const attributes: string[] = [];
        
        if (step.message) {
          attributes.push(`label="${escapeLabel(step.message)}"`);
        }
        if (step.description) {
          const existingLabel = attributes.find(attr => attr.startsWith('label='));
          if (existingLabel) {
            const labelValue = existingLabel.match(/label="([^"]*)"/)?.[1] || '';
            attributes[attributes.indexOf(existingLabel)] = `label="${escapeLabel(`${labelValue}\\n${step.description}`)}"`;
          }
        }
        
        if (attributes.length > 0) {
          dotCode += `  ${fromId} -> ${toId} [${attributes.join(', ')}];\n`;
        } else {
          dotCode += `  ${fromId} -> ${toId};\n`;
        }
      }
      
      dotCode += '\n';
    }
  } else if (data.applications && Array.isArray(data.applications) && data.applications.length > 0) {
    // シーケンスがない場合は、アプリケーション構成を表示
    dotCode += '  // アプリケーション構成\n';
    for (const app of data.applications) {
      const appId = escapeNodeId(app.name);
      const appLabel = app.name;
      const port = app.port ? `:${app.port}` : '';
      dotCode += `  ${appId} [label="${escapeLabel(`${appLabel}${port}`)}", shape=box3d, style="rounded,filled", fillcolor=lightgreen, color=green, penwidth=2];\n`;
      dotCode += `  ${serverId} -> ${appId} [style=dashed, color=gray];\n`;
    }
    dotCode += '\n';
  }

  return dotCode;
}


