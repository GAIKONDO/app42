import { useMemo } from 'react';
import type { RelationshipNode, RelationshipLink } from '../../RelationshipDiagram2D';

export function useHierarchyData(
  nodes: RelationshipNode[],
  links: RelationshipLink[],
  showTopics: boolean
) {
  return useMemo(() => {
    // テーマノードまたはカテゴリーノードを取得
    const themeNodes = nodes.filter(node => node.type === 'theme');
    // 親カテゴリー（categoryTypeが'parent'またはparentCategoryIdがない）を取得
    const categoryNodes = nodes.filter(node => 
      node.type === 'category' && 
      (node.data?.categoryType === 'parent' || !node.data?.parentCategoryId)
    );
    
    // ノードIDからノードを取得するマップを作成
    const nodeMap = new Map<string, RelationshipNode>();
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });
    
    // リンクから親子関係を構築
    const childrenMap = new Map<string, RelationshipNode[]>();
    
    links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      
      if (!childrenMap.has(sourceId)) {
        childrenMap.set(sourceId, []);
      }
      const targetNode = nodeMap.get(targetId);
      if (targetNode) {
        childrenMap.get(sourceId)!.push(targetNode);
      }
    });

    // カテゴリー階層を構築
    const buildCategoryHierarchy = (node: RelationshipNode, depth: number): any => {
      const children = childrenMap.get(node.id) || [];
      
      // 子カテゴリーとスタートアップを分類
      const childCategoryNodes = children.filter(n => n.type === 'category');
      const startupNodes = children.filter(n => n.type === 'startup');
      
      // 子カテゴリーを再帰的に構築
      const childCategories = childCategoryNodes.map(childCategoryNode => {
        return buildCategoryHierarchy(childCategoryNode, depth + 1);
      });
      
      // スタートアップノードを構築
      const startups = startupNodes.map(startupNode => ({
        name: startupNode.label,
        id: startupNode.id,
        value: 1,
        depth: depth + (childCategories.length > 0 ? 2 : 1),
        nodeType: startupNode.type,
        originalData: startupNode,
      }));
      
      // 子カテゴリーとスタートアップを結合
      const allChildren = [...childCategories, ...startups];
      
      return {
        name: node.label,
        id: node.id,
        value: 1,
        depth: depth,
        nodeType: node.type,
        originalData: node,
        children: allChildren.length > 0 ? allChildren : undefined,
      };
    };

    // テーマ階層を構築（テーマ→Biz-Devフェーズ→スタートアップ）
    const buildThemeHierarchy = (node: RelationshipNode, depth: number): any => {
      const children = childrenMap.get(node.id) || [];
      
      // 子ノードをタイプごとに分類
      const bizDevPhaseChildren = children.filter(n => n.type === 'bizdevphase');
      const startupChildren = children.filter(n => n.type === 'startup'); // テーマから直接リンクされているスタートアップ（フォールバック用）
      const initiativeChildren = children.filter(n => n.type === 'initiative');
      const topicChildren = children.filter(n => n.type === 'topic');
      
      // Biz-Devフェーズノードの子としてスタートアップを配置
      const bizDevPhaseNodesWithStartups = bizDevPhaseChildren.map(bizDevPhaseNode => {
        const phaseChildren = childrenMap.get(bizDevPhaseNode.id) || [];
        const phaseStartupChildren = phaseChildren.filter(n => n.type === 'startup');
        
        // スタートアップノードを構築
        const startups = phaseStartupChildren.map(startupNode => ({
          name: startupNode.label,
          id: startupNode.id,
          value: 1,
          depth: depth + 2,
          nodeType: startupNode.type,
          originalData: startupNode,
        }));
        
        return {
          name: bizDevPhaseNode.label,
          id: bizDevPhaseNode.id,
          value: 1, // Biz-Devフェーズの基本値
          depth: depth + 1,
          nodeType: bizDevPhaseNode.type,
          originalData: bizDevPhaseNode,
          children: startups.length > 0 ? startups : undefined,
        };
      });
      
      // テーマから直接リンクされているスタートアップノードを構築（フォールバック用、通常はBiz-Devフェーズ経由）
      const directStartups = startupChildren.map(startupNode => ({
        name: startupNode.label,
        id: startupNode.id,
        value: 1,
        depth: depth + 1,
        nodeType: startupNode.type,
        originalData: startupNode,
      }));
      
      // 注力施策とトピックも含める（既存の機能を維持）
      const initiativesWithTopics = initiativeChildren.map(initNode => {
        const initChildren = childrenMap.get(initNode.id) || [];
        const topicChildren = showTopics ? initChildren.filter(n => n.type === 'topic') : [];
        
        return {
          name: initNode.label,
          id: initNode.id,
          value: 1,
          depth: depth + 1,
          nodeType: initNode.type,
          originalData: initNode,
          children: topicChildren.length > 0 ? topicChildren.map(topicNode => ({
            name: topicNode.label,
            id: topicNode.id,
            value: 1,
            depth: depth + 2,
            nodeType: topicNode.type,
            originalData: topicNode,
          })) : undefined,
        };
      });
      
      // Biz-Devフェーズ、直接スタートアップ、注力施策を結合
      const allThemeChildren = [...bizDevPhaseNodesWithStartups, ...directStartups, ...initiativesWithTopics];
      
      return {
        name: node.label,
        id: node.id,
        value: 1, // テーマの基本値
        depth: depth,
        nodeType: node.type,
        originalData: node,
        children: allThemeChildren.length > 0 ? allThemeChildren : undefined,
      };
    };

    // カテゴリーノードがある場合はカテゴリー階層を構築、なければテーマ階層を構築
    if (categoryNodes.length > 0) {
      return {
        name: 'root',
        children: categoryNodes.map(categoryNode => buildCategoryHierarchy(categoryNode, 1)),
      };
    } else {
      return {
        name: 'root',
        children: themeNodes.map(themeNode => buildThemeHierarchy(themeNode, 1)),
      };
    }
  }, [nodes, links, showTopics]);
}

