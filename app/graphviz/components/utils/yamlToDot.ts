/**
 * YAML→Graphviz DOT変換ロジック
 */

import * as yaml from 'js-yaml';
import type { GraphvizYAML, ConversionResult } from './types';

/**
 * YAML文字列をGraphviz DOT形式に変換
 */
export function convertYamlToDot(yamlContent: string): ConversionResult {
  try {
    // YAMLをパース
    const parsed = yaml.load(yamlContent) as GraphvizYAML;
    
    if (!parsed || typeof parsed !== 'object') {
      return {
        dotCode: '',
        error: 'YAMLの形式が正しくありません。オブジェクト形式である必要があります。'
      };
    }

    // グラフ情報を取得
    const graphInfo = parsed.graph || parsed;
    const graphType = graphInfo.type === 'graph' ? 'graph' : 'digraph';
    const graphName = graphInfo.name || 'G';
    
    // DOTコードの開始
    let dotCode = `${graphType} ${escapeGraphName(graphName)} {\n`;
    dotCode += '  rankdir=LR;\n';
    dotCode += '  node [shape=box];\n\n';

    // ノード定義
    if (graphInfo.nodes && Array.isArray(graphInfo.nodes)) {
      for (const node of graphInfo.nodes) {
        if (!node.id) {
          continue;
        }
        
        const nodeId = escapeNodeId(node.id);
        const attributes: string[] = [];
        
        if (node.label) {
          attributes.push(`label="${escapeLabel(node.label)}"`);
        }
        if (node.shape) {
          attributes.push(`shape=${node.shape}`);
        }
        if (node.color) {
          attributes.push(`color="${node.color}"`);
        }
        if (node.style) {
          attributes.push(`style="${node.style}"`);
        }
        
        if (attributes.length > 0) {
          dotCode += `  ${nodeId} [${attributes.join(', ')}];\n`;
        } else {
          dotCode += `  ${nodeId};\n`;
        }
      }
    }

    dotCode += '\n';

    // エッジ定義
    if (graphInfo.edges && Array.isArray(graphInfo.edges)) {
      const edgeSymbol = graphType === 'digraph' ? '->' : '--';
      
      for (const edge of graphInfo.edges) {
        if (!edge.from || !edge.to) {
          continue;
        }
        
        const fromId = escapeNodeId(edge.from);
        const toId = escapeNodeId(edge.to);
        const attributes: string[] = [];
        
        if (edge.label) {
          attributes.push(`label="${escapeLabel(edge.label)}"`);
        }
        if (edge.style) {
          attributes.push(`style="${edge.style}"`);
        }
        if (edge.color) {
          attributes.push(`color="${edge.color}"`);
        }
        
        if (attributes.length > 0) {
          dotCode += `  ${fromId} ${edgeSymbol} ${toId} [${attributes.join(', ')}];\n`;
        } else {
          dotCode += `  ${fromId} ${edgeSymbol} ${toId};\n`;
        }
      }
    }

    dotCode += '}\n';

    return { dotCode };
  } catch (error: any) {
    return {
      dotCode: '',
      error: error.message || 'YAMLのパースに失敗しました。'
    };
  }
}

/**
 * グラフ名をエスケープ
 */
function escapeGraphName(name: string): string {
  // グラフ名は英数字とアンダースコアのみ許可
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return name;
  }
  // それ以外は引用符で囲む
  return `"${name.replace(/"/g, '\\"')}"`;
}

/**
 * ノードIDをエスケープ
 */
function escapeNodeId(id: string): string {
  // ノードIDは英数字とアンダースコアのみ許可
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(id)) {
    return id;
  }
  // それ以外は引用符で囲む
  return `"${id.replace(/"/g, '\\"')}"`;
}

/**
 * ラベルをエスケープ
 */
function escapeLabel(label: string): string {
  return label.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

