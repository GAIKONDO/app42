# 複雑なネットワーク構造のサンプル

このディレクトリには、ケーブリングガイド全体図をベースにした複雑なネットワーク構造のYAMLファイルが含まれています。

## ファイル構成

### Topology
- `topology_network.yaml`: ServiceNWとHW管理NWのトポロジ定義

### Devices
- `devices_switches.yaml`: スイッチデバイス（Super Spine, Spine, Leaf, OOB Spine/Leaf）
- `devices_servers.yaml`: サーバー・ストレージデバイス
- `devices_external.yaml`: 外部デバイス（別フロア・別ラック）

### Links
- `links_service_nw.yaml`: ServiceNWの接続関係
- `links_hw_mgmt_nw.yaml`: HW管理NWの接続関係

### Intents
- `intent_cabling_rules.yaml`: ケーブリングルールとバリデーション

## 使用方法

### 単一ファイルでのテスト
各ファイルを個別にTab1で読み込んでテストできます。

### 複数ファイルの統合（将来実装）
Phase 2で実装予定の機能：
- 複数ファイルを選択して統合
- 統合されたデータからGraphvizを生成

## 構造の特徴

### ネットワーク階層
- **ServiceNW**: Super Spine → Spine → Leaf → Devices
- **HW管理NW**: OOB Spine → OOB Leaf → Devices

### 接続タイプ
- **架内**: UTP/STP Cable (Cat5e)
- **架外**: STP Cable (Cat5e)
- **光ファイバー**: 各種SFP/SFP28/QSFP/QDD
- **別フロア**: SMF (Single Mode Fiber)
- **架内**: MMF (Multi Mode Fiber)

### デバイス数
- スイッチ: 10台
- サーバー/ストレージ: 5台
- 外部デバイス: 6台
- **合計**: 21デバイス

### 接続数
- ServiceNW: 約20接続
- HW管理NW: 約10接続
- **合計**: 約30接続

## テストシナリオ

1. **Topology View**: レイヤー構造のみ表示
2. **Device View**: デバイスとポートの関係
3. **Connection View**: 接続関係のみ
4. **Full View**: すべてを統合表示
5. **Intent View**: ルール違反の検出（将来実装）

