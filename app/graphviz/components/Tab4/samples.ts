/**
 * タブ4: サーバー詳細・シーケンス サンプルYAMLデータ
 */

export const SAMPLE_SERVER_DETAILS_YAML = `id: server_details_001
type: server-details
label: Webサーバー1 詳細設定
description: Webサーバー1のOS、ミドルウェア、アプリケーション構成
serverId: server_001

# ハードウェア情報
hardware:
  model: "Dell R650 TypeC1.3i"
  serialNumber: "ABC123456"
  manufacturer: "Dell"
  updated: "2025/1/15更新"

# ドライブベイ・スロット情報
slots:
  - id: slot0
    label: slot0 NVMe CPU1
    type: NVMe
    cpu: CPU1
    status: installed
    capacity: "1TB"
  - id: slot1
    label: slot1 NVMe CPU1
    type: NVMe
    cpu: CPU1
    status: installed
    capacity: "1TB"
  - id: slot2
    label: slot2 NVMe CPU1
    type: NVMe
    cpu: CPU1
    status: empty
    capacity: ""
  - id: slot3
    label: slot3 NVMe CPU1
    type: NVMe
    cpu: CPU1
    status: empty
    capacity: ""
  - id: slot4
    label: slot4 NVMe CPU0
    type: NVMe
    cpu: CPU0
    status: installed
    capacity: "2TB"
  - id: slot5
    label: slot5 NVMe CPU0
    type: NVMe
    cpu: CPU0
    status: empty
    capacity: ""

# フロントパネルポート
frontPanelPorts:
  - id: vga
    label: VGAポート
    type: VGA
    location: front
    description: "ビデオ出力ポート"
  - id: usb
    label: USBポート
    type: USB
    location: front
    description: "USB接続ポート"
  - id: power
    label: 電源ボタン
    type: button
    location: front
    description: "電源ボタン（LEDインジケーター付き）"

# ネットワークポート（type、speed、roleを含む）
ports:
  - id: eth0
    label: 管理ポート
    type: ethernet
    speed: 1Gbps
    role: management
    mac: "00:1B:44:11:3A:B7"
    ip: "192.168.1.100"
    vlan: 100
    description: "サーバー管理用ポート"
  - id: eth1
    label: サービスポート1
    type: ethernet
    speed: 25Gbps
    role: public
    mac: "00:1B:44:11:3A:B8"
    ip: "10.0.1.100"
    vlan: 200
    description: "パブリックサービス用ポート"
  - id: eth2
    label: サービスポート2
    type: ethernet
    speed: 25Gbps
    role: public
    mac: "00:1B:44:11:3A:B9"
    ip: "10.0.1.101"
    vlan: 200
    description: "パブリックサービス用ポート（冗長化）"
  - id: eth3
    label: 内部ネットワーク1
    type: ethernet
    speed: 25Gbps
    role: internal
    mac: "00:1B:44:11:3A:BA"
    ip: "172.16.1.100"
    vlan: 300
    description: "内部ネットワーク用ポート"
  - id: eth4
    label: 内部ネットワーク2
    type: ethernet
    speed: 25Gbps
    role: internal
    mac: "00:1B:44:11:3A:BB"
    ip: "172.16.1.101"
    vlan: 300
    description: "内部ネットワーク用ポート（冗長化）"
  - id: eth5
    label: ストレージネットワーク1
    type: ethernet
    speed: 25Gbps
    role: storage
    mac: "00:1B:44:11:3A:BC"
    ip: "192.168.10.100"
    vlan: 400
    description: "ストレージネットワーク用ポート"
  - id: eth6
    label: ストレージネットワーク2
    type: ethernet
    speed: 25Gbps
    role: storage
    mac: "00:1B:44:11:3A:BD"
    ip: "192.168.10.101"
    vlan: 400
    description: "ストレージネットワーク用ポート（冗長化）"
  - id: eth7
    label: バックアップネットワーク
    type: ethernet
    speed: 10Gbps
    role: backup
    mac: "00:1B:44:11:3A:BE"
    ip: "192.168.20.100"
    vlan: 500
    description: "バックアップ用ネットワークポート"
  - id: eth8
    label: 予備ポート1
    type: ethernet
    speed: 25Gbps
    role: unused
    mac: "00:1B:44:11:3A:BF"
    description: "未使用ポート"
  - id: eth9
    label: 予備ポート2
    type: ethernet
    speed: 25Gbps
    role: unused
    mac: "00:1B:44:11:3A:C0"
    description: "未使用ポート"

os:
  type: Linux
  distribution: Ubuntu 22.04 LTS
  kernel: 5.15.0
  description: "Ubuntu 22.04 LTS Server"

middleware:
  - name: nginx
    version: 1.22.0
    config: /etc/nginx/nginx.conf
    description: "Webサーバー"

  - name: Node.js
    version: 18.17.0
    config: /etc/nodejs/app.json
    description: "アプリケーションランタイム"

applications:
  - name: web-app
    port: 8080
    environment: production
    env_vars:
      DB_HOST: db.example.com
      DB_PORT: 5432
      DB_NAME: myapp
      REDIS_HOST: redis.example.com
      REDIS_PORT: 6379
    description: "メインWebアプリケーション"

sequences:
  - id: seq_user_auth
    label: ユーザー認証フロー
    description: "ユーザーログイン時の認証シーケンス"
    participants:
      - user
      - web-server
      - auth-server
      - database
    steps:
      - from: user
        to: web-server
        message: "POST /login {username, password}"
        description: "ユーザーがログイン情報を送信"

      - from: web-server
        to: auth-server
        message: "validate credentials"
        description: "認証サーバーに認証情報を送信"

      - from: auth-server
        to: database
        message: "SELECT * FROM users WHERE username = ?"
        description: "データベースからユーザー情報を取得"

      - from: database
        to: auth-server
        message: "user data"
        description: "ユーザー情報を返却"

      - from: auth-server
        to: web-server
        message: "JWT token"
        description: "認証成功、JWTトークンを発行"

      - from: web-server
        to: user
        message: "200 OK {token}"
        description: "ログイン成功、トークンを返却"
`;

export const SAMPLES: Record<string, string> = {
  server_details: SAMPLE_SERVER_DETAILS_YAML,
};

