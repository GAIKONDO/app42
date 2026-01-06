import { useEffect } from 'react';
import type { RelationshipNode } from '../../RelationshipDiagram2D';
import type { TopicInfo, FocusInitiative } from '@/lib/orgApi';
import { getColorByDepth } from '../utils/nodeColors';

interface UseBubbleChartRenderingProps {
  svgRef: React.RefObject<SVGSVGElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  packedData: any;
  hoveredNodeId: string | null;
  showTopics: boolean;
  width: number;
  height: number;
  onNodeClick?: (node: RelationshipNode) => void;
  setHoveredNodeId: (id: string | null) => void;
  setTooltip: (tooltip: { x: number; y: number; content: string } | null) => void;
  setSelectedTopic: (topic: TopicInfo | null) => void;
  setSelectedInitiative: (initiative: FocusInitiative | null) => void;
}

export function useBubbleChartRendering({
  svgRef,
  containerRef,
  packedData,
  hoveredNodeId,
  showTopics,
  width,
  height,
  onNodeClick,
  setHoveredNodeId,
  setTooltip,
  setSelectedTopic,
  setSelectedInitiative,
}: UseBubbleChartRenderingProps) {
  useEffect(() => {
    if (!svgRef.current || !packedData) return;

    const svg = svgRef.current;
    svg.innerHTML = '';

    // シャドウフィルターを定義
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'bubble-shadow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');
    
    const feDropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
    feDropShadow.setAttribute('dx', '0');
    feDropShadow.setAttribute('dy', '2');
    feDropShadow.setAttribute('stdDeviation', '3');
    feDropShadow.setAttribute('flood-opacity', '0.15');
    feDropShadow.setAttribute('flood-color', '#000000');
    
    filter.appendChild(feDropShadow);
    defs.appendChild(filter);
    svg.appendChild(defs);

    // オフセットを計算
    const offsetX = 40;
    const offsetY = 40;

    // ノードを描画
    packedData.descendants().forEach((node: any) => {
      if (!node.r) return;

      const nodeData = node.data;
      const depth = nodeData.depth || node.depth;
      const nodeType = nodeData.nodeType;
      const isHovered = hoveredNodeId === nodeData.id;
      const isLeaf = !node.children || node.children.length === 0;
      const isRoot = depth === 0;

      // ルートノードはスキップ
      if (isRoot) return;

      // 個別トピックの表示/非表示フィルター
      if (!showTopics && nodeType === 'topic') return;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(node.x + offsetX));
      circle.setAttribute('cy', String(node.y + offsetY));
      circle.setAttribute('r', String(node.r));
      
      const color = getColorByDepth(depth, nodeType);
      
      // テーマノード
      if (nodeType === 'theme') {
        circle.setAttribute('fill', color);
        circle.setAttribute('fill-opacity', isHovered ? '0.15' : '0.08');
        circle.setAttribute('stroke', color);
        circle.setAttribute('stroke-width', isHovered ? '1.5' : '1');
        circle.setAttribute('stroke-dasharray', '8,4');
      } else if (nodeType === 'category') {
        // カテゴリーノード
        circle.setAttribute('fill', color);
        circle.setAttribute('fill-opacity', isHovered ? '0.15' : '0.08');
        circle.setAttribute('stroke', color);
        circle.setAttribute('stroke-width', isHovered ? '1.5' : '1');
        circle.setAttribute('stroke-dasharray', '8,4');
      } else if (nodeType === 'bizdevphase') {
        // Biz-Devフェーズノード
        circle.setAttribute('fill', color);
        circle.setAttribute('fill-opacity', isHovered ? '0.85' : '0.75');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5');
        circle.setAttribute('filter', 'url(#bubble-shadow)');
      } else if (nodeType === 'startup') {
        // スタートアップノード
        circle.setAttribute('fill', color);
        circle.setAttribute('fill-opacity', isHovered ? '0.8' : '0.7');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5');
        circle.setAttribute('filter', 'url(#bubble-shadow)');
      } else if (nodeType === 'organization' || nodeType === 'company') {
        // 組織/事業会社ノード
        circle.setAttribute('fill', color);
        circle.setAttribute('fill-opacity', isHovered ? '0.85' : '0.75');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5');
        circle.setAttribute('filter', 'url(#bubble-shadow)');
      } else if (nodeType === 'initiative') {
        // 注力施策ノード
        circle.setAttribute('fill', color);
        circle.setAttribute('fill-opacity', isHovered ? '0.8' : '0.7');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5');
        circle.setAttribute('filter', 'url(#bubble-shadow)');
      } else if (nodeType === 'topic') {
        // トピックノード
        circle.setAttribute('fill', color);
        circle.setAttribute('fill-opacity', isHovered ? '0.9' : '0.8');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5');
        circle.setAttribute('filter', 'url(#bubble-shadow)');
      }
      
      circle.style.cursor = 'pointer';
      circle.setAttribute('data-node-id', nodeData.id);

      // ホバーエフェクトとツールチップ
      circle.addEventListener('mouseenter', (e) => {
        setHoveredNodeId(nodeData.id);
        
        // ツールチップの内容を構築
        const nodeInfo = nodeData.originalData as RelationshipNode;
        let tooltipContent = nodeData.name || '';
        
        // ノードタイプに応じた追加情報を表示
        if (nodeType === 'theme') {
          tooltipContent = `テーマ: ${nodeData.name}`;
        } else if (nodeType === 'category') {
          tooltipContent = `カテゴリー: ${nodeData.name}`;
          if (nodeInfo?.data?.description) {
            tooltipContent += `\n${nodeInfo.data.description.substring(0, 100)}${nodeInfo.data.description.length > 100 ? '...' : ''}`;
          }
        } else if (nodeType === 'bizdevphase') {
          tooltipContent = `Biz-Devフェーズ: ${nodeData.name}`;
          if (nodeInfo?.data?.description) {
            tooltipContent += `\n${nodeInfo.data.description.substring(0, 100)}${nodeInfo.data.description.length > 100 ? '...' : ''}`;
          }
        } else if (nodeType === 'startup') {
          tooltipContent = `スタートアップ: ${nodeData.name}`;
          if (nodeInfo?.data?.description) {
            tooltipContent += `\n${nodeInfo.data.description.substring(0, 100)}${nodeInfo.data.description.length > 100 ? '...' : ''}`;
          }
        } else if (nodeType === 'organization') {
          tooltipContent = `組織: ${nodeData.name}`;
        } else if (nodeType === 'company') {
          tooltipContent = `事業会社: ${nodeData.name}`;
        } else if (nodeType === 'initiative') {
          tooltipContent = `注力施策: ${nodeData.name}`;
          if (nodeInfo?.data?.description) {
            tooltipContent += `\n${nodeInfo.data.description.substring(0, 100)}${nodeInfo.data.description.length > 100 ? '...' : ''}`;
          }
        } else if (nodeType === 'topic') {
          tooltipContent = `トピック: ${nodeData.name}`;
          if (nodeInfo?.data?.description) {
            tooltipContent += `\n${nodeInfo.data.description.substring(0, 100)}${nodeInfo.data.description.length > 100 ? '...' : ''}`;
          }
        }
        
        // SVGの座標をDOM座標に変換
        if (svgRef.current && containerRef.current) {
          const svgPoint = svgRef.current.createSVGPoint();
          svgPoint.x = node.x + offsetX;
          svgPoint.y = node.y + offsetY - node.r - 10;
          
          setTooltip({
            x: svgPoint.x,
            y: svgPoint.y,
            content: tooltipContent,
          });
        } else {
          setTooltip({
            x: node.x + offsetX,
            y: node.y + offsetY - node.r - 10,
            content: tooltipContent,
          });
        }
      });

      circle.addEventListener('mouseleave', () => {
        setHoveredNodeId(null);
        setTooltip(null);
      });

      circle.addEventListener('click', () => {
        if (onNodeClick && nodeData.originalData) {
          onNodeClick(nodeData.originalData);
        }
      });

      // トピックノードのダブルクリックでモーダルを表示
      if (nodeType === 'topic') {
        circle.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          const topicData = nodeData.originalData as RelationshipNode;
          const topicInfo = topicData?.data as TopicInfo;
          
          if (topicInfo) {
            console.log('🔍 [バブルチャート] トピックダブルクリック:', {
              topicId: topicInfo.id,
              topicTitle: topicInfo.title,
              meetingNoteId: topicInfo.meetingNoteId,
              organizationId: topicInfo.organizationId,
            });
            setSelectedTopic(topicInfo);
          } else {
            console.warn('⚠️ [バブルチャート] トピックデータが見つかりません:', {
              topicId: nodeData.id,
              topicData,
            });
          }
        });
      }

      // 注力施策ノードのダブルクリックでモーダルを表示
      if (nodeType === 'initiative') {
        circle.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          const initiativeData = nodeData.originalData as RelationshipNode;
          const initiativeInfo = initiativeData?.data as FocusInitiative;
          
          if (initiativeInfo) {
            console.log('🔍 [バブルチャート] 注力施策ダブルクリック:', {
              initiativeId: initiativeInfo.id,
              initiativeTitle: initiativeInfo.title,
              organizationId: initiativeInfo.organizationId,
            });
            setSelectedInitiative(initiativeInfo);
          } else {
            console.warn('⚠️ [バブルチャート] 注力施策データが見つかりません:', {
              initiativeId: nodeData.id,
              initiativeData,
            });
          }
        });
      }

      // スタートアップノードのダブルクリックでonNodeClickを呼び出し
      if (nodeType === 'startup') {
        circle.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          const startupData = nodeData.originalData as RelationshipNode;
          
          if (startupData && onNodeClick) {
            console.log('🔍 [バブルチャート] スタートアップダブルクリック:', {
              startupId: startupData.id,
              startupTitle: startupData.label,
            });
            onNodeClick(startupData);
          }
        });
      }

      svg.appendChild(circle);

      // ラベルを追加（組織ページのバブルチャートと同じフォント設定）
      const name = nodeData.name || '';
      // 深さに応じた最小半径を設定（組織ページと同じロジック）
      const minRadiusForLabel = depth === 1 ? 50 : depth === 2 ? 30 : 20;
      
      if (node.r > minRadiusForLabel && name) {
        // 深さに応じたフォントサイズとウェイトを設定（組織ページと同じ）
        let fontSize: number;
        let fontWeight: string;
        let fillColor: string;
        let labelY: number;
        
        if (depth === 1) {
          // テーマ（Division相当）: 18px, weight 700
          fontSize = 18;
          fontWeight = '700';
          fillColor = color;
          // テーマはバブルの上に配置
          labelY = node.y + offsetY - node.r - 20;
        } else if (depth === 2) {
          // Biz-Devフェーズ（Department相当）: 16px, weight 600
          fontSize = 16;
          fontWeight = '600';
          fillColor = '#ffffff';
          // Biz-Devフェーズはバブルの内側中央に配置
          labelY = node.y + offsetY;
        } else {
          // スタートアップ（Section相当）: 16px, weight 600
          fontSize = 16;
          fontWeight = '600';
          fillColor = '#ffffff';
          // スタートアップはバブルの内側中央に配置
          labelY = node.y + offsetY;
        }
        
        // テキストを作成（組織ページと同じフォントファミリー）
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(node.x + offsetX));
        text.setAttribute('y', String(labelY));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('font-size', fontSize + 'px');
        text.setAttribute('fill', fillColor);
        text.setAttribute('font-weight', fontWeight);
        text.style.pointerEvents = 'none';
        text.style.fontFamily = "'Inter', 'Noto Sans JP', -apple-system, sans-serif";
        
        // テキストの長さを調整（深さに応じた最大文字数）
        const maxCharsPerLine = depth === 1 ? 8 : 10; // テーマは少し短め、Biz-Devフェーズ/スタートアップは少し長め
        let isMultiLine = false;
        
        if (name.length > maxCharsPerLine && node.r > 50) {
          isMultiLine = true;
          // 2行に分割
          const mid = Math.ceil(name.length / 2);
          let splitPoint = mid;
          
          // 適切な分割点を探す（スペースや句読点の前）
          for (let i = mid; i < name.length && i < mid + 5; i++) {
            if (name[i] === ' ' || name[i] === '・' || name[i] === 'フェーズ' || name[i] === 'ビジネス') {
              splitPoint = i + 1;
              break;
            }
          }
          
          const line1 = name.substring(0, splitPoint);
          const line2 = name.substring(splitPoint);
          
          const tspan1 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          tspan1.setAttribute('x', String(node.x + offsetX));
          tspan1.setAttribute('dy', '-0.35em');
          tspan1.textContent = line1;
          text.appendChild(tspan1);
          
          const tspan2 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          tspan2.setAttribute('x', String(node.x + offsetX));
          tspan2.setAttribute('dy', '1.1em');
          tspan2.textContent = line2;
          text.appendChild(tspan2);
        } else {
          // テキストの長さを調整
          const maxChars = Math.floor(node.r / (fontSize * 0.5));
          let displayText = name;
          if (name.length > maxChars) {
            displayText = name.substring(0, maxChars - 1) + '...';
          }
          text.textContent = displayText;
        }
        
        svg.appendChild(text);
      }
    });
  }, [packedData, hoveredNodeId, showTopics, width, height, onNodeClick, setHoveredNodeId, setTooltip, setSelectedTopic, setSelectedInitiative, svgRef, containerRef]);
}

