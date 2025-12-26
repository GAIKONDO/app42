# 階層構造データ管理の設計

## 問題点

現在、Tab0から「この対象に機器を追加する」ボタンでTab2-4に遷移してYAMLを作成・保存すると、Graphvizのカード一覧に新しいカードが追加されてしまう。

**問題の原因**:
- すべてのYAMLファイルが同じテーブル（`graphvizYamlFiles`）に保存される
- カード一覧は`yamlType`に関係なく、すべてのファイルを表示している
- 階層構造（親子関係）を考慮した表示フィルタリングが実装されていない

---

## 現在のSQLiteテーブル構造

### graphvizYamlFiles テーブル

```sql
CREATE TABLE graphvizYamlFiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    yamlContent TEXT NOT NULL,
    yamlSchema TEXT,
    yamlType TEXT,  -- 'site-topology', 'site-equipment', 'rack-servers', 'server-details', etc.
    organizationId TEXT,
    tags TEXT,
    version INTEGER DEFAULT 1,
    parentYamlFileId TEXT,  -- 現在はバージョン管理用
    searchableText TEXT,
    semanticCategory TEXT,
    keywords TEXT,
    contentSummary TEXT,
    chromaSynced INTEGER DEFAULT 0,
    chromaSyncError TEXT,
    lastChromaSyncAttempt TEXT,
    lastSearchDate TEXT,
    searchCount INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (organizationId) REFERENCES organizations(id),
    FOREIGN KEY (parentYamlFileId) REFERENCES graphvizYamlFiles(id)
)
```

**現在のフィールド**:
- `yamlType`: YAMLのタイプ（'site-topology', 'site-equipment', 'rack-servers', 'server-details'）
- `parentYamlFileId`: バージョン管理用（階層関係の管理には使用されていない）

---

## 解決策の選択肢

### 方針1: カード表示のフィルタリング（推奨・シンプル）

**概要**:
- カード一覧には、トップレベルのYAMLファイル（`yamlType === 'site-topology'`）のみを表示
- 下位階層のファイル（`site-equipment`, `rack-servers`, `server-details`）は表示しない

**メリット**:
- 実装が簡単
- 既存のテーブル構造を変更する必要がない
- ユーザーには階層構造のトップレベル（棟間ネットワーク）のみが表示される

**デメリット**:
- 下位階層のファイルを直接編集したい場合、Tab0からアクセスする必要がある

**実装内容**:
```typescript
// GraphvizTab.tsx
const loadFiles = async () => {
  // ...
  const allFiles = await getAllGraphvizYamlFiles(organizationId);
  
  // トップレベルのみを表示（site-topologyのみ）
  const topLevelFiles = allFiles.filter(file => 
    file.yamlType === 'site-topology'
  );
  
  setFiles(topLevelFiles);
};
```

---

### 方針2: 階層フラグの追加

**概要**:
- `isTopLevel`フィールドを追加（または`hierarchyLevel`フィールド）
- カード一覧では`isTopLevel === true`のファイルのみを表示

**メリット**:
- より柔軟な階層管理が可能
- 将来的に階層構造が複雑になった場合にも対応可能

**デメリット**:
- データベースマイグレーションが必要
- 既存データの移行が必要

**実装内容**:
```sql
-- マイグレーション
ALTER TABLE graphvizYamlFiles ADD COLUMN isTopLevel INTEGER DEFAULT 0;

-- 既存データの更新
UPDATE graphvizYamlFiles SET isTopLevel = 1 WHERE yamlType = 'site-topology';
```

```typescript
// GraphvizTab.tsx
const topLevelFiles = allFiles.filter(file => file.isTopLevel === 1);
```

---

### 方針3: 親子関係の管理（parentYamlFileIdを活用）

**概要**:
- `parentYamlFileId`を階層関係の管理に使用
- `parentYamlFileId === null`のファイルのみをカード一覧に表示

**メリット**:
- 既存のフィールドを活用できる
- 階層関係が明確になる

**デメリット**:
- `parentYamlFileId`が現在バージョン管理用に使用されている可能性がある
- バージョン管理と階層管理の両方に使用すると混乱する可能性

**実装内容**:
```typescript
// 保存時にparentYamlFileIdを設定
// Tab2（site-equipment）の場合
const parentFile = await getSiteTopologyFileBySiteId(siteId);
await createGraphvizYamlFile(name, yamlContent, {
  parentYamlFileId: parentFile?.id, // 親ファイルIDを設定
  // ...
});

// カード一覧ではparentYamlFileId === nullのもののみ表示
const topLevelFiles = allFiles.filter(file => !file.parentYamlFileId);
```

