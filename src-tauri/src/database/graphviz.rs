/**
 * Graphviz YAML/DOTファイル管理モジュール
 * SQLiteにYAML/DOTファイル情報を保存・管理
 */

use rusqlite::{params, Result as SqlResult};
use serde::{Deserialize, Serialize};
use crate::database::{get_db, get_timestamp};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphvizYamlFile {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(rename = "yamlContent")]
    pub yaml_content: String,
    #[serde(rename = "yamlSchema")]
    pub yaml_schema: Option<String>,
    #[serde(rename = "yamlType")]
    pub yaml_type: Option<String>,
    #[serde(rename = "organizationId")]
    pub organization_id: Option<String>,
    pub tags: Option<String>, // JSON配列文字列
    pub version: i32,
    #[serde(rename = "parentYamlFileId")]
    pub parent_yaml_file_id: Option<String>,
    #[serde(rename = "searchableText")]
    pub searchable_text: Option<String>,
    #[serde(rename = "semanticCategory")]
    pub semantic_category: Option<String>,
    pub keywords: Option<String>, // JSON配列文字列
    #[serde(rename = "contentSummary")]
    pub content_summary: Option<String>,
    #[serde(rename = "chromaSynced")]
    pub chroma_synced: i32,
    #[serde(rename = "chromaSyncError")]
    pub chroma_sync_error: Option<String>,
    #[serde(rename = "lastChromaSyncAttempt")]
    pub last_chroma_sync_attempt: Option<String>,
    #[serde(rename = "lastSearchDate")]
    pub last_search_date: Option<String>,
    #[serde(rename = "searchCount")]
    pub search_count: i32,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphvizDotFile {
    pub id: String,
    #[serde(rename = "yamlFileId")]
    pub yaml_file_id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(rename = "dotContent")]
    pub dot_content: String,
    #[serde(rename = "graphType")]
    pub graph_type: String,
    #[serde(rename = "viewType")]
    pub view_type: Option<String>,
    #[serde(rename = "nodeCount")]
    pub node_count: Option<i32>,
    #[serde(rename = "edgeCount")]
    pub edge_count: Option<i32>,
    #[serde(rename = "organizationId")]
    pub organization_id: Option<String>,
    pub tags: Option<String>, // JSON配列文字列
    pub version: i32,
    #[serde(rename = "parentDotFileId")]
    pub parent_dot_file_id: Option<String>,
    #[serde(rename = "searchableText")]
    pub searchable_text: Option<String>,
    #[serde(rename = "chromaSynced")]
    pub chroma_synced: i32,
    #[serde(rename = "chromaSyncError")]
    pub chroma_sync_error: Option<String>,
    #[serde(rename = "lastChromaSyncAttempt")]
    pub last_chroma_sync_attempt: Option<String>,
    #[serde(rename = "lastSearchDate")]
    pub last_search_date: Option<String>,
    #[serde(rename = "searchCount")]
    pub search_count: i32,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// YAMLファイルを作成
pub fn create_graphviz_yaml_file(
    name: String,
    description: Option<String>,
    yaml_content: String,
    yaml_schema: Option<String>,
    yaml_type: Option<String>,
    organization_id: Option<String>,
    tags: Option<Vec<String>>,
) -> SqlResult<GraphvizYamlFile> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let id = format!("yaml_{}", Uuid::new_v4().to_string().replace("-", ""));
    let now = get_timestamp();
    let now_clone = now.clone();

    let tags_json = tags.as_ref().map(|t| serde_json::to_string(t).unwrap_or_default());
    
    // searchableTextを自動生成（name + description + yamlContentの要約）
    let searchable_text = format!(
        "{} {} {}",
        name,
        description.as_ref().unwrap_or(&String::new()),
        yaml_content.chars().take(500).collect::<String>() // 最初の500文字
    );

    conn.execute(
        "INSERT INTO graphvizYamlFiles (
            id, name, description, yamlContent, yamlSchema, yamlType,
            organizationId, tags, version, searchableText,
            chromaSynced, createdAt, updatedAt
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            id.clone(),
            name.clone(),
            description.clone(),
            yaml_content.clone(),
            yaml_schema.clone(),
            yaml_type.clone(),
            organization_id.clone(),
            tags_json.clone(),
            1, // version
            searchable_text.clone(),
            0, // chromaSynced
            now,
            now_clone
        ],
    )?;

    Ok(GraphvizYamlFile {
        id,
        name,
        description,
        yaml_content,
        yaml_schema,
        yaml_type,
        organization_id,
        tags: tags_json,
        version: 1,
        parent_yaml_file_id: None,
        searchable_text: Some(searchable_text),
        semantic_category: None,
        keywords: None,
        content_summary: None,
        chroma_synced: 0,
        chroma_sync_error: None,
        last_chroma_sync_attempt: None,
        last_search_date: None,
        search_count: 0,
        created_at: now,
        updated_at: now_clone,
    })
}

