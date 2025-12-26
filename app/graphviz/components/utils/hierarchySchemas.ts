/**
 * 階層的なネットワーク管理用YAMLスキーマ定義
 * タブ1-4の各レイヤーに対応
 */

// タブ1: 棟間ネットワーク
export const siteTopologySchema = {
  type: 'object',
  required: ['id', 'type', 'label'],
  properties: {
    id: { type: 'string' },
    type: { type: 'string', enum: ['site-topology'] },
    label: { type: 'string' },
    description: { type: 'string' },
    sites: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'label'],
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          location: {
            type: 'object',
            properties: {
              lat: { type: 'number' },
              lon: { type: 'number' },
              address: { type: 'string' },
            },
          },
          capacity: {
            type: 'object',
            properties: {
              racks: { type: 'number' },
              power: { type: 'number' },
            },
          },
        },
      },
    },
    connections: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'from', 'to'],
        properties: {
          id: { type: 'string' },
          from: { type: 'string' }, // site ID
          to: { type: 'string' }, // site ID
          type: { type: 'string', enum: ['dedicated-line', 'vpn', 'internet', 'mpls'] },
          bandwidth: { type: 'string' },
          latency: { type: 'string' },
          provider: { type: 'string' },
        },
      },
    },
  },
};

// タブ2: 棟内機器構成
export const siteEquipmentSchema = {
  type: 'object',
  required: ['id', 'type', 'label', 'siteId'],
  properties: {
    id: { type: 'string' },
    type: { type: 'string', enum: ['site-equipment'] },
    label: { type: 'string' },
    description: { type: 'string' },
    siteId: { type: 'string' }, // タブ1のsite IDを参照
    racks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'label'],
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          location: {
            type: 'object',
            properties: {
              floor: { type: 'number' },
              row: { type: 'string' },
              position: { type: 'number' },
            },
          },
          capacity: {
            type: 'object',
            properties: {
              units: { type: 'number' },
              power: { type: 'number' },
            },
          },
          equipment: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'type', 'label'],
              properties: {
                id: { type: 'string' },
                type: { type: 'string', enum: ['server', 'switch', 'router', 'firewall', 'storage'] },
                label: { type: 'string' },
                model: { type: 'string' },
                position: {
                  type: 'object',
                  properties: {
                    unit: { type: 'string' }, // e.g., "1-4"
                  },
                },
                ports: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['id', 'label'],
                    properties: {
                      id: { type: 'string' },
                      label: { type: 'string' },
                      speed: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    connections: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'from', 'to'],
        properties: {
          id: { type: 'string' },
          from: {
            type: 'object',
            required: ['device', 'port'],
            properties: {
              device: { type: 'string' },
              port: { type: 'string' },
            },
          },
          to: {
            type: 'object',
            required: ['device', 'port'],
            properties: {
              device: { type: 'string' },
              port: { type: 'string' },
            },
          },
          network: { type: 'string' }, // e.g., "management", "service"
        },
      },
    },
  },
};

// タブ3: ラック内サーバー・ポート詳細
export const rackServersSchema = {
  type: 'object',
  required: ['id', 'type', 'label', 'rackId'],
  properties: {
    id: { type: 'string' },
    type: { type: 'string', enum: ['rack-servers'] },
    label: { type: 'string' },
    description: { type: 'string' },
    rackId: { type: 'string' }, // タブ2のrack IDを参照
    servers: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'label'],
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          model: { type: 'string' },
          specs: {
            type: 'object',
            properties: {
              cpu: {
                type: 'object',
                properties: {
                  model: { type: 'string' },
                  cores: { type: 'number' },
                },
              },
              memory: {
                type: 'object',
                properties: {
                  total: { type: 'string' },
                  slots: { type: 'number' },
                },
              },
              storage: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  capacity: { type: 'string' },
                },
              },
            },
          },
          ports: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'label'],
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                speed: { type: 'string' },
                mac: { type: 'string' },
                ip: { type: 'string' },
                vlan: { type: 'number' },
              },
            },
          },
          connections: {
            type: 'array',
            items: {
              type: 'object',
              required: ['from', 'to'],
              properties: {
                from: {
                  type: 'object',
                  required: ['port'],
                  properties: {
                    port: { type: 'string' },
                  },
                },
                to: {
                  type: 'object',
                  required: ['device', 'port'],
                  properties: {
                    device: { type: 'string' },
                    port: { type: 'string' },
                  },
                },
                type: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

// タブ4: 機器詳細・シーケンス
export const serverDetailsSchema = {
  type: 'object',
  required: ['id', 'type', 'label', 'serverId'],
  properties: {
    id: { type: 'string' },
    type: { type: 'string', enum: ['server-details'] },
    label: { type: 'string' },
    description: { type: 'string' },
    serverId: { type: 'string' }, // タブ3のserver IDを参照
    os: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        distribution: { type: 'string' },
        kernel: { type: 'string' },
      },
    },
    middleware: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          version: { type: 'string' },
          config: { type: 'string' },
        },
      },
    },
    applications: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          port: { type: 'number' },
          environment: { type: 'string' },
          env_vars: { type: 'object' },
        },
      },
    },
    sequences: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'label', 'participants', 'steps'],
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          participants: {
            type: 'array',
            items: { type: 'string' },
          },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              required: ['from', 'to', 'message'],
              properties: {
                from: { type: 'string' },
                to: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

// スキーママッピング
export const hierarchySchemaMap = {
  'site-topology': siteTopologySchema,
  'site-equipment': siteEquipmentSchema,
  'rack-servers': rackServersSchema,
  'server-details': serverDetailsSchema,
};

