/**
 * タブ2: YAML→DOT変換のカスタムフック
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { convertYamlToDotAdvanced, parseYamlFile } from '../utils/yamlToDotAdvanced';
import { detectYamlType } from '../utils/yamlSchemas';
import type { ViewType } from '../utils/viewTypes';

export function useYamlConverter(initialYaml: string, initialView: ViewType) {
  const [yamlContent, setYamlContent] = useState<string>(initialYaml);
  const [dotCode, setDotCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [yamlType, setYamlType] = useState<string>('unknown');
  const [viewType, setViewType] = useState<ViewType>(initialView);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // YAML→DOT変換（debounce付き）
  const convertYaml = useCallback((yamlText: string, view: ViewType) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsConverting(true);
    setError(null);

    debounceTimerRef.current = setTimeout(() => {
      try {
        // YAMLをパース
        const parsed = parseYamlFile(yamlText);
        
        if (!parsed) {
          setError('YAMLの形式が正しくありません。');
          setDotCode('');
          setYamlType('unknown');
          setIsConverting(false);
          return;
        }

        setYamlType(parsed.type);

        // 変換ロジックを使用
        const result = convertYamlToDotAdvanced(parsed.data, view);
        
        if (result.error) {
          setError(result.error);
          setDotCode('');
        } else {
          setDotCode(result.dotCode);
          setError(null);
        }
      } catch (err: any) {
        setError(err.message || '変換に失敗しました。');
        setDotCode('');
        setYamlType('unknown');
      } finally {
        setIsConverting(false);
      }
    }, 500);
  }, []);

  // YAML変更時の変換（初期化時も含む）
  useEffect(() => {
    if (yamlContent && typeof yamlContent === 'string' && yamlContent.trim()) {
      convertYaml(yamlContent, viewType);
    } else {
      setDotCode('');
      setError(null);
      setYamlType('unknown');
    }
  }, [yamlContent, viewType, convertYaml]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // DOTコードを直接設定（保存されたDOTファイルを読み込む場合）
  const setDotCodeDirectly = useCallback((dot: string) => {
    setDotCode(dot);
    setError(null);
    setIsConverting(false);
  }, []);

  return {
    yamlContent,
    setYamlContent,
    dotCode,
    setDotCodeDirectly,
    error,
    isConverting,
    yamlType,
    viewType,
    setViewType,
  };
}

