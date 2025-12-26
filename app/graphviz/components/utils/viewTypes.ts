/**
 * Graphviz Viewタイプ定義
 */

export type ViewType = 'topology' | 'device' | 'connection' | 'full' | 'intent';

export interface ViewConfig {
  id: ViewType;
  label: string;
  description: string;
  includes: {
    topology: boolean;
    devices: boolean;
    links: boolean;
    intents: boolean;
  };
}

export const VIEW_CONFIGS: Record<ViewType, ViewConfig> = {
  topology: {
    id: 'topology',
    label: 'Topology View',
    description: 'トポロジ構造のみ（レイヤー表示）',
    includes: {
      topology: true,
      devices: false,
      links: false,
      intents: false,
    },
  },
  device: {
    id: 'device',
    label: 'Device View',
    description: 'デバイスとそのポート',
    includes: {
      topology: true,
      devices: true,
      links: false,
      intents: false,
    },
  },
  connection: {
    id: 'connection',
    label: 'Connection View',
    description: '接続関係のみ',
    includes: {
      topology: false,
      devices: true,
      links: true,
      intents: false,
    },
  },
  full: {
    id: 'full',
    label: 'Full View',
    description: 'すべてを統合表示',
    includes: {
      topology: true,
      devices: true,
      links: true,
      intents: false,
    },
  },
  intent: {
    id: 'intent',
    label: 'Intent View',
    description: 'ルール違反をハイライト',
    includes: {
      topology: true,
      devices: true,
      links: true,
      intents: true,
    },
  },
};

