/**
 * BM25アルゴリズムによるキーワード検索
 * 
 * BM25スコア計算式:
 * score(D, Q) = Σ IDF(qi) * f(qi, D) * (k1 + 1) / (f(qi, D) + k1 * (1 - b + b * |D| / avgdl))
 * 
 * パラメータ:
 * - k1: 1.2-2.0（デフォルト: 1.5）- 用語頻度の飽和パラメータ
 * - b: 0.0-1.0（デフォルト: 0.75）- 文書長正規化パラメータ
 */

export interface BM25Config {
  k1: number;  // 用語頻度の飽和パラメータ
  b: number;    // 文書長正規化パラメータ
}

export interface BM25SearchResult {
  id: string;
  score: number;
  matchedTerms: string[];
}

/**
 * ドキュメントコーパスからBM25インデックスを構築
 */
export class BM25Index {
  private documents: Map<string, string> = new Map();
  private termFreq: Map<string, Map<string, number>> = new Map();
  private docFreq: Map<string, number> = new Map();
  private docLengths: Map<string, number> = new Map();
  private avgDocLength: number = 0;
  private config: BM25Config;

  constructor(config: BM25Config = { k1: 1.5, b: 0.75 }) {
    this.config = config;
  }

  /**
   * ドキュメントを追加
   */
  addDocument(id: string, text: string): void {
    if (!text || text.trim().length === 0) {
      return;
    }

    this.documents.set(id, text);
    const terms = this.tokenize(text);
    const termCounts = new Map<string, number>();
    
    // 用語頻度を計算
    for (const term of terms) {
      termCounts.set(term, (termCounts.get(term) || 0) + 1);
    }
    
    this.termFreq.set(id, termCounts);
    this.docLengths.set(id, terms.length);
    
    // ドキュメント頻度を更新
    const uniqueTerms = new Set(terms);
    for (const term of uniqueTerms) {
      this.docFreq.set(term, (this.docFreq.get(term) || 0) + 1);
    }
    
    // 平均文書長を再計算
    this.updateAvgDocLength();
  }

  /**
   * 複数のドキュメントを一括追加
   */
  addDocuments(documents: Array<{ id: string; text: string }>): void {
    for (const doc of documents) {
      this.addDocument(doc.id, doc.text);
    }
  }

  /**
   * ドキュメントを削除
   */
  removeDocument(id: string): void {
    const termCounts = this.termFreq.get(id);
    if (termCounts) {
      // ドキュメント頻度を更新
      for (const term of termCounts.keys()) {
        const currentDf = this.docFreq.get(term) || 0;
        if (currentDf > 0) {
          this.docFreq.set(term, currentDf - 1);
        }
      }
    }

    this.documents.delete(id);
    this.termFreq.delete(id);
    this.docLengths.delete(id);
    this.updateAvgDocLength();
  }

  /**
   * クエリで検索
   */
  search(query: string, limit: number = 10): BM25SearchResult[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const queryTerms = this.tokenize(query);
    if (queryTerms.length === 0) {
      return [];
    }

    const scores = new Map<string, number>();
    const matchedTermsMap = new Map<string, Set<string>>();

    // 各ドキュメントのスコアを計算
    for (const docId of this.documents.keys()) {
      let score = 0;
      const matchedTerms = new Set<string>();
      const docLength = this.docLengths.get(docId) || 1;
      const termCounts = this.termFreq.get(docId) || new Map();
      
      for (const term of queryTerms) {
        const tf = termCounts.get(term) || 0;
        if (tf > 0) {
          matchedTerms.add(term);
          const idf = this.calculateIDF(term);
          
          // BM25スコア計算
          const numerator = (this.config.k1 + 1) * tf;
          const denominator = tf + this.config.k1 * (1 - this.config.b + this.config.b * docLength / this.avgDocLength);
          const normalizedTf = numerator / denominator;
          
          score += idf * normalizedTf;
        }
      }
      
      if (score > 0) {
        scores.set(docId, score);
        matchedTermsMap.set(docId, matchedTerms);
      }
    }

    // スコアでソート
    const results: BM25SearchResult[] = Array.from(scores.entries())
      .map(([id, score]) => ({
        id,
        score,
        matchedTerms: Array.from(matchedTermsMap.get(id) || [])
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  /**
   * テキストをトークン化（日本語対応、改善版）
   */
  private tokenize(text: string): string[] {
    if (!text) {
      return [];
    }

    const normalized = text.toLowerCase().trim();
    const tokens: string[] = [];
    let currentToken = '';
    let currentJapanesePhrase = ''; // 日本語の連続文字列を保持
    
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];
      
      // 日本語文字（ひらがな、カタカナ、漢字）
      if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(char)) {
        // 既存の英数字トークンがあれば保存
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
        
        // 日本語の連続文字列を構築
        currentJapanesePhrase += char;
        
        // 2文字以上の日本語フレーズをトークンとして追加（部分マッチングを改善）
        if (currentJapanesePhrase.length >= 2) {
          // 2文字以上のフレーズを追加
          tokens.push(currentJapanesePhrase);
          // 最後の1文字も個別に追加（1文字マッチングも可能にする）
          if (currentJapanesePhrase.length > 2) {
            tokens.push(currentJapanesePhrase.slice(-1));
          }
        } else {
          // 1文字の場合はそのまま追加
          tokens.push(char);
        }
      } 
      // 英数字
      else if (/[a-zA-Z0-9]/.test(char)) {
        // 日本語フレーズがあれば保存
        if (currentJapanesePhrase) {
          currentJapanesePhrase = '';
        }
        currentToken += char;
      } 
      // 区切り文字
      else {
        // 日本語フレーズがあれば保存
        if (currentJapanesePhrase) {
          currentJapanesePhrase = '';
        }
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
      }
    }
    
    // 残りのトークンを追加
    if (currentToken) {
      tokens.push(currentToken);
    }
    if (currentJapanesePhrase) {
      tokens.push(currentJapanesePhrase);
    }
    
    // 空のトークンと短すぎるトークン（1文字の英数字）を除外
    return tokens.filter(t => t.length > 0 && !(t.length === 1 && /[a-z0-9]/.test(t)));
  }

  /**
   * IDF（逆文書頻度）を計算
   */
  private calculateIDF(term: string): number {
    const df = this.docFreq.get(term) || 0;
    const N = this.documents.size;
    
    if (df === 0 || N === 0) {
      return 0;
    }
    
    // 標準的なIDF計算式: log((N - df + 0.5) / (df + 0.5))
    return Math.log((N - df + 0.5) / (df + 0.5));
  }

  /**
   * 平均文書長を更新
   */
  private updateAvgDocLength(): void {
    if (this.documents.size === 0) {
      this.avgDocLength = 0;
      return;
    }
    
    let totalLength = 0;
    for (const length of this.docLengths.values()) {
      totalLength += length;
    }
    
    this.avgDocLength = totalLength / this.documents.size;
  }

  /**
   * インデックスの統計情報を取得
   */
  getStats(): {
    documentCount: number;
    termCount: number;
    avgDocLength: number;
  } {
    return {
      documentCount: this.documents.size,
      termCount: this.docFreq.size,
      avgDocLength: this.avgDocLength,
    };
  }

  /**
   * インデックスをクリア
   */
  clear(): void {
    this.documents.clear();
    this.termFreq.clear();
    this.docFreq.clear();
    this.docLengths.clear();
    this.avgDocLength = 0;
  }
}

