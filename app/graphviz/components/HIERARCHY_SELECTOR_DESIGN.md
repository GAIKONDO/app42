# 階層選択機能の設計

## 目的

Tab2、Tab3、Tab4でYAMLファイルを作成する際に、上位階層（棟・ラック・サーバー）を選択し、その情報をYAMLに自動的に反映する。

---

## 階層構造と参照関係

```
Tab1: site-topology
  └─ sites[] (site.id)
      │
      └─ Tab2: site-equipment (siteId: site.id を参照)
          └─ racks[] (rack.id)
              │
              └─ Tab3: rack-servers (rackId: rack.id を参照)
                  └─ servers[] (server.id)
                      │
                      └─ Tab4: server-details (serverId: server.id を参照)
```

---

## 必要な機能

### Tab2（site-equipment）での実装

**必要な情報**:
- どの棟（Tab1の`site.id`）に属するか

**実装内容**:
1. 棟選択UI（ドロップダウンまたはモーダル）
2. 選択した棟の`id`を`siteId`フィールドに自動設定
3. YAMLテンプレートに`siteId`を自動挿入

---

### Tab3（rack-servers）での実装

**必要な情報**:
- どのラック（Tab2の`rack.id`）に属するか

**実装内容**:
1. 棟選択UI（Tab2の`siteId`を特定するため）
2. ラック選択UI（選択した棟内のラック一覧から選択）
3. 選択したラックの`id`を`rackId`フィールドに自動設定
4. YAMLテンプレートに`rackId`を自動挿入

---

### Tab4（server-details）での実装

**必要な情報**:
- どのサーバー（Tab3の`server.id`）に属するか

**実装内容**:
1. 棟選択UI（Tab2の`siteId`を特定するため）
2. ラック選択UI（Tab3の`rackId`を特定するため）
3. サーバー選択UI（選択したラック内のサーバー一覧から選択）
4. 選択したサーバーの`id`を`serverId`フィールドに自動設定
5. YAMLテンプレートに`serverId`を自動挿入

---

## コンポーネント設計

### 1. HierarchySelector コンポーネント（共通）

**役割**:
- 階層選択UIを提供
- 選択した階層情報を返す

**Props**:
```typescript
interface HierarchySelectorProps {
  organizationId?: string | null;
  requiredLevel: 'site' | 'rack' | 'server';
  onSelect: (selected: HierarchySelection) => void;
  initialSelection?: HierarchySelection;
}

interface HierarchySelection {
  siteId?: string;
  siteLabel?: string;
  rackId?: string;
  rackLabel?: string;
  serverId?: string;
  serverLabel?: string;
}
```

