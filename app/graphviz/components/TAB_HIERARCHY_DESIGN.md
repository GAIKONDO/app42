# Graphviz タブ階層設計

## 概要

Graphviz機能は、ネットワークインフラを階層的に管理するための4つのタブで構成されています。各タブは異なる視点（レイヤー）でネットワーク情報を管理し、相互に関連性を持ちます。

## 階層構造

```
タブ1: 棟間ネットワーク（最上位）
  └─ タブ2: 棟内機器構成
      └─ タブ3: ラック内サーバー・ポート
          └─ タブ4: サーバー詳細・シーケンス（最下位）
```

## 各タブの役割

### タブ1: 棟間ネットワーク（Site-to-Site Network）

**視点**: 複数の棟（データセンター、拠点）間のネットワーク接続関係

**管理内容**:
- 棟（Site/DataCenter）の定義
- 棟間のネットワーク接続（WAN、専用線、VPN等）
- ネットワークレイヤー（物理層、論理層等）
- 棟間の帯域幅、遅延、可用性情報

**YAML構造**:
```yaml
id: site_network_001
type: site-topology
label: 本社-支社間ネットワーク
description: 本社データセンターと各支社間のネットワーク構成
sites:
  - id: site_tokyo
    label: 東京本社DC
    location: { lat: 35.6812, lon: 139.7671 }
    capacity: { racks: 100, power: 5000 }
  - id: site_osaka
    label: 大阪支社DC
    location: { lat: 34.6937, lon: 135.5023 }
    capacity: { racks: 50, power: 2500 }
connections:
  - id: conn_001
    from: site_tokyo
    to: site_osaka
    type: dedicated-line
    bandwidth: 10Gbps
    latency: 5ms
    provider: NTT
```

**関連性**:
- タブ2の棟IDを参照可能
- 各棟の詳細はタブ2で管理

---

### タブ2: 棟内機器構成（Site Equipment）

**視点**: 1つの棟内の機器構成、ラック配置、機器間の接続

**管理内容**:
- ラック（Rack）の定義と配置
- ラック内の機器（サーバー、スイッチ、ルーター等）の配置
- 機器間の接続（LAN、管理ネットワーク等）
- 機器の物理的な配置情報（ラック番号、ユニット位置等）

**YAML構造**:
```yaml
id: site_equipment_tokyo
type: site-equipment
label: 東京本社DC 機器構成
siteId: site_tokyo  # タブ1の棟IDを参照
racks:
  - id: rack_001
    label: ラック1
    location: { floor: 1, row: A, position: 1 }
    capacity: { units: 42, power: 10 }
    equipment:
      - id: server_001
        type: server
        label: Webサーバー1
        model: Dell R7625
        position: { unit: 1-4 }
        ports:
          - id: eth0
            label: 管理ポート
            speed: 1Gbps
      - id: switch_001
        type: switch
        label: スイッチ1
        model: Cisco Nexus 9000
        position: { unit: 5-6 }
connections:
  - id: link_001
    from: { device: server_001, port: eth0 }
    to: { device: switch_001, port: port1 }
    network: management
```

**関連性**:
- タブ1の棟IDを参照
- タブ3のサーバーIDを参照可能
- 各サーバーの詳細はタブ3で管理

---

### タブ3: ラック内サーバー・ポート（Rack Server Details）

**視点**: 1つのラック内のサーバーや機器の詳細、ポート構成、接続詳細

**管理内容**:
- サーバーの詳細仕様（CPU、メモリ、ストレージ等）
- ポートの詳細情報（速度、VLAN、IPアドレス等）
- ポート間の接続詳細
- ネットワーク設定（VLAN、サブネット等）

**YAML構造**:
```yaml
id: rack_servers_001
type: rack-servers
label: ラック1 サーバー詳細
rackId: rack_001  # タブ2のラックIDを参照
servers:
  - id: server_001
    label: Webサーバー1
    model: Dell R7625
    specs:
      cpu: { model: "AMD EPYC 7763", cores: 64 }
      memory: { total: 512GB, slots: 16 }
      storage: { type: NVMe, capacity: 3.84TB }
    ports:
      - id: eth0
        label: 管理ポート
        speed: 1Gbps
        mac: "00:1B:44:11:3A:B7"
        ip: "192.168.1.10/24"
        vlan: 100
      - id: eth1
        label: サービスポート
        speed: 10Gbps
        mac: "00:1B:44:11:3A:B8"
        ip: "10.0.1.10/24"
        vlan: 200
    connections:
      - from: { port: eth0 }
        to: { device: switch_001, port: port1 }
        type: management
      - from: { port: eth1 }
        to: { device: switch_001, port: port2 }
        type: service
```

**関連性**:
- タブ2のラックID・機器IDを参照
- タブ4のサーバーIDを参照可能
- 各サーバーの詳細設定はタブ4で管理

---

### タブ4: サーバー詳細・シーケンス（Server Details & Sequences）

**視点**: 個別サーバーの詳細設定、アプリケーション構成、シーケンス図

**管理内容**:
- サーバーのOS、ミドルウェア、アプリケーション構成
- 設定ファイル、環境変数
- アプリケーション間のシーケンス図
- 監視設定、ログ設定
- バックアップ・復旧手順

**YAML構造**:
```yaml
id: server_details_001
type: server-details
label: Webサーバー1 詳細設定
serverId: server_001  # タブ3のサーバーIDを参照
os:
  type: Linux
  distribution: Ubuntu 22.04 LTS
  kernel: 5.15.0
middleware:
  - name: nginx
    version: 1.22.0
    config: /etc/nginx/nginx.conf
  - name: Node.js
    version: 18.17.0
applications:
  - name: web-app
    port: 8080
    environment: production
    env_vars:
      DB_HOST: db.example.com
      DB_PORT: 5432
sequences:
  - id: seq_001
    label: ユーザー認証フロー
    participants:
      - user
      - web-server
      - auth-server
      - database
    steps:
      - from: user
        to: web-server
        message: "POST /login"
      - from: web-server
        to: auth-server
        message: "validate token"
      - from: auth-server
        to: database
        message: "query user"
```

**関連性**:
- タブ3のサーバーIDを参照
- 最下位レイヤーで、他のタブから参照される

---

## データの関連性

### 参照関係

```
タブ1 (棟間)
  └─ siteId → タブ2 (棟内)
      └─ rackId → タブ3 (ラック内)
          └─ serverId → タブ4 (サーバー詳細)
```

### データ整合性

- 上位タブで定義されたIDは、下位タブで参照可能
- 下位タブで参照されているIDは、上位タブで削除できない（参照整合性チェック）
- 各タブのデータは独立して保存・管理可能
- 階層的なビューで全体像を把握可能

## 実装方針

1. **各タブの独立性**: 各タブは独立したYAMLファイルとして保存
2. **参照の明示化**: 上位タブのIDを下位タブで明示的に参照
3. **階層ビュー**: 全体像を把握するための階層ビュー機能
4. **検証機能**: 参照整合性の検証機能
5. **ナビゲーション**: 関連するタブ間の移動を容易にする機能

