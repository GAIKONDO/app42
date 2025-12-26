/**
 * Graphviz YAML→DOT変換用の型定義
 */

export interface GraphvizYAMLNode {
  id: string;
  label?: string;
  shape?: string;
  color?: string;
  style?: string;
  [key: string]: any;
}

export interface GraphvizYAMLEdge {
  from: string;
  to: string;
  label?: string;
  style?: string;
  color?: string;
  [key: string]: any;
}

export interface GraphvizYAML {
  graph?: {
    name?: string;
    type?: 'digraph' | 'graph';
    nodes?: GraphvizYAMLNode[];
    edges?: GraphvizYAMLEdge[];
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ConversionResult {
  dotCode: string;
  error?: string;
}