**実装イメージ**:
```typescript
export function HierarchySelector({
  organizationId,
  requiredLevel,
  onSelect,
  initialSelection,
}: HierarchySelectorProps) {
  const [selectedSite, setSelectedSite] = useState<string | null>(
    initialSelection?.siteId || null
  );
  const [selectedRack, setSelectedRack] = useState<string | null>(
    initialSelection?.rackId || null
  );
  const [selectedServer, setSelectedServer] = useState<string | null>(
    initialSelection?.serverId || null
  );
  
  const [sites, setSites] = useState<Site[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  
  // 棟一覧を取得
  useEffect(() => {
    loadSites();
  }, [organizationId]);
  
  // 棟選択時にラック一覧を取得
  useEffect(() => {
    if (selectedSite && (requiredLevel === 'rack' || requiredLevel === 'server')) {
      loadRacks(selectedSite);
    }
  }, [selectedSite, requiredLevel]);
  
  // ラック選択時にサーバー一覧を取得
  useEffect(() => {
    if (selectedRack && requiredLevel === 'server') {
      loadServers(selectedRack);
    }
  }, [selectedRack, requiredLevel]);
  
  // 選択が変更されたときに親に通知
  useEffect(() => {
    onSelect({
      siteId: selectedSite || undefined,
      rackId: selectedRack || undefined,
      serverId: selectedServer || undefined,
    });
  }, [selectedSite, selectedRack, selectedServer, onSelect]);
  
  return (
    <div>
      {/* 棟選択 */}
      <select value={selectedSite || ''} onChange={(e) => setSelectedSite(e.target.value)}>
        <option value="">棟を選択</option>
        {sites.map(site => (
          <option key={site.id} value={site.id}>{site.label}</option>
        ))}
      </select>
      
      {/* ラック選択（必要な場合） */}
      {requiredLevel === 'rack' || requiredLevel === 'server' ? (
        <select 
          value={selectedRack || ''} 
          onChange={(e) => setSelectedRack(e.target.value)}
          disabled={!selectedSite}
        >
          <option value="">ラックを選択</option>
          {racks.map(rack => (
            <option key={rack.id} value={rack.id}>{rack.label}</option>
          ))}
        </select>
      ) : null}
      
      {/* サーバー選択（必要な場合） */}
      {requiredLevel === 'server' ? (
        <select 
          value={selectedServer || ''} 
          onChange={(e) => setSelectedServer(e.target.value)}
          disabled={!selectedRack}
        >
          <option value="">サーバーを選択</option>
          {servers.map(server => (
            <option key={server.id} value={server.id}>{server.label}</option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
```

---

### 2. YAMLテンプレート生成機能

**役割**:
- 選択した階層情報に基づいてYAMLテンプレートを生成

**実装イメージ**:
```typescript
// Tab2用
export function generateSiteEquipmentTemplate(selection: HierarchySelection): string {
  if (!selection.siteId) {
    throw new Error('棟が選択されていません');
  }
  
  return `id: site_equipment_${Date.now()}
type: site-equipment
label: ${selection.siteLabel || '棟内機器構成'}
description: ""
siteId: ${selection.siteId}
racks: []
connections: []
`;
}

// Tab3用
export function generateRackServersTemplate(selection: HierarchySelection): string {
  if (!selection.rackId) {
    throw new Error('ラックが選択されていません');
  }
  
  return `id: rack_servers_${Date.now()}
type: rack-servers
label: ${selection.rackLabel || 'ラック内サーバー'}
description: ""
rackId: ${selection.rackId}
servers: []
`;
}

// Tab4用
export function generateServerDetailsTemplate(selection: HierarchySelection): string {
  if (!selection.serverId) {
    throw new Error('サーバーが選択されていません');
  }
  
  return `id: server_details_${Date.now()}
type: server-details
label: ${selection.serverLabel || 'サーバー詳細'}
description: ""
serverId: ${selection.serverId}
os: {}
middleware: []
applications: []
sequences: []
`;
}
```

---

## 各タブでの統合方法

### Tab2（site-equipment）での統合

**実装箇所**:
- `app/graphviz/components/Tab2/index.tsx`
- `app/graphviz/components/Tab2/FileManager.tsx`

**実装内容**:
1. 新規YAML作成時に`HierarchySelector`を表示
2. 棟を選択したら、YAMLテンプレートを生成してエディタに設定
3. 保存時に`siteId`が正しく設定されているか検証

**UIフロー**:
```
1. 「新規作成」ボタンをクリック
2. HierarchySelectorが表示される（棟選択のみ）
3. 棟を選択
4. YAMLテンプレートが自動生成される（siteIdが設定済み）
5. ユーザーがYAMLを編集
6. 保存時にsiteIdが正しいか検証
```

---

### Tab3（rack-servers）での統合

**実装箇所**:
- `app/graphviz/components/Tab3/index.tsx`
- `app/graphviz/components/Tab3/FileManager.tsx`

**実装内容**:
1. 新規YAML作成時に`HierarchySelector`を表示
2. 棟 → ラックの順に選択
3. ラックを選択したら、YAMLテンプレートを生成してエディタに設定
4. 保存時に`rackId`が正しく設定されているか検証