/// YAMLファイルを更新
pub fn update_graphviz_yaml_file(
    id: &str,
    name: Option<String>,
    description: Option<String>,
    yaml_content: Option<String>,
    yaml_schema: Option<String>,
    yaml_type: Option<String>,
    tags: Option<Vec<String>>,
    semantic_category: Option<String>,
    keywords: Option<String>,
    content_summary: Option<String>,
) -> SqlResult<GraphvizYamlFile> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let now = get_timestamp();

    // 既存のデータを取得
    let existing: GraphvizYamlFile = get_graphviz_yaml_file_by_id(id)?;

    let name = name.unwrap_or(existing.name);
    let description = description.or(existing.description);
    let yaml_content = yaml_content.unwrap_or(existing.yaml_content);
    let yaml_schema = yaml_schema.or(existing.yaml_schema);
    let yaml_type = yaml_type.or(existing.yaml_type);
    let tags_json = tags.as_ref().map(|t| serde_json::to_string(t).unwrap_or_default()).or(existing.tags);

    // searchableTextを更新
    let searchable_text = format!(
        "{} {} {}",
        name,
        description.as_ref().unwrap_or(&String::new()),
        yaml_content.chars().take(500).collect::<String>()
    );

    // メタデータフィールドを更新（指定された場合のみ）
    let semantic_category = semantic_category.or(existing.semantic_category.clone());
    let keywords = keywords.or(existing.keywords.clone());
    let content_summary = content_summary.or(existing.content_summary.clone());

    conn.execute(
        "UPDATE graphvizYamlFiles SET
            name = ?1,
            description = ?2,
            yamlContent = ?3,
            yamlSchema = ?4,
            yamlType = ?5,
            tags = ?6,
            searchableText = ?7,
            semanticCategory = ?8,
            keywords = ?9,
            contentSummary = ?10,
            updatedAt = ?11
        WHERE id = ?12",
        params![
            name.clone(),
            description.clone(),
            yaml_content.clone(),
            yaml_schema.clone(),
            yaml_type.clone(),
            tags_json.clone(),
            searchable_text.clone(),
            semantic_category.clone(),
            keywords.clone(),
            content_summary.clone(),
            now,
            id
        ],
    )?;

    Ok(GraphvizYamlFile {
        id: id.to_string(),
        name,
        description,
        yaml_content,
        yaml_schema,
        yaml_type,
        organization_id: existing.organization_id,
        tags: tags_json,
        version: existing.version,
        parent_yaml_file_id: existing.parent_yaml_file_id,
        searchable_text: Some(searchable_text),
        semantic_category,
        keywords,
        content_summary,
        chroma_synced: existing.chroma_synced,
        chroma_sync_error: existing.chroma_sync_error,
        last_chroma_sync_attempt: existing.last_chroma_sync_attempt,
        last_search_date: existing.last_search_date,
        search_count: existing.search_count,
        created_at: existing.created_at,
        updated_at: now,
    })
}

