/**
 * タブ3: ラック内サーバー・ポート サンプルYAMLデータ
 */

export const SAMPLE_RACK_SERVERS_YAML = `id: rack_servers_001
type: rack-servers
label: ラック1 サーバー詳細
description: ラック1内のサーバーとポートの詳細情報
rackId: rack_001

servers:
  - id: server_001
    label: Webサーバー1
    model: Dell R7625
    specs:
      cpu:
        model: "AMD EPYC 7763"
        cores: 64
      memory:
        total: 512GB
        slots: 16
      storage:
        type: NVMe
        capacity: 3.84TB
    ports:
      - id: eth0
        label: 管理ポート
        speed: 1Gbps
        mac: "00:1B:44:11:3A:B7"
        ip: "192.168.1.10/24"
        vlan: 100
        description: "管理ネットワーク用"

      - id: eth1
        label: サービスポート
        speed: 10Gbps
        mac: "00:1B:44:11:3A:B8"
        ip: "10.0.1.10/24"
        vlan: 200
        description: "サービスネットワーク用"

    connections:
      - from:
          port: eth0
        to:
          device: switch_001
          port: port1
        type: management
        description: "管理ネットワーク接続"

      - from:
          port: eth1
        to:
          device: switch_001
          port: port2
        type: service
        description: "サービスネットワーク接続"
`;

export const SAMPLES: Record<string, string> = {
  rack_servers: SAMPLE_RACK_SERVERS_YAML,
};

