/**
 * サンプルYAMLデータ
 */

export const SAMPLE_TOPOLOGY_YAML = `# topology/service.yaml
id: service
label: Service Network
description: サービスネットワークのトポロジ定義
type: topology
layers:
  - id: super_spine
    label: Super Spine
    level: 0
  - id: spine
    label: Spine
    level: 1
  - id: leaf
    label: Leaf
    level: 2
metadata:
  createdAt: "2025-01-01T00:00:00Z"
  updatedAt: "2025-01-01T00:00:00Z"
`;

export const SAMPLE_DEVICE_YAML = `# devices/servers/dell_r7625_01.yaml
id: dell_r7625_01
type: device
label: Dell R7625 #01
model: Dell R7625
location:
  rack: rack1
  unit: U10
ports:
  - id: eth1
    label: eth1
    speed: 100G
    role: service
    mac: "00:11:22:33:44:55"
  - id: eth2
    label: eth2
    speed: 100G
    role: service
    mac: "00:11:22:33:44:56"
metadata:
  createdAt: "2025-01-01T00:00:00Z"
  updatedAt: "2025-01-01T00:00:00Z"
`;

export const SAMPLE_LINKS_YAML = `# links/rack1.yaml
id: rack1_links
label: Rack 1 Connections
type: links
network: service
connections:
  - id: conn_001
    from:
      device: dell_r7625_01
      port: eth1
    to:
      device: svc_leaf_rack1_n0
      port: eth49
    network: service
    status: active
  - id: conn_002
    from:
      device: dell_r7625_01
      port: eth2
    to:
      device: svc_leaf_rack1_n1
      port: eth49
    network: service
    status: active
metadata:
  createdAt: "2025-01-01T00:00:00Z"
  updatedAt: "2025-01-01T00:00:00Z"
`;

export const SAMPLE_INTENT_YAML = `# intents/redundancy.yaml
id: redundancy
label: Redundancy Rules
type: intent
rules:
  - name: server_dual_homing
    description: Serverは必ず別Leafに接続する
    applies_to: server
    validation:
      type: connection_count
      min: 2
      max: 2
      target_devices: leaf
metadata:
  createdAt: "2025-01-01T00:00:00Z"
  updatedAt: "2025-01-01T00:00:00Z"
`;

export const SAMPLE_COMPLEX_TOPOLOGY_YAML = `# topology/network.yaml
# ケーブリングガイド全体図のトポロジ定義
id: network_topology
label: ケーブリングガイド 全体図
description: ServiceNWとHW管理NWを含むネットワークトポロジ
type: topology
networks:
  - id: service_nw
    label: ServiceNW
    description: サービスネットワーク
    layers:
      - id: super_spine
        label: ServiceNW Super Spine
        level: 0
      - id: spine
        label: ServiceNW Spine
        level: 1
      - id: leaf
        label: ServiceNW Leaf
        level: 2
        variants:
          - id: leaf_gtr
            label: ServiceNW Leaf (GTR接続)
          - id: leaf_storage
            label: ServiceNW Storage Leaf
  - id: hw_mgmt_nw
    label: HW管理NW
    description: ハードウェア管理ネットワーク（OOB）
    layers:
      - id: oob_spine
        label: HW管理NW OOB Spine
        level: 0
      - id: oob_leaf
        label: HW管理NW OOB Leaf
        level: 1
        variants:
          - id: oob_leaf_mgmt
            label: HW管理NW OOB Leaf (MGMT)
          - id: oob_leaf_service
            label: HW管理NW OOB Leaf (ServiceNW接続)
metadata:
  createdAt: "2025-01-01T00:00:00Z"
  updatedAt: "2025-01-01T00:00:00Z"
`;

export const SAMPLE_COMPLEX_LINKS_YAML = `# links/service_nw.yaml
id: service_nw_links
label: ServiceNW Connections
type: links
network: service_nw
connections:
  - id: conn_super_spine_01_to_spine
    from:
      device: svc_super_spine_01
      port: port_1
    to:
      device: svc_spine
      port: port_1
    network: service_nw
    status: active
    cable_type: QDD-400G-DR4
    cable_spec: SMF MPO-12 (TypeB, APC)
  - id: conn_spine_to_leaf_gtr
    from:
      device: svc_spine
      port: port_3
    to:
      device: svc_leaf_gtr
      port: eth50
    network: service_nw
    status: active
    cable_type: QDD-400G-DR4
    cable_spec: SMF MPO-12 (TypeB, APC)
  - id: conn_leaf_gtr_to_server
    from:
      device: svc_leaf_gtr
      port: eth49
    to:
      device: server_01
      port: eth1
    network: service_nw
    status: active
    cable_type: Breakout DAC QSFP-DD
    cable_spec: 4x QSFP56-100G
  - id: conn_leaf_gtr_to_gtr
    from:
      device: svc_leaf_gtr
      port: eth51
    to:
      device: gtr
      port: eth1
    network: service_nw
    status: active
    cable_type: QSFP-100G-LR4
    cable_spec: SMF LC Duplex
    location: other_floor
metadata:
  createdAt: "2025-01-01T00:00:00Z"
  updatedAt: "2025-01-01T00:00:00Z"
`;

export const SAMPLE_SITE_TOPOLOGY_YAML = `id: site_network_001
type: site-topology
label: 本社-支社間ネットワーク
description: 本社データセンターと各支社間のネットワーク構成

sites:
  - id: site_tokyo
    label: 東京本社DC
    location:
      lat: 35.6812
      lon: 139.7671
      address: "東京都千代田区丸の内1-1-1"
    capacity:
      racks: 100
      power: 5000

  - id: site_osaka
    label: 大阪支社DC
    location:
      lat: 34.6937
      lon: 135.5023
      address: "大阪府大阪市北区梅田1-1-1"
    capacity:
      racks: 50
      power: 2500

connections:
  - id: conn_tokyo_osaka
    from: site_tokyo
    to: site_osaka
    type: dedicated-line
    bandwidth: 10Gbps
    latency: 5ms
    provider: NTT
    description: "東京-大阪間専用線"
`;

export const SAMPLES: Record<string, string> = {
  topology: SAMPLE_TOPOLOGY_YAML,
  device: SAMPLE_DEVICE_YAML,
  links: SAMPLE_LINKS_YAML,
  intent: SAMPLE_INTENT_YAML,
  complex_topology: SAMPLE_COMPLEX_TOPOLOGY_YAML,
  complex_links: SAMPLE_COMPLEX_LINKS_YAML,
  site_topology: SAMPLE_SITE_TOPOLOGY_YAML,
};