/// IDでYAMLファイルを取得
pub fn get_graphviz_yaml_file_by_id(id: &str) -> SqlResult<GraphvizYamlFile> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, name, description, yamlContent, yamlSchema, yamlType,
                organizationId, tags, version, parentYamlFileId, searchableText,
                semanticCategory, keywords, contentSummary,
                chromaSynced, chromaSyncError, lastChromaSyncAttempt,
                lastSearchDate, searchCount, createdAt, updatedAt
         FROM graphvizYamlFiles WHERE id = ?1"
    )?;

    let yaml_file = stmt.query_row(params![id], |row| {
        Ok(GraphvizYamlFile {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            yaml_content: row.get(3)?,
            yaml_schema: row.get(4)?,
            yaml_type: row.get(5)?,
            organization_id: row.get(6)?,
            tags: row.get(7)?,
            version: row.get(8)?,
            parent_yaml_file_id: row.get(9)?,
            searchable_text: row.get(10)?,
            semantic_category: row.get(11)?,
            keywords: row.get(12)?,
            content_summary: row.get(13)?,
            chroma_synced: row.get(14)?,
            chroma_sync_error: row.get(15)?,
            last_chroma_sync_attempt: row.get(16)?,
            last_search_date: row.get(17)?,
            search_count: row.get(18)?,
            created_at: row.get(19)?,
            updated_at: row.get(20)?,
        })
    })?;

    Ok(yaml_file)
}

