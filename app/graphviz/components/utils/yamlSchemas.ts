/**
 * YAML構造のJSON Schema定義
 * 各単位（topology, device, links, intent）のバリデーション用
 */

export const topologySchema = {
  type: 'object',
  required: ['id', 'type', 'label'],
  properties: {
    id: { type: 'string' },
    label: { type: 'string' },
    description: { type: 'string' },
    type: { type: 'string', enum: ['topology'] },
    layers: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'label', 'level'],
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          level: { type: 'number' },
        },
      },
    },
    metadata: {
      type: 'object',
      properties: {
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  },
};

export const deviceSchema = {
  type: 'object',
  required: ['id', 'type', 'label'],
  properties: {
    id: { type: 'string' },
    type: { type: 'string', enum: ['server', 'switch', 'router', 'firewall'] },
    label: { type: 'string' },
    model: { type: 'string' },
    location: {
      type: 'object',
      properties: {
        rack: { type: 'string' },
        unit: { type: 'string' },
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
          role: { type: 'string' },
          mac: { type: 'string' },
        },
      },
    },
    metadata: {
      type: 'object',
      properties: {
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  },
};

export const linksSchema = {
  type: 'object',
  required: ['id', 'type', 'label', 'connections'],
  properties: {
    id: { type: 'string' },
    type: { type: 'string', enum: ['links'] },
    label: { type: 'string' },
    network: { type: 'string' },
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
          network: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'planned'] },
        },
      },
    },
    metadata: {
      type: 'object',
      properties: {
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  },
};

export const intentSchema = {
  type: 'object',
  required: ['id', 'type', 'label', 'rules'],
  properties: {
    id: { type: 'string' },
    type: { type: 'string', enum: ['intent'] },
    label: { type: 'string' },
    rules: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'description', 'applies_to'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          applies_to: { type: 'string' },
          validation: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              min: { type: 'number' },
              max: { type: 'number' },
              target_devices: { type: 'string' },
            },
          },
        },
      },
    },
    metadata: {
      type: 'object',
      properties: {
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  },
};

/**
 * YAMLタイプから適切なスキーマを取得
 */
export function getSchemaForType(type: string) {
  switch (type) {
    case 'topology':
      return topologySchema;
    case 'device':
      return deviceSchema;
    case 'links':
      return linksSchema;
    case 'intent':
      return intentSchema;
    default:
      return null;
  }
}

/**
 * YAMLファイルのタイプを判定
 */
export function detectYamlType(yamlContent: any): 'topology' | 'device' | 'links' | 'intent' | 'site-topology' | 'site-equipment' | 'rack-servers' | 'server-details' | 'unknown' {
  if (!yamlContent || typeof yamlContent !== 'object') {
    return 'unknown';
  }

  // 新しい階層構造のタイプを優先的に判定
  if (yamlContent.type === 'site-topology' || yamlContent.sites) {
    return 'site-topology';
  }

  if (yamlContent.type === 'site-equipment' || (yamlContent.racks && yamlContent.siteId)) {
    return 'site-equipment';
  }

  if (yamlContent.type === 'rack-servers' || (yamlContent.servers && yamlContent.rackId)) {
    return 'rack-servers';
  }

  if (yamlContent.type === 'server-details' || (yamlContent.serverId && (yamlContent.os || yamlContent.sequences))) {
    return 'server-details';
  }

  // 既存のタイプ判定
  if (yamlContent.type === 'topology' || yamlContent.layers) {
    return 'topology';
  }

  if (yamlContent.type === 'device' || yamlContent.ports) {
    return 'device';
  }

  if (yamlContent.type === 'links' || yamlContent.connections) {
    return 'links';
  }

  if (yamlContent.type === 'intent' || yamlContent.rules) {
    return 'intent';
  }

  return 'unknown';
}

