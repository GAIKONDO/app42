/**
 * 階層ビューアコンポーネント
 * Graphvizビューアとクリックイベント処理を統合
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GraphvizViewerWithZoom } from '../GraphvizViewerWithZoom';
import { 
  generateSitesDot, 
  generateSiteEquipmentDot,
  generateRackServersDot,
  type NodeIdMapping 
} from './generateHierarchicalDot';
import type { 
  SiteTopology,
  SiteEquipment,
  RackServers,
  ServerDetails,
} from '@/lib/graphvizHierarchyApi';
import type { HierarchyState } from './useHierarchyState';
import { convertYamlToDotAdvanced, parseYamlFile } from '../utils/yamlToDotAdvanced';
import { getGraphvizYamlFile, getAllGraphvizYamlFiles } from '@/lib/graphvizApi';
import * as yaml from 'js-yaml';

interface HierarchyViewerProps {
  hierarchyState: HierarchyState;
  sites: SiteTopology[];
  siteEquipment?: SiteEquipment | null;
  rackServers?: RackServers | null;
  rackServersMap?: Map<string, RackServers>;
  serverDetails?: ServerDetails | null;
  organizationId?: string;
  initialRackId?: string | null;  // 特定のラックのみを表示する場合のラックID
  initialFileId?: string | null;  // 現在のカードのファイルID
  onSiteClick: (siteId: string, siteLabel: string) => void;
  onRackClick: (rackId: string, rackLabel: string) => void;
  onEquipmentClick: (equipmentId: string, equipmentType: string, equipmentLabel: string) => void;
}

export function HierarchyViewer({
  hierarchyState,
  sites,
  siteEquipment,
  rackServers,
  rackServersMap,
  serverDetails,
  organizationId,
  initialRackId,
  initialFileId,
  onSiteClick,
  onRackClick,
  onEquipmentClick,
}: HierarchyViewerProps) {
  const [dotCode, setDotCode] = useState<string>('');
  const [nodeIdMap, setNodeIdMap] = useState<Map<string, NodeIdMapping>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  
  // DOT生成（階層状態に応じて）
  useEffect(() => {
    const generateDot = async () => {
      console.log('🔄 [HierarchyViewer] DOT生成開始', {
        currentLevel: hierarchyState.currentLevel,
        sitesCount: sites.length,
        hasSiteEquipment: !!siteEquipment,
        hasRackServers: !!rackServers,
        hasServerDetails: !!serverDetails,
        initialRackId: initialRackId,
      });
      
      let generatedDot = '';
      let generatedMap = new Map<string, NodeIdMapping>();
      
      if (hierarchyState.currentLevel === 'all') {
        // 全体表示：棟レベル
        if (sites.length > 0) {
          console.log('✅ [HierarchyViewer] 全体表示: 棟レベル', { sitesCount: sites.length });
          const result = generateSitesDot(sites);
          generatedDot = result.dotCode;
          generatedMap = result.nodeIdMap;
          console.log('✅ [HierarchyViewer] 棟DOT生成完了', { dotCodeLength: generatedDot.length, nodeMapSize: generatedMap.size });
        } else {
          console.warn('⚠️ [HierarchyViewer] 棟データがありません');
        }
      } else if (hierarchyState.currentLevel === 'sites' && siteEquipment) {
        // 棟内機器構成
        // initialRackIdが指定されている場合、そのラックのみを表示
        // ただし、rack-serversカードから来た場合は、racksレベルで表示する
        if (initialRackId && rackServers) {
          // rack-serversカードから来た場合、ラック内サーバーを表示
          const result = generateRackServersDot(rackServers);
          generatedDot = result.dotCode;
          generatedMap = result.nodeIdMap;
        } else {
          const result = generateSiteEquipmentDot(siteEquipment, rackServersMap, initialRackId || undefined);
          generatedDot = result.dotCode;
          generatedMap = result.nodeIdMap;
        }
      } else if (hierarchyState.currentLevel === 'racks' && rackServers) {
        // ラック内サーバー
        // Tab3と同じように、YAMLファイルを直接読み込んでDOTコードを生成
        console.log('✅ [HierarchyViewer] ラック内サーバー表示', { 
          rackId: rackServers.rackId,
          serversCount: rackServers.servers?.length || 0,
          initialFileId: initialFileId
        });
        
        // initialFileIdがある場合は、YAMLファイルを直接読み込む
        if (initialFileId) {
          try {
            console.log('🔄 [HierarchyViewer] YAMLファイルを直接読み込み中...', initialFileId);
            const file = await getGraphvizYamlFile(initialFileId);
            if (file.yamlContent) {
              console.log('✅ [HierarchyViewer] YAMLファイルを取得しました', { 
                yamlContentLength: file.yamlContent.length,
                yamlType: file.yamlType 
              });
              
              // YAMLをパースしてDOTコードに変換
              const parsed = parseYamlFile(file.yamlContent);
              if (parsed && parsed.type === 'rack-servers') {
                console.log('✅ [HierarchyViewer] YAMLパース成功', { 
                  type: parsed.type,
                  hasRackServers: !!parsed.data.rackServers,
                  serversCount: parsed.data.rackServers?.servers?.length || 0
                });
                
                // サーバー情報が空の場合、Tab2から取得して反映
                if (parsed.data.rackServers && (!parsed.data.rackServers.servers || parsed.data.rackServers.servers.length === 0)) {
                  const rackId = parsed.data.rackServers.rackId;
                  if (rackId && organizationId) {
                    console.log('🔄 [HierarchyViewer] サーバー情報が空のため、Tab2から取得します', { rackId });
                    try {
                      const allFiles = await getAllGraphvizYamlFiles(organizationId);
                      
                      // site-equipmentファイルを検索
                      for (const siteFile of allFiles) {
                        if (siteFile.yamlType !== 'site-equipment' || !siteFile.yamlContent) continue;
                        
                        try {
                          const siteParsed = yaml.load(siteFile.yamlContent) as any;
                          if (siteParsed?.racks && Array.isArray(siteParsed.racks)) {
                            const rack = siteParsed.racks.find((r: any) => r.id === rackId);
                            if (rack && rack.equipment && Array.isArray(rack.equipment)) {
                              const servers = rack.equipment
                                .filter((eq: any) => eq.type === 'server')
                                .map((eq: any) => ({
                                  id: eq.id,
                                  label: eq.label || eq.id,
                                  model: eq.model || '',
                                  position: eq.position || {},
                                  ports: eq.ports || [],
                                  connections: eq.connections || [],
                                }));
                              
                              if (servers.length > 0) {
                                console.log('✅ [HierarchyViewer] Tab2からサーバー情報を取得しました', { serversCount: servers.length });
                                // parsed.data.rackServers.serversに設定
                                parsed.data.rackServers.servers = servers;
                              }
                              break;
                            }
                          }
                        } catch (e) {
                          console.warn('⚠️ [HierarchyViewer] site-equipment YAMLパースエラー:', e);
                          continue;
                        }
                      }
                    } catch (error) {
                      console.error('❌ [HierarchyViewer] Tab2からのサーバー情報取得に失敗:', error);
                    }
                  }
                }
                
                const dotResult = convertYamlToDotAdvanced(parsed.data, 'full');
                if (dotResult.error) {
                  console.error('❌ [HierarchyViewer] DOT変換エラー:', dotResult.error);
                  // フォールバック: 既存の方法を使用
                  const result = generateRackServersDot(rackServers);
                  generatedDot = result.dotCode;
                  generatedMap = result.nodeIdMap;
                } else {
                  generatedDot = dotResult.dotCode;
                  // クリック可能なノードのマッピングを生成
                  // generateRackServersViewは escapeNodeId(server.id) を使用しているので、
                  // ノードIDマッピングも server.id をそのまま使用する
                  if (parsed.data.rackServers?.servers && Array.isArray(parsed.data.rackServers.servers)) {
                    for (const server of parsed.data.rackServers.servers) {
                      // generateRackServersViewが生成するノードIDは server.id をそのままエスケープしたもの
                      // マッピングのキーは引用符なしの server.id を使用
                      const rawNodeId = server.id;
                      // nodeIdはエスケープされた形式（Graphvizの<title>要素に含まれる形式）
                      // ただし、マッピングのキーは引用符なしのIDを使用
                      generatedMap.set(rawNodeId, {
                        nodeId: rawNodeId, // Graphvizの<title>要素には引用符なしのIDが含まれる
                        type: 'server',
                        dataId: server.id,
                        label: server.label || server.id,
                      });
                    }
                  }
                  console.log('✅ [HierarchyViewer] YAMLからDOTコード生成完了', { 
                    dotCodeLength: generatedDot.length, 
                    nodeMapSize: generatedMap.size,
                    nodeMapKeys: Array.from(generatedMap.keys())
                  });
                }
              } else {
                console.warn('⚠️ [HierarchyViewer] YAMLタイプがrack-serversではありません。既存の方法を使用します。');
                const result = generateRackServersDot(rackServers);
                generatedDot = result.dotCode;
                generatedMap = result.nodeIdMap;
              }
            } else {
              console.warn('⚠️ [HierarchyViewer] YAMLコンテンツがありません。既存の方法を使用します。');
              const result = generateRackServersDot(rackServers);
              generatedDot = result.dotCode;
              generatedMap = result.nodeIdMap;
            }
          } catch (error) {
            console.error('❌ [HierarchyViewer] YAMLファイル読み込みエラー:', error);
            // フォールバック: 既存の方法を使用
            const result = generateRackServersDot(rackServers);
            generatedDot = result.dotCode;
            generatedMap = result.nodeIdMap;
          }
        } else {
          // initialFileIdがない場合は、既存の方法を使用
          console.log('ℹ️ [HierarchyViewer] initialFileIdがないため、既存の方法を使用します');
          const result = generateRackServersDot(rackServers);
          generatedDot = result.dotCode;
          generatedMap = result.nodeIdMap;
        }
        
        console.log('✅ [HierarchyViewer] ラック内サーバーDOT生成完了', { 
          dotCodeLength: generatedDot.length, 
          nodeMapSize: generatedMap.size,
          serversCount: rackServers.servers?.length || 0
        });
      } else if (hierarchyState.currentLevel === 'server-details' && serverDetails) {
        // 機器詳細（4層目：全体 > 棟 > ラック > 機器）
        try {
          // yamlToDotAdvancedを使用してDOTコードを生成
          // serverDetailsをYamlData形式に変換
          const yamlData = {
            serverDetails: serverDetails,
          };
          const dotResult = convertYamlToDotAdvanced(yamlData, 'server-details');
          if (dotResult.error) {
            console.error('❌ [HierarchyViewer] server-details DOT生成エラー:', dotResult.error);
            generatedDot = 'digraph G {\n  node [shape=box];\n  error [label="機器詳細の表示に失敗しました"];\n}';
          } else {
            generatedDot = dotResult.dotCode;
          }
          // server-detailsの場合は、クリック可能なノードは少ないので、空のマップを使用
          generatedMap = new Map();
        } catch (error) {
          console.error('❌ [HierarchyViewer] server-details DOT生成エラー:', error);
          generatedDot = 'digraph G {\n  node [shape=box];\n  error [label="機器詳細の表示に失敗しました"];\n}';
          generatedMap = new Map();
        }
      }
      
      console.log('🔄 [HierarchyViewer] DOT生成完了', {
        dotCodeLength: generatedDot.length,
        nodeMapSize: generatedMap.size,
        hasDotCode: !!generatedDot,
      });
      
      console.log('🔄 [HierarchyViewer] 状態を更新します', {
        generatedDotLength: generatedDot.length,
        generatedMapSize: generatedMap.size,
      });
      
      setDotCode(generatedDot);
      setNodeIdMap(generatedMap);
      
      console.log('✅ [HierarchyViewer] 状態更新完了');
    };
    
    generateDot();
  }, [hierarchyState.currentLevel, sites, siteEquipment, rackServers, rackServersMap, serverDetails, initialRackId, initialFileId]);
  
  // クリックイベントの設定
  useEffect(() => {
    // nodeIdMapが空でも、DOTコードがあればGraphvizは表示できる
    // クリックイベントは、nodeIdMapがある場合のみ設定する
    if (!dotCode) {
      console.log('⚠️ [HierarchyViewer] DOTコードがありません', { dotCode: !!dotCode });
      return;
    }
    
    if (nodeIdMap.size === 0) {
      console.log('⚠️ [HierarchyViewer] ノードIDマッピングがありません（クリックイベントは設定しません）', { nodeIdMapSize: nodeIdMap.size });
      // nodeIdMapが空でも、Graphvizは表示できるので、ここでreturnしない
    }
    
    console.log('🔄 [HierarchyViewer] クリックイベント設定開始', { dotCodeLength: dotCode.length, nodeIdMapSize: nodeIdMap.size });
    
    // クリーンアップ用の変数
    let timeoutId: NodeJS.Timeout | null = null;
    let retryInterval: NodeJS.Timeout | null = null;
    let observer: MutationObserver | null = null;
    let currentSvgElement: SVGElement | null = null;
    
    // すべてのノード要素にイベントリスナーを追加
    const attachClickHandlers = (svgElement: SVGElement) => {
      // 既存のイベントリスナーをクリーンアップ（再レンダリング時のため）
      if (currentSvgElement && currentSvgElement !== svgElement) {
        const oldNodeElements = currentSvgElement.querySelectorAll('g.node');
        oldNodeElements.forEach((nodeElement) => {
          if ((nodeElement as any).__clickHandler) {
            nodeElement.removeEventListener('click', (nodeElement as any).__clickHandler, true);
            nodeElement.removeEventListener('mouseenter', (nodeElement as any).__mouseEnterHandler);
            nodeElement.removeEventListener('mouseleave', (nodeElement as any).__mouseLeaveHandler);
            if ((nodeElement as any).__mouseDownHandler) {
              nodeElement.removeEventListener('mousedown', (nodeElement as any).__mouseDownHandler);
            }
            // フラグをクリア
            delete (nodeElement as any).__clickHandlerAttached;
            delete (nodeElement as any).__clickHandler;
            delete (nodeElement as any).__mouseEnterHandler;
            delete (nodeElement as any).__mouseLeaveHandler;
            delete (nodeElement as any).__mouseDownHandler;
          }
        });
      }
      
      currentSvgElement = svgElement;
      const nodeElements = svgElement.querySelectorAll('g.node');
      
      console.log('🔄 [HierarchyViewer] ノード要素数:', nodeElements.length);
      console.log('🔄 [HierarchyViewer] ノードIDマッピング:', Array.from(nodeIdMap.keys()));
      
      // 新しいSVG要素の場合は、すべてのフラグをクリア
      nodeElements.forEach((nodeElement) => {
        // 既存のフラグをクリア（再レンダリング時のため）
        if ((nodeElement as any).__clickHandlerAttached) {
          // 既存のイベントリスナーを削除
          if ((nodeElement as any).__clickHandler) {
            nodeElement.removeEventListener('click', (nodeElement as any).__clickHandler, true);
            nodeElement.removeEventListener('mouseenter', (nodeElement as any).__mouseEnterHandler);
            nodeElement.removeEventListener('mouseleave', (nodeElement as any).__mouseLeaveHandler);
            if ((nodeElement as any).__mouseDownHandler) {
              nodeElement.removeEventListener('mousedown', (nodeElement as any).__mouseDownHandler);
            }
          }
          // フラグをクリア
          delete (nodeElement as any).__clickHandlerAttached;
          delete (nodeElement as any).__clickHandler;
          delete (nodeElement as any).__mouseEnterHandler;
          delete (nodeElement as any).__mouseLeaveHandler;
          delete (nodeElement as any).__mouseDownHandler;
        }
        
        // Graphvizは各ノードに<title>要素を追加する（ノードIDが含まれる）
        const titleElement = nodeElement.querySelector('title');
        const nodeId = titleElement?.textContent;
        
        if (!nodeId) {
          return; // ノードIDがない場合はスキップ
        }
        
        // ノードIDを正規化（前後の空白を除去）
        const normalizedNodeId = nodeId.trim();
        
        // マッピングのキー一覧を取得（デバッグ用）
        const mapKeys = Array.from(nodeIdMap.keys());
        
        console.log('🔄 [HierarchyViewer] ノードID検出:', {
          rawNodeId: nodeId,
          normalizedNodeId: normalizedNodeId,
          mapKeys: mapKeys,
          hasDirectMatch: nodeIdMap.has(normalizedNodeId),
        });
        
        // 直接マッチを試す
        let actualNodeId = normalizedNodeId;
        if (!nodeIdMap.has(actualNodeId)) {
          // 引用符を除去して試す
          const unquotedId = normalizedNodeId.replace(/^["']|["']$/g, '');
          console.log('🔄 [HierarchyViewer] 引用符除去後のID:', unquotedId, 'マッピングに存在:', nodeIdMap.has(unquotedId));
          if (nodeIdMap.has(unquotedId)) {
            actualNodeId = unquotedId;
            console.log('✅ [HierarchyViewer] 引用符を除去してマッチ:', unquotedId);
          } else {
            // マッピングのキーと部分一致を試す（サーバーIDが含まれているか）
            for (const key of mapKeys) {
              if (normalizedNodeId.includes(key) || key.includes(normalizedNodeId)) {
                actualNodeId = key;
                console.log('✅ [HierarchyViewer] 部分一致でマッチ:', key);
                break;
              }
            }
          }
        }
        
        console.log('🔄 [HierarchyViewer] 最終ノードID:', actualNodeId, 'マッピングに存在:', actualNodeId ? nodeIdMap.has(actualNodeId) : false);
        
        if (actualNodeId && nodeIdMap.has(actualNodeId)) {
          console.log('✅ [HierarchyViewer] 条件を満たしました。イベントリスナーを設定します...');
          const nodeInfo = nodeIdMap.get(actualNodeId)!;
          
          console.log('✅ [HierarchyViewer] ノード情報取得:', nodeInfo);
          console.log('✅ [HierarchyViewer] ノード要素:', nodeElement);
          
          // クリック可能であることを視覚的に示す
          (nodeElement as HTMLElement).style.cursor = 'pointer';
          (nodeElement as HTMLElement).style.pointerEvents = 'auto';
          
          // クリックイベント（ノードタイプに応じて処理を分岐）
          const clickHandler = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('✅ [HierarchyViewer] ノードクリック:', nodeInfo, e);
            
            if (nodeInfo.type === 'site') {
              console.log('✅ [HierarchyViewer] 棟クリック処理を実行:', nodeInfo.dataId, nodeInfo.label);
              onSiteClick(nodeInfo.dataId, nodeInfo.label);
            } else if (nodeInfo.type === 'rack') {
              onRackClick(nodeInfo.dataId, nodeInfo.label);
            } else if (nodeInfo.type === 'equipment') {
              // 機器タイプを取得（siteEquipmentから）
              const equipmentType = siteEquipment?.racks
                ?.flatMap(r => r.equipment || [])
                .find(eq => eq.id === nodeInfo.dataId)?.type || 'unknown';
              onEquipmentClick(nodeInfo.dataId, equipmentType, nodeInfo.label);
            } else if (nodeInfo.type === 'server') {
              // サーバーも機器として扱う
              onEquipmentClick(nodeInfo.dataId, 'server', nodeInfo.label);
            }
          };
          
          // イベントリスナーを追加
          nodeElement.addEventListener('click', clickHandler, true); // capture phaseで追加
          console.log('✅ [HierarchyViewer] イベントリスナーを追加:', actualNodeId, nodeInfo.type);
          
          // ホバー効果（ノードタイプに応じて調整）
          // ラックとサーバーは控えめに、その他は通常
          const isRackOrServer = nodeInfo.type === 'rack' || nodeInfo.type === 'server';
          const hoverOpacity = isRackOrServer ? '0.95' : '0.85';  // ラック/サーバーは5%透明化、その他は15%
          const hoverScale = isRackOrServer ? '1.01' : '1.02';    // ラック/サーバーは1%拡大、その他は2%
          
          const mouseEnterHandler = () => {
            (nodeElement as HTMLElement).style.opacity = hoverOpacity;
            (nodeElement as HTMLElement).style.transform = `scale(${hoverScale})`;
            (nodeElement as HTMLElement).style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            console.log('🔄 [HierarchyViewer] マウスホバー:', actualNodeId);
          };
          const mouseLeaveHandler = () => {
            (nodeElement as HTMLElement).style.opacity = '1';
            (nodeElement as HTMLElement).style.transform = 'scale(1)';
            (nodeElement as HTMLElement).style.transition = 'opacity 0.2s ease, transform 0.2s ease';
          };
          
          nodeElement.addEventListener('mouseenter', mouseEnterHandler);
          nodeElement.addEventListener('mouseleave', mouseLeaveHandler);
          
          // テスト用：mousedownイベントも追加
          const mouseDownHandler = (e: MouseEvent) => {
            console.log('🔄 [HierarchyViewer] マウスダウン:', actualNodeId, e);
          };
          nodeElement.addEventListener('mousedown', mouseDownHandler);
          
          // フラグを設定（重複追加を防ぐ）
          (nodeElement as any).__clickHandlerAttached = true;
          (nodeElement as any).__clickHandler = clickHandler;
          (nodeElement as any).__mouseEnterHandler = mouseEnterHandler;
          (nodeElement as any).__mouseLeaveHandler = mouseLeaveHandler;
          (nodeElement as any).__mouseDownHandler = mouseDownHandler;
          
          console.log('✅ [HierarchyViewer] イベントリスナー設定完了:', actualNodeId, nodeInfo.type);
        } else {
          console.warn('⚠️ [HierarchyViewer] ノードIDがマッピングに存在しません:', actualNodeId, 'マッピングキー:', Array.from(nodeIdMap.keys()));
        }
      });
      
      console.log('✅ [HierarchyViewer] すべてのノード要素の処理が完了しました');
    };
    
    // SVG要素の検出を試みる（GraphvizViewerWithZoomがレンダリングするまで待つ）
    const findAndAttachHandlers = () => {
      const svgElement = containerRef.current?.querySelector('svg');
      
      if (!svgElement) {
        console.log('⚠️ [HierarchyViewer] SVG要素が見つかりません。再試行します...');
        // 500ms後に再試行（最大10回）
        let retryCount = 0;
        const maxRetries = 10;
        retryInterval = setInterval(() => {
          retryCount++;
          const retrySvgElement = containerRef.current?.querySelector('svg');
          if (retrySvgElement) {
            if (retryInterval) {
              clearInterval(retryInterval);
              retryInterval = null;
            }
            attachClickHandlers(retrySvgElement);
          } else if (retryCount >= maxRetries) {
            if (retryInterval) {
              clearInterval(retryInterval);
              retryInterval = null;
            }
            console.error('❌ [HierarchyViewer] SVG要素が見つかりませんでした（最大再試行回数に達しました）');
          }
        }, 500);
        return;
      }
      
      attachClickHandlers(svgElement);
    };
    
    // Graphviz再レンダリングを監視（コンテナ全体を監視）
    // SVG要素が追加されたら、イベントリスナーを設定
    observer = new MutationObserver((mutations) => {
      // SVG要素が追加されたかチェック
      const hasSvgAdded = mutations.some(mutation => {
        return Array.from(mutation.addedNodes).some(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            return element.tagName === 'svg' || element.querySelector('svg');
          }
          return false;
        });
      });
      
      if (hasSvgAdded) {
        console.log('🔄 [HierarchyViewer] SVG要素が追加されました。イベントリスナーを設定します...');
        setTimeout(() => {
          const svgElement = containerRef.current?.querySelector('svg');
          if (svgElement) {
            attachClickHandlers(svgElement);
          }
        }, 100);
      }
    });
    
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
      });
      
      // 初回設定（既にSVGが存在する場合）
      const initialSvgElement = containerRef.current.querySelector('svg');
      if (initialSvgElement) {
        console.log('🔄 [HierarchyViewer] 既存のSVG要素を検出。イベントリスナーを設定します...');
        attachClickHandlers(initialSvgElement);
      } else {
        // SVGがまだない場合、少し待ってから再試行
        timeoutId = setTimeout(() => {
          findAndAttachHandlers();
        }, 1000);
      }
    }
    
    return () => {
      // タイマーのクリーンアップ
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // リトライインターバルのクリーンアップ
      if (retryInterval) {
        clearInterval(retryInterval);
        retryInterval = null;
      }
      
      // MutationObserverのクリーンアップ
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      
      // イベントリスナーのクリーンアップ
      if (currentSvgElement) {
        const nodeElements = currentSvgElement.querySelectorAll('g.node');
        nodeElements.forEach((nodeElement) => {
          if ((nodeElement as any).__clickHandler) {
            nodeElement.removeEventListener('click', (nodeElement as any).__clickHandler, true);
            nodeElement.removeEventListener('mouseenter', (nodeElement as any).__mouseEnterHandler);
            nodeElement.removeEventListener('mouseleave', (nodeElement as any).__mouseLeaveHandler);
            if ((nodeElement as any).__mouseDownHandler) {
              nodeElement.removeEventListener('mousedown', (nodeElement as any).__mouseDownHandler);
            }
          }
        });
        currentSvgElement = null;
      }
    };
  }, [dotCode, nodeIdMap, onSiteClick, onRackClick, onEquipmentClick, siteEquipment, hierarchyState.currentLevel]);
  
  // レンダリング時のログ（useEffectの外で実行される）
  useEffect(() => {
    console.log('🔄 [HierarchyViewer] レンダリング（useEffect）', {
      hasDotCode: !!dotCode,
      dotCodeLength: dotCode?.length || 0,
      nodeMapSize: nodeIdMap.size,
    });
  }, [dotCode, nodeIdMap]);
  
  console.log('🔄 [HierarchyViewer] レンダリング（関数本体）', {
    hasDotCode: !!dotCode,
    dotCodeLength: dotCode?.length || 0,
    nodeMapSize: nodeIdMap.size,
  });
  
  if (!dotCode || dotCode.trim() === '') {
    console.warn('⚠️ [HierarchyViewer] DOTコードがありません', {
      hasDotCode: !!dotCode,
      dotCodeLength: dotCode?.length || 0,
      dotCodePreview: dotCode?.substring(0, 100),
    });
    return (
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: '#9CA3AF',
        fontSize: '14px',
      }}>
        データがありません
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '600px',
      }}
    >
      <GraphvizViewerWithZoom dotCode={dotCode} />
    </div>
  );
}