/// すべてのYAMLファイルを取得
pub fn get_all_graphviz_yaml_files(organization_id: Option<String>) -> SqlResult<Vec<GraphvizYamlFile>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let query = if organization_id.is_some() {
        "SELECT id, name, description, yamlContent, yamlSchema, yamlType,
                organizationId, tags, version, parentYamlFileId, searchableText,
                semanticCategory, keywords, contentSummary,
                chromaSynced, chromaSyncError, lastChromaSyncAttempt,
                lastSearchDate, searchCount, createdAt, updatedAt
         FROM graphvizYamlFiles WHERE organizationId = ?1 ORDER BY createdAt DESC"
    } else {
        "SELECT id, name, description, yamlContent, yamlSchema, yamlType,
                organizationId, tags, version, parentYamlFileId, searchableText,
                semanticCategory, keywords, contentSummary,
                chromaSynced, chromaSyncError, lastChromaSyncAttempt,
                lastSearchDate, searchCount, createdAt, updatedAt
         FROM graphvizYamlFiles ORDER BY createdAt DESC"
    };

    let mut stmt = conn.prepare(query)?;

    let yaml_files = if let Some(ref org_id) = organization_id {
        stmt.query_map(params![org_id], |row| {
            Ok(GraphvizYamlFile {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                yaml_content: row.get(3)?,
                yaml_schema: row.get(4)?,
                yaml_type: row.get(5)?,
                organization_id: row.get(6)?,
                tags: row.get(7)?,
                version: row.get(8)?,
                parent_yaml_file_id: row.get(9)?,
                searchable_text: row.get(10)?,
                semantic_category: row.get(11)?,
                keywords: row.get(12)?,
                content_summary: row.get(13)?,
                chroma_synced: row.get(14)?,
                chroma_sync_error: row.get(15)?,
                last_chroma_sync_attempt: row.get(16)?,
                last_search_date: row.get(17)?,
                search_count: row.get(18)?,
                created_at: row.get(19)?,
                updated_at: row.get(20)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?
    } else {
        stmt.query_map([], |row| {
            Ok(GraphvizYamlFile {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                yaml_content: row.get(3)?,
                yaml_schema: row.get(4)?,
                yaml_type: row.get(5)?,
                organization_id: row.get(6)?,
                tags: row.get(7)?,
                version: row.get(8)?,
                parent_yaml_file_id: row.get(9)?,
                searchable_text: row.get(10)?,
                semantic_category: row.get(11)?,
                keywords: row.get(12)?,
                content_summary: row.get(13)?,
                chroma_synced: row.get(14)?,
                chroma_sync_error: row.get(15)?,
                last_chroma_sync_attempt: row.get(16)?,
                last_search_date: row.get(17)?,
                search_count: row.get(18)?,
                created_at: row.get(19)?,
                updated_at: row.get(20)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?
    };

    Ok(yaml_files)
}

/// YAMLファイルを削除
pub fn delete_graphviz_yaml_file(id: &str) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    conn.execute("DELETE FROM graphvizYamlFiles WHERE id = ?1", params![id])?;

    Ok(())
}

/// DOTファイルを作成
pub fn create_graphviz_dot_file(
    yaml_file_id: String,
    name: String,
    description: Option<String>,
    dot_content: String,
    graph_type: String,
    view_type: Option<String>,
    node_count: Option<i32>,
    edge_count: Option<i32>,
    organization_id: Option<String>,
    tags: Option<Vec<String>>,
) -> SqlResult<GraphvizDotFile> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let id = format!("dot_{}", Uuid::new_v4().to_string().replace("-", ""));
    let now = get_timestamp();
    let now_clone = now.clone();

    let tags_json = tags.as_ref().map(|t| serde_json::to_string(t).unwrap_or_default());
    
    // searchableTextを自動生成
    let searchable_text = format!(
        "{} {} {}",
        name,
        description.as_ref().unwrap_or(&String::new()),
        dot_content.chars().take(500).collect::<String>()
    );

    conn.execute(
        "INSERT INTO graphvizDotFiles (
            id, yamlFileId, name, description, dotContent, graphType, viewType,
            nodeCount, edgeCount, organizationId, tags, version, searchableText,
            chromaSynced, createdAt, updatedAt
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        params![
            id.clone(),
            yaml_file_id.clone(),
            name.clone(),
            description.clone(),
            dot_content.clone(),
            graph_type.clone(),
            view_type.clone(),
            node_count,
            edge_count,
            organization_id.clone(),
            tags_json.clone(),
            1, // version
            searchable_text.clone(),
            0, // chromaSynced
            now,
            now_clone
        ],
    )?;

    Ok(GraphvizDotFile {
        id,
        yaml_file_id,
        name,
        description,
        dot_content,
        graph_type,
        view_type,
        node_count,
        edge_count,
        organization_id,
        tags: tags_json,
        version: 1,
        parent_dot_file_id: None,
        searchable_text: Some(searchable_text),
        chroma_synced: 0,
        chroma_sync_error: None,
        last_chroma_sync_attempt: None,
        last_search_date: None,
        search_count: 0,
        created_at: now,
        updated_at: now_clone,
    })
}

/// YAMLファイルIDでDOTファイルを取得
pub fn get_graphviz_dot_file_by_yaml_file_id(yaml_file_id: &str) -> SqlResult<Option<GraphvizDotFile>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, yamlFileId, name, description, dotContent, graphType, viewType,
                nodeCount, edgeCount, organizationId, tags, version, parentDotFileId,
                searchableText, chromaSynced, chromaSyncError, lastChromaSyncAttempt,
                lastSearchDate, searchCount, createdAt, updatedAt
         FROM graphvizDotFiles WHERE yamlFileId = ?1 ORDER BY createdAt DESC LIMIT 1"
    )?;

    match stmt.query_row(params![yaml_file_id], |row| {
        Ok(GraphvizDotFile {
            id: row.get(0)?,
            yaml_file_id: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            dot_content: row.get(4)?,
            graph_type: row.get(5)?,
            view_type: row.get(6)?,
            node_count: row.get(7)?,
            edge_count: row.get(8)?,
            organization_id: row.get(9)?,
            tags: row.get(10)?,
            version: row.get(11)?,
            parent_dot_file_id: row.get(12)?,
            searchable_text: row.get(13)?,
            chroma_synced: row.get(14)?,
            chroma_sync_error: row.get(15)?,
            last_chroma_sync_attempt: row.get(16)?,
            last_search_date: row.get(17)?,
            search_count: row.get(18)?,
            created_at: row.get(19)?,
            updated_at: row.get(20)?,
        })
    }) {
        Ok(dot_file) => Ok(Some(dot_file)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

