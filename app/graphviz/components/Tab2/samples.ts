/**
 * タブ2: 棟内機器構成 サンプルYAMLデータ
 */

export const SAMPLE_SITE_EQUIPMENT_YAML = `id: site_equipment_tokyo
type: site-equipment
label: 東京本社DC 機器構成
description: 東京本社データセンター内のラック配置と機器構成
siteId: site_tokyo

racks:
  - id: rack_001
    label: ラック1
    location:
      floor: 1
      row: A
      position: 1
    capacity:
      units: 42
      power: 10
    equipment:
      - id: server_001
        type: server
        label: Webサーバー1
        model: Dell R7625
        position:
          unit: "1-4"
        ports:
          - id: eth0
            label: 管理ポート
            speed: 1Gbps
          - id: eth1
            label: サービスポート
            speed: 10Gbps

      - id: switch_001
        type: switch
        label: スイッチ1
        model: Cisco Nexus 9000
        position:
          unit: "5-6"
        ports:
          - id: port1
            label: ポート1
            speed: 1Gbps
          - id: port2
            label: ポート2
            speed: 10Gbps

  - id: rack_002
    label: ラック2
    location:
      floor: 1
      row: A
      position: 2
    capacity:
      units: 42
      power: 10
    equipment:
      - id: server_002
        type: server
        label: DBサーバー1
        model: Dell R7625
        position:
          unit: "1-4"
        ports:
          - id: eth0
            label: 管理ポート
            speed: 1Gbps
          - id: eth1
            label: データベースポート
            speed: 10Gbps

connections:
  - id: link_001
    from:
      device: server_001
      port: eth0
    to:
      device: switch_001
      port: port1
    network: management
    description: "Webサーバー1の管理ポート接続"

  - id: link_002
    from:
      device: server_001
      port: eth1
    to:
      device: switch_001
      port: port2
    network: service
    description: "Webサーバー1のサービスポート接続"
`;

export const SAMPLES: Record<string, string> = {
  site_equipment: SAMPLE_SITE_EQUIPMENT_YAML,
};