**UIフロー**:
```
1. 「新規作成」ボタンをクリック
2. HierarchySelectorが表示される（棟 → ラック）
3. 棟を選択
4. ラック一覧が表示される
5. ラックを選択
6. YAMLテンプレートが自動生成される（rackIdが設定済み）
7. ユーザーがYAMLを編集
8. 保存時にrackIdが正しいか検証
```

---

### Tab4（server-details）での統合

**実装箇所**:
- `app/graphviz/components/Tab4/index.tsx`
- `app/graphviz/components/Tab4/FileManager.tsx`

**実装内容**:
1. 新規YAML作成時に`HierarchySelector`を表示
2. 棟 → ラック → サーバーの順に選択
3. サーバーを選択したら、YAMLテンプレートを生成してエディタに設定
4. 保存時に`serverId`が正しく設定されているか検証

**UIフロー**:
```
1. 「新規作成」ボタンをクリック
2. HierarchySelectorが表示される（棟 → ラック → サーバー）
3. 棟を選択
4. ラック一覧が表示される
5. ラックを選択
6. サーバー一覧が表示される
7. サーバーを選択
8. YAMLテンプレートが自動生成される（serverIdが設定済み）
9. ユーザーがYAMLを編集
10. 保存時にserverIdが正しいか検証
```

---

## データ取得API

### 棟一覧の取得

```typescript
// lib/graphvizHierarchyApi.ts
export async function getAllSites(organizationId?: string): Promise<Site[]> {
  const siteTopologies = await getSitesOnly(organizationId);
  const sites: Site[] = [];
  
  for (const topology of siteTopologies) {
    if (topology.sites && Array.isArray(topology.sites)) {
      sites.push(...topology.sites);
    }
  }
  
  return sites;
}
```

### ラック一覧の取得

```typescript
// lib/graphvizHierarchyApi.ts
export async function getRacksBySiteId(
  siteId: string,
  organizationId?: string
): Promise<Rack[]> {
  const siteEquipment = await getSiteEquipmentBySiteId(siteId, organizationId);
  
  if (!siteEquipment || !siteEquipment.racks) {
    return [];
  }
  
  return siteEquipment.racks;
}
```

### サーバー一覧の取得

```typescript
// lib/graphvizHierarchyApi.ts
export async function getServersByRackId(
  rackId: string,
  organizationId?: string
): Promise<Server[]> {
  const rackServers = await getRackServersByRackId(rackId, organizationId);
  
  if (!rackServers || !rackServers.servers) {
    return [];
  }
  
  return rackServers.servers;
}
```

---

## 保存時の検証

### Tab2（site-equipment）の検証

```typescript
// 保存前に検証
const validateSiteEquipment = (yamlContent: string, selectedSiteId: string): boolean => {
  try {
    const parsed = yaml.load(yamlContent) as any;
    
    // siteIdが設定されているか
    if (!parsed.siteId || parsed.siteId !== selectedSiteId) {
      alert(`siteIdが正しく設定されていません。選択した棟: ${selectedSiteId}`);
      return false;
    }
    
    // siteIdが存在する棟か確認
    // （参照整合性チェック）
    
    return true;
  } catch (e) {
    alert('YAMLの解析に失敗しました');
    return false;
  }
};
```

### Tab3（rack-servers）の検証

```typescript
// 保存前に検証
const validateRackServers = (yamlContent: string, selectedRackId: string): boolean => {
  try {
    const parsed = yaml.load(yamlContent) as any;
    
    // rackIdが設定されているか
    if (!parsed.rackId || parsed.rackId !== selectedRackId) {
      alert(`rackIdが正しく設定されていません。選択したラック: ${selectedRackId}`);
      return false;
    }
    
    // rackIdが存在するラックか確認
    // （参照整合性チェック）
    
    return true;
  } catch (e) {
    alert('YAMLの解析に失敗しました');
    return false;
  }
};
```

