/**
 * Supabaseクライアント実装（Rust側）
 * HTTPリクエスト経由でSupabase REST APIにアクセス
 */

use reqwest::Client;
use reqwest::header::{HeaderMap, HeaderValue, HeaderName};
use serde_json::{Value, json};
use std::collections::HashMap;
use anyhow::{Result, Context};

pub struct SupabaseClient {
    client: Client,
    base_url: String,
    api_key: String,
}

impl SupabaseClient {
    pub fn new(base_url: String, api_key: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
            api_key,
        }
    }

    fn get_headers(&self) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(
            HeaderName::from_static("apikey"),
            HeaderValue::from_str(&self.api_key).unwrap(),
        );
        headers.insert(
            HeaderName::from_static("authorization"),
            HeaderValue::from_str(&format!("Bearer {}", self.api_key)).unwrap(),
        );
        headers.insert(
            HeaderName::from_static("content-type"),
            HeaderValue::from_static("application/json"),
        );
        headers.insert(
            HeaderName::from_static("prefer"),
            HeaderValue::from_static("return=representation"),
        );
        headers
    }

    pub async fn get_doc(&self, table: &str, id: &str) -> Result<Option<HashMap<String, Value>>> {
        let url = format!("{}/rest/v1/{}?id=eq.{}", self.base_url, table, id);
        
        let response = self.client
            .get(&url)
            .headers(self.get_headers())
            .send()
            .await
            .context("Supabase GETリクエスト失敗")?;

        if response.status() == 404 {
            return Ok(None);
        }

        let data: Vec<Value> = response
            .json()
            .await
            .context("Supabaseレスポンスのパース失敗")?;

        if data.is_empty() {
            return Ok(None);
        }

        // ValueをHashMapに変換
        let first = &data[0];
        if let Value::Object(map) = first {
            let mut result = HashMap::new();
            for (k, v) in map {
                result.insert(k.clone(), v.clone());
            }
            Ok(Some(result))
        } else {
            Ok(None)
        }
    }

    pub async fn set_doc(&self, table: &str, id: &str, data: HashMap<String, Value>) -> Result<()> {
        // 既存レコードをチェック
        let existing = self.get_doc(table, id).await?;

        let mut record = data.clone();
        record.insert("id".to_string(), json!(id));
        
        // タイムスタンプを設定
        let now = chrono::Utc::now().to_rfc3339();
        record.insert("updatedAt".to_string(), json!(now));
        if existing.is_none() {
            record.insert("createdAt".to_string(), json!(now));
        }

        if existing.is_some() {
            // 更新
            let url = format!("{}/rest/v1/{}?id=eq.{}", self.base_url, table, id);
            
            let response = self.client
                .patch(&url)
                .headers(self.get_headers())
                .json(&record)
                .send()
                .await
                .context("Supabase PATCHリクエスト失敗")?;

            if !response.status().is_success() {
                let error_text = response.text().await.unwrap_or_default();
                return Err(anyhow::anyhow!("Supabase更新エラー: {}", error_text));
            }
        } else {
            // 挿入
            let url = format!("{}/rest/v1/{}", self.base_url, table);
            
            let response = self.client
                .post(&url)
                .headers(self.get_headers())
                .json(&record)
                .send()
                .await
                .context("Supabase POSTリクエスト失敗")?;

            if !response.status().is_success() {
                let error_text = response.text().await.unwrap_or_default();
                return Err(anyhow::anyhow!("Supabase挿入エラー: {}", error_text));
            }
        }

        Ok(())
    }

    pub async fn update_doc(&self, table: &str, id: &str, data: HashMap<String, Value>) -> Result<()> {
        let mut record = data.clone();
        let now = chrono::Utc::now().to_rfc3339();
        record.insert("updatedAt".to_string(), json!(now));

        let url = format!("{}/rest/v1/{}?id=eq.{}", self.base_url, table, id);
        
        let response = self.client
            .patch(&url)
            .headers(self.get_headers())
            .json(&record)
            .send()
            .await
            .context("Supabase PATCHリクエスト失敗")?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("Supabase更新エラー: {}", error_text));
        }

        Ok(())
    }

    pub async fn delete_doc(&self, table: &str, id: &str) -> Result<()> {
        let url = format!("{}/rest/v1/{}?id=eq.{}", self.base_url, table, id);
        
        let response = self.client
            .delete(&url)
            .headers(self.get_headers())
            .send()
            .await
            .context("Supabase DELETEリクエスト失敗")?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("Supabase削除エラー: {}", error_text));
        }

        Ok(())
    }

    pub async fn get_collection(&self, table: &str, conditions: Option<HashMap<String, Value>>) -> Result<Vec<HashMap<String, Value>>> {
        let mut url = format!("{}/rest/v1/{}", self.base_url, table);
        
        // 条件をクエリパラメータに追加
        if let Some(conds) = conditions {
            // WHERE条件
            if let Some(field) = conds.get("field").and_then(|v| v.as_str()) {
                if let Some(operator) = conds.get("operator").and_then(|v| v.as_str()) {
                    if let Some(value) = conds.get("value") {
                        let op = match operator {
                            "==" => "eq",
                            "!=" => "neq",
                            "<" => "lt",
                            "<=" => "lte",
                            ">" => "gt",
                            ">=" => "gte",
                            _ => "eq",
                        };
                        url.push_str(&format!("?{}={}.{}", field, op, value));
                    }
                }
            }
        }

        let response = self.client
            .get(&url)
            .headers(self.get_headers())
            .send()
            .await
            .context("Supabase GETリクエスト失敗")?;

        let data: Vec<Value> = response
            .json()
            .await
            .context("Supabaseレスポンスのパース失敗")?;

        let mut results = Vec::new();
        for item in data {
            if let Value::Object(map) = item {
                let mut result = HashMap::new();
                for (k, v) in map {
                    result.insert(k.clone(), v.clone());
                }
                results.push(result);
            }
        }

        Ok(results)
    }
}

