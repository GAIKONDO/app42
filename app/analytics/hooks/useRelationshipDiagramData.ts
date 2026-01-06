import { useMemo } from 'react';
import type { RelationshipNode, RelationshipLink } from '@/components/RelationshipDiagram2D';
import type { Theme, FocusInitiative, TopicInfo, Startup, BizDevPhase } from '@/lib/orgApi';
import type { OrgNodeData } from '@/lib/orgApi';
import { devLog, devWarn } from '../utils/devLog';

const isDev = process.env.NODE_ENV === 'development';

export function useRelationshipDiagramData({
  selectedThemeId,
  themes,
  initiatives,
  startups,
  orgData,
  topics,
  bizDevPhases,
}: {
  selectedThemeId: string | null;
  themes: Theme[];
  initiatives: FocusInitiative[];
  startups: Startup[];
  orgData: OrgNodeData | null;
  topics: TopicInfo[];
  bizDevPhases: BizDevPhase[];
}) {
  const { nodes, links } = useMemo(() => {
    devLog('🔍 [2D関係性図] useMemo実行:', {
      selectedThemeId,
      hasOrgData: !!orgData,
      themesCount: themes.length,
      initiativesCount: initiatives.length,
      startupsCount: startups.length,
      topicsCount: topics.length,
    });

    if (!orgData && themes.length === 0) {
      devLog('🔍 [2D関係性図] 組織データなし、かつテーマが存在しない');
      return { nodes: [], links: [] };
    }

    const diagramNodes: RelationshipNode[] = [];
    const diagramLinks: RelationshipLink[] = [];

    const themesToShow = selectedThemeId
      ? themes.filter((t) => t.id === selectedThemeId)
      : themes;

    devLog('🔍 [2D関係性図] 表示するテーマ数:', themesToShow.length);
    
    if (themesToShow.length === 0) {
      devLog('🔍 [2D関係性図] 表示するテーマがありません');
      return { nodes: [], links: [] };
    }

    themesToShow.forEach((theme) => {
      diagramNodes.push({
        id: theme.id,
        label: theme.title,
        type: 'theme',
        data: theme,
      });

      const relatedInitiatives = initiatives.filter((init) => 
        theme.initiativeIds?.includes(init.id) || 
        init.themeId === theme.id || 
        (Array.isArray(init.themeIds) && init.themeIds.includes(theme.id))
      );

      // テーマに関連するスタートアップをフィルタリング
      const relatedStartups = startups.filter((startup) => {
        // themeIdまたはthemeIdsで関連付けられているスタートアップを取得
        if (startup.themeId === theme.id) {
          return true;
        }
        if (Array.isArray(startup.themeIds) && startup.themeIds.includes(theme.id)) {
          return true;
        }
        // themeIdsが文字列（JSON）の場合もパースしてチェック
        if (typeof startup.themeIds === 'string') {
          try {
            const parsed = JSON.parse(startup.themeIds);
            if (Array.isArray(parsed) && parsed.includes(theme.id)) {
              return true;
            }
          } catch (e) {
            // パースエラーは無視
          }
        }
        return false;
      });

      // 組織ノードは作成しない（テーマから直接スタートアップへ接続）

      relatedInitiatives.forEach((initiative) => {
        const initiativeNodeId = `${theme.id}_${initiative.id}`;
        
        diagramNodes.push({
          id: initiativeNodeId,
          label: initiative.title,
          type: 'initiative',
          data: { ...initiative, originalId: initiative.id, themeId: theme.id },
        });

        // 組織ノードは表示しないため、注力施策から組織へのリンクも作成しない
        
        let parsedTopicIds: string[] = [];
        if (initiative.topicIds) {
          if (Array.isArray(initiative.topicIds)) {
            parsedTopicIds = initiative.topicIds;
          } else if (typeof initiative.topicIds === 'string') {
            try {
              const parsed = JSON.parse(initiative.topicIds);
              parsedTopicIds = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              devWarn('⚠️ [2D関係性図] topicIdsのパースエラー:', e, 'value:', initiative.topicIds);
              parsedTopicIds = [];
            }
          }
        }
        
        if (parsedTopicIds.length > 0) {
          devLog('🔍 [2D関係性図] 注力施策に紐づけられたトピック:', {
            initiativeId: initiative.id,
            initiativeTitle: initiative.title,
            topicIdsCount: parsedTopicIds.length,
            availableTopicsCount: topics.length,
          });
          
          const missingTopicIds = new Set<string>();
          
          parsedTopicIds.forEach((topicId) => {
            const matchingTopics = topics.filter(t => {
              const matches = t.id === topicId;
              if (!matches && t.id && topicId && isDev) {
                const idStr = String(t.id);
                const searchStr = String(topicId);
                if (idStr.includes(searchStr) || searchStr.includes(idStr)) {
                  devWarn('⚠️ [2D関係性図] トピックIDの部分一致を検出:', {
                    topicId: topicId,
                    foundId: t.id,
                    topicTitle: t.title,
                  });
                }
              }
              return matches;
            });
            
            const topic = matchingTopics.length > 0 ? matchingTopics[0] : null;
            
            if (topic) {
              const topicNodeId = `${theme.id}_${initiative.id}_${topic.id}`;
              
              diagramNodes.push({
                id: topicNodeId,
                label: topic.title,
                type: 'topic',
                data: { ...topic, originalId: topic.id, initiativeId: initiative.id, themeId: theme.id },
              });
              
              diagramLinks.push({
                source: initiativeNodeId,
                target: topicNodeId,
                type: 'topic',
              });
            } else {
              missingTopicIds.add(topicId);
              devWarn('⚠️ [2D関係性図] トピックが見つかりませんでした:', {
                topicId,
                initiativeId: initiative.id,
                initiativeTitle: initiative.title,
              });
            }
          });
          
          if (missingTopicIds.size > 0) {
            devWarn('⚠️ [2D関係性図] 一部のトピックが見つかりませんでした（データの不整合の可能性）:', {
              missingTopicIdsCount: missingTopicIds.size,
              initiativeId: initiative.id,
              initiativeTitle: initiative.title,
            });
          }
        }
      });

      // スタートアップをBiz-Devフェーズでグループ化
      const startupsByBizDevPhase = new Map<string, Startup[]>();
      relatedStartups.forEach((startup) => {
        const phaseId = startup.bizDevPhase || 'no-phase';
        if (!startupsByBizDevPhase.has(phaseId)) {
          startupsByBizDevPhase.set(phaseId, []);
        }
        startupsByBizDevPhase.get(phaseId)!.push(startup);
      });

      // Biz-Devフェーズノードを作成し、テーマからBiz-Devフェーズへのリンクを作成
      startupsByBizDevPhase.forEach((phaseStartups, phaseId) => {
        // Biz-Devフェーズ情報を取得
        const bizDevPhase = phaseId !== 'no-phase' 
          ? bizDevPhases.find(p => p.id === phaseId)
          : null;
        
        const phaseNodeId = `${theme.id}_bizdev_${phaseId}`;
        const phaseLabel = bizDevPhase ? bizDevPhase.title : 'Biz-Devフェーズ未設定';
        
        // Biz-Devフェーズノードを追加（重複チェック）
        if (!diagramNodes.find(n => n.id === phaseNodeId)) {
          diagramNodes.push({
            id: phaseNodeId,
            label: phaseLabel,
            type: 'bizdevphase',
            data: { 
              id: phaseId, 
              title: phaseLabel, 
              originalId: phaseId, 
              themeId: theme.id,
              bizDevPhase: bizDevPhase || null,
            },
          });

          // テーマからBiz-Devフェーズへのリンク
          diagramLinks.push({
            source: theme.id,
            target: phaseNodeId,
            type: 'bizdevphase',
          });
        }

        // スタートアップノードを追加し、Biz-Devフェーズからスタートアップへのリンクを作成
        phaseStartups.forEach((startup) => {
          const startupNodeId = `${theme.id}_${startup.id}`;
          
          // スタートアップノードを追加（重複チェック）
          if (!diagramNodes.find(n => n.id === startupNodeId)) {
            diagramNodes.push({
              id: startupNodeId,
              label: startup.title,
              type: 'startup',
              data: { ...startup, originalId: startup.id, themeId: theme.id },
            });
          }

          // Biz-Devフェーズからスタートアップへのリンク
          diagramLinks.push({
            source: phaseNodeId,
            target: startupNodeId,
            type: 'startup',
          });
        });
      });
    });

    const topicNodes = diagramNodes.filter(n => n.type === 'topic');
    const topicLinks = diagramLinks.filter(l => l.type === 'topic');
    
    const nodeIds = new Set(diagramNodes.map(n => n.id));
    const invalidLinks: Array<{ source: string; target: string; type?: string }> = [];
    diagramLinks.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) {
        invalidLinks.push({
          source: sourceId,
          target: targetId,
          type: link.type,
        });
      }
    });
    
    if (invalidLinks.length > 0) {
      console.error('❌ [2D関係性図] 無効なリンクが検出されました:', {
        invalidLinksCount: invalidLinks.length,
        missingSourceNodesCount: invalidLinks.filter(l => !nodeIds.has(l.source)).length,
        missingTargetNodesCount: invalidLinks.filter(l => !nodeIds.has(l.target)).length,
      });
    }
    
    devLog('🔍 [2D関係性図] 最終結果:', {
      totalNodes: diagramNodes.length,
      totalLinks: diagramLinks.length,
      topicNodesCount: topicNodes.length,
      topicLinksCount: topicLinks.length,
      invalidLinksCount: invalidLinks.length,
    });

    const validLinks = diagramLinks.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return { nodes: diagramNodes, links: validLinks };
  }, [selectedThemeId, themes, initiatives, startups, orgData, topics, bizDevPhases]);

  return { nodes, links };
}