### Tab4（server-details）の検証

```typescript
// 保存前に検証
const validateServerDetails = (yamlContent: string, selectedServerId: string): boolean => {
  try {
    const parsed = yaml.load(yamlContent) as any;
    
    // serverIdが設定されているか
    if (!parsed.serverId || parsed.serverId !== selectedServerId) {
      alert(`serverIdが正しく設定されていません。選択したサーバー: ${selectedServerId}`);
      return false;
    }
    
    // serverIdが存在するサーバーか確認
    // （参照整合性チェック）
    
    return true;
  } catch (e) {
    alert('YAMLの解析に失敗しました');
    return false;
  }
};
```

---

## UI/UXの考慮事項

### 1. モーダル vs インライン表示

**モーダル方式**:
- 新規作成時にモーダルで階層選択
- 選択後にモーダルを閉じてYAMLエディタを表示
- **メリット**: UIがすっきりする
- **デメリット**: 選択を変更するには再度モーダルを開く必要がある

**インライン方式**:
- YAMLエディタの上部に階層選択UIを常時表示
- **メリット**: いつでも選択を変更できる
- **デメリット**: UIが複雑になる

**推奨**: モーダル方式（新規作成時のみ表示）

---

### 2. 既存ファイルの編集時

**既存ファイルを読み込んだ場合**:
- YAMLから`siteId`、`rackId`、`serverId`を抽出
- それに基づいて階層情報を表示（読み取り専用）
- 階層選択UIは非表示

**例**:
```typescript
// Tab2で既存ファイルを読み込んだ場合
const parsed = yaml.load(yamlContent) as any;
if (parsed.siteId) {
  // 既存のsiteIdを表示（編集不可）
  displayExistingHierarchy(parsed.siteId);
}
```

---

### 3. エラーハンドリング

**階層が存在しない場合**:
- 選択した棟が削除された場合
- 選択したラックが削除された場合
- 選択したサーバーが削除された場合

**対応**:
- 警告メッセージを表示
- 参照整合性チェックを実行
- ユーザーに再選択を促す

---

### 4. ローディング状態

**データ取得中**:
- ローディングインジケーターを表示
- 選択UIを無効化

**実装**:
```typescript
const [isLoadingSites, setIsLoadingSites] = useState(false);
const [isLoadingRacks, setIsLoadingRacks] = useState(false);
const [isLoadingServers, setIsLoadingServers] = useState(false);
```

---

## 実装の優先順位

### Phase 1: 基本機能
1. ✅ `HierarchySelector`コンポーネントの作成
2. ✅ 棟一覧取得API
3. ✅ Tab2での統合（棟選択のみ）

### Phase 2: ラック・サーバー選択
1. ✅ ラック一覧取得API
2. ✅ サーバー一覧取得API
3. ✅ Tab3での統合（棟 → ラック選択）
4. ✅ Tab4での統合（棟 → ラック → サーバー選択）

### Phase 3: 検証とエラーハンドリング
1. ✅ 保存時の検証機能
2. ✅ 参照整合性チェック
3. ✅ エラーメッセージの改善

### Phase 4: UI改善（オプション）
1. 階層選択UIの改善（検索機能、フィルタ機能）
2. 既存ファイル編集時の階層表示
3. 階層変更時の警告

---

## まとめ

Tab2、Tab3、Tab4でYAMLを作成する際に、上位階層（棟・ラック・サーバー）を選択し、その情報をYAMLに自動的に反映する機能を実装します。

**主な機能**:
- 階層選択UI（`HierarchySelector`コンポーネント）
- YAMLテンプレート自動生成
- 保存時の検証
- 参照整合性チェック

これにより、ユーザーは手動で`siteId`、`rackId`、`serverId`を入力する必要がなくなり、階層構造が明確になります。

