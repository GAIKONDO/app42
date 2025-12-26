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
    console.log('🔄 [Tab3 useYamlConverter] convertYaml呼び出し', { yamlTextLength: yamlText?.length, view });
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsConverting(true);
    setError(null);

    debounceTimerRef.current = setTimeout(() => {
      try {
        console.log('🔄 [Tab3 useYamlConverter] YAMLパース開始', { 
          yamlTextLength: yamlText.length,
          yamlTextFull: yamlText // 全体を表示
        });
        // YAMLをパース
        const parsed = parseYamlFile(yamlText);
        
        if (!parsed) {
          console.error('❌ [Tab3 useYamlConverter] YAMLパース失敗');
          setError('YAMLの形式が正しくありません。');
          setDotCode('');
          setYamlType('unknown');
          setIsConverting(false);
          return;
        }

        console.log('✅ [Tab3 useYamlConverter] YAMLパース成功', { 
          type: parsed.type,
          dataKeys: Object.keys(parsed.data || {}),
          hasRackServers: !!(parsed.data as any)?.rackServers,
          rackServersData: (parsed.data as any)?.rackServers ? {
            rackId: (parsed.data as any).rackServers.rackId,
            serversCount: (parsed.data as any).rackServers.servers?.length || 0,
            servers: (parsed.data as any).rackServers.servers
          } : null
        });
        setYamlType(parsed.type);

        // 変換ロジックを使用
        console.log('🔄 [Tab3 useYamlConverter] DOT変換開始', { view, data: parsed.data });
        const result = convertYamlToDotAdvanced(parsed.data, view);
        
        if (result.error) {
          console.error('❌ [Tab3 useYamlConverter] DOT変換エラー', result.error);
          setError(result.error);
          setDotCode('');
        } else {
          console.log('✅ [Tab3 useYamlConverter] DOT変換成功', { 
            dotCodeLength: result.dotCode?.length,
            dotCodePreview: result.dotCode?.substring(0, 200) // 最初の200文字を表示
          });
          console.log('📄 [Tab3 useYamlConverter] 生成されたDOTコード全体:', result.dotCode);
          setDotCode(result.dotCode);
          setError(null);
        }
      } catch (err: any) {
        console.error('❌ [Tab3 useYamlConverter] 変換例外', err);
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
    console.log('🔄 [Tab3 useYamlConverter] useEffect実行', { 
      yamlContentLength: yamlContent?.length, 
      hasYamlContent: !!yamlContent,
      viewType 
    });
    
    if (yamlContent && typeof yamlContent === 'string' && yamlContent.trim()) {
      console.log('✅ [Tab3 useYamlConverter] YAMLコンテンツあり、変換を開始');
      convertYaml(yamlContent, viewType);
    } else {
      console.log('⚠️ [Tab3 useYamlConverter] YAMLコンテンツなし、クリア');
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