---

### 方針4: 階層レベルフィールドの追加

**概要**:
- `hierarchyLevel`フィールドを追加（0: トップレベル、1: 第2階層、2: 第3階層、など）
- カード一覧では`hierarchyLevel === 0`のファイルのみを表示

**メリット**:
- 階層構造が明確
- 将来的な拡張に対応しやすい

**デメリット**:
- データベースマイグレーションが必要
- 既存データの移行が必要

**実装内容**:
```sql
-- マイグレーション
ALTER TABLE graphvizYamlFiles ADD COLUMN hierarchyLevel INTEGER DEFAULT 0;

-- 既存データの更新
UPDATE graphvizYamlFiles SET hierarchyLevel = 0 WHERE yamlType = 'site-topology';
UPDATE graphvizYamlFiles SET hierarchyLevel = 1 WHERE yamlType = 'site-equipment';
UPDATE graphvizYamlFiles SET hierarchyLevel = 2 WHERE yamlType = 'rack-servers';
UPDATE graphvizYamlFiles SET hierarchyLevel = 3 WHERE yamlType = 'server-details';
```

```typescript
// GraphvizTab.tsx
const topLevelFiles = allFiles.filter(file => file.hierarchyLevel === 0);
```

---

## 推奨実装: 方針1（カード表示のフィルタリング）

### 理由

1. **実装が簡単**: 既存のテーブル構造を変更する必要がない
2. **即座に適用可能**: データベースマイグレーションが不要
3. **明確な階層構造**: ユーザーにはトップレベル（棟間ネットワーク）のみが表示される
4. **下位階層へのアクセス**: Tab0から階層的にアクセスできる

### 実装内容

#### 1. GraphvizTabでのフィルタリング

```typescript
// app/organization/detail/components/tabs/GraphvizTab.tsx
const loadFiles = async () => {
  setIsLoading(true);
  try {
    const allFiles = await getAllGraphvizYamlFiles(organizationId);
    
    // トップレベルのみを表示（site-topologyのみ）
    const topLevelFiles = allFiles.filter(file => 
      file.yamlType === 'site-topology'
    );
    
    setFiles(topLevelFiles);
  } catch (error: any) {
    console.error('ファイル一覧の取得に失敗:', error);
  } finally {
    setIsLoading(false);
  }
};
```

#### 2. カウント表示の修正

```typescript
// GraphvizTab.tsx
// カウントもトップレベルのみをカウント
const graphvizCount = topLevelFiles.length;
```

#### 3. 既存のファイル編集への影響

- 既存の`site-equipment`、`rack-servers`、`server-details`ファイルは、カード一覧には表示されない
- これらのファイルを編集したい場合は、Tab0から階層的にアクセスする必要がある
- または、URLパラメータで直接アクセス（`/graphviz?fileId=xxx&tab=tab2`）

---

## 将来の拡張（オプション）

### 階層構造の可視化

将来的に、カード一覧で階層構造を表示したい場合：

```typescript
// 階層構造を表示する場合
interface GraphvizFileWithHierarchy extends GraphvizYamlFile {
  children?: GraphvizYamlFile[]; // 子ファイル
  parent?: GraphvizYamlFile; // 親ファイル
}

// 階層構造を構築
function buildHierarchy(files: GraphvizYamlFile[]): GraphvizFileWithHierarchy[] {
  const topLevel = files.filter(f => f.yamlType === 'site-topology');
  // 子ファイルを関連付け
  // ...
  return topLevel;
}
```

### 階層ナビゲーション

カード一覧から階層構造を展開して表示：

```
📁 本社・支社間ネットワーク
  ├─ 📁 東京本社DC 機器構成
  │   ├─ 📁 ラック1 サーバー詳細
  │   └─ 📁 ラック2 サーバー詳細
  └─ 📁 大阪支社DC 機器構成
```

---

## 実装の優先順位

### Phase 1: 基本フィルタリング（即座に実装可能）
1. ✅ GraphvizTabで`yamlType === 'site-topology'`のみを表示
2. ✅ カウント表示も修正

### Phase 2: 階層構造の可視化（将来の拡張）
1. 階層構造を表示するUI
2. 階層ナビゲーション機能

---

## まとめ

**推奨実装**: 方針1（カード表示のフィルタリング）

- 既存のテーブル構造を変更する必要がない
- 実装が簡単で即座に適用可能
- ユーザーにはトップレベル（棟間ネットワーク）のみが表示される
- 下位階層へのアクセスはTab0から階層的に可能

これにより、Tab0から「この対象に機器を追加する」ボタンで作成したファイルが、カード一覧に表示されなくなります。

