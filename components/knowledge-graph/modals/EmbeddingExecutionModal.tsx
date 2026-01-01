'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/utils/supabaseClient';
import { saveEntityEmbeddingAsync } from '@/lib/entityEmbeddings';
import { saveRelationEmbeddingAsync } from '@/lib/relationEmbeddings';
import { saveTopicEmbeddingAsync } from '@/lib/topicEmbeddings';
import { saveStartupEmbeddingAsync } from '@/lib/startupEmbeddings';
import { saveMeetingNoteEmbeddingAsync, saveMeetingNoteItemEmbeddingAsync } from '@/lib/meetingNoteEmbeddings';
import { saveFocusInitiativeEmbeddingAsync } from '@/lib/focusInitiativeEmbeddings';
import { saveRegulationEmbeddingAsync, saveRegulationItemEmbeddingAsync } from '@/lib/regulationEmbeddings';
import { getEntityById } from '@/lib/entityApi';
import { getRelationById } from '@/lib/relationApi';
import { getMeetingNoteById } from '@/lib/orgApi/meetingNotes';
import { getRegulationById } from '@/lib/orgApi/regulations';
import type { MonthContent } from '@/app/organization/detail/meeting/types';

interface EmbeddingStats {
  entities: {
    total: number;
    embedded: number;
    missing: number;
  };
  relations: {
    total: number;
    embedded: number;
    missing: number;
  };
  topics: {
    total: number;
    embedded: number;
    missing: number;
  };
  startups: {
    total: number;
    embedded: number;
    missing: number;
  };
  meetingNotes: {
    total: number;
    embedded: number;
    missing: number;
    items: {
      total: number;
      embedded: number;
      missing: number;
    };
    topics: {
      total: number;
      embedded: number;
      missing: number;
      entities: number;
      relations: number;
    };
  };
  focusInitiatives: {
    total: number;
    embedded: number;
    missing: number;
  };
  regulations: {
    total: number;
    embedded: number;
    missing: number;
    items: {
      total: number;
      embedded: number;
      missing: number;
    };
    topics: {
      total: number;
      embedded: number;
      missing: number;
      entities: number;
      relations: number;
    };
  };
}

interface EmbeddingExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmbeddingExecutionModal({
  isOpen,
  onClose,
}: EmbeddingExecutionModalProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [stats, setStats] = useState<EmbeddingStats | null>(null);
  const [executionProgress, setExecutionProgress] = useState<{
    current: number;
    total: number;
    category: string;
    status: 'idle' | 'processing' | 'completed' | 'error';
  }>({
    current: 0,
    total: 0,
    category: '',
    status: 'idle',
  });

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const supabase = getSupabaseClient();
      
      // 全データを取得（組織フィルタなし）
      // カラム名はSupabaseの実際のスキーマに合わせて調整（小文字のスネークケース）
      const [
        entitiesResult, 
        relationsResult, 
        topicsResult, 
        startupsResult, 
        meetingNotesResult, 
        focusInitiativesResult,
        regulationsResult,
        entityEmbeddingsResult, 
        relationEmbeddingsResult, 
        topicEmbeddingsResult,
        startupEmbeddingsResult,
        meetingNoteEmbeddingsResult,
        meetingNoteItemEmbeddingsResult,
        focusInitiativeEmbeddingsResult,
        regulationEmbeddingsResult,
        regulationItemEmbeddingsResult,
      ] = await Promise.all([
        supabase.from('entities').select('id, metadata'),
        supabase.from('relations').select('id, topicid'),
        supabase.from('topics').select('id, "topicId"'),
        supabase.from('startups').select('id'),
        supabase.from('meetingnotes').select('id'),
        supabase.from('focusinitiatives').select('id'),
        (async () => {
          try {
            const result = await supabase.from('regulations').select('id');
            // エラーが発生した場合でも、テーブルが存在しない場合は空のデータを返す
            if (result.error) {
              const errorMsg = result.error.message || '';
              if (errorMsg.includes('Could not find the table') || 
                  errorMsg.includes('does not exist') ||
                  errorMsg.includes('PGRST205')) {
                return { data: [], error: null };
              }
            }
            return result;
          } catch (error: any) {
            // regulationsテーブルが存在しない場合は空のデータを返す
            return { data: [], error: null };
          }
        })(),
        supabase.from('entity_embeddings').select('entity_id'),
        supabase.from('relation_embeddings').select('relation_id'),
        supabase.from('topic_embeddings').select('topic_id'),
        supabase.from('startup_embeddings').select('startup_id'),
        supabase.from('meeting_note_embeddings').select('meeting_note_id'),
        (async () => {
          try {
            return await supabase.from('meeting_note_item_embeddings').select('meeting_note_id, item_id');
          } catch (error: any) {
            return { data: [], error: error };
          }
        })(),
        supabase.from('focus_initiative_embeddings').select('focus_initiative_id'),
        supabase.from('regulation_embeddings').select('regulation_id'),
        (async () => {
          try {
            return await supabase.from('regulation_item_embeddings').select('regulation_id, item_id');
          } catch (error: any) {
            return { data: [], error: error };
          }
        })(),
      ]);

      // エラーハンドリング
      if (entitiesResult.error) {
        console.error('entities取得エラー:', entitiesResult.error);
      }
      if (relationsResult.error) {
        console.error('relations取得エラー:', relationsResult.error);
      }
      if (topicsResult.error) {
        console.error('topics取得エラー:', topicsResult.error);
      }
      if (startupsResult.error) {
        console.error('startups取得エラー:', startupsResult.error);
      }
      if (meetingNotesResult.error) {
        console.error('meetingNotes取得エラー:', meetingNotesResult.error);
      }
      if (focusInitiativesResult.error) {
        console.error('focusInitiatives取得エラー:', focusInitiativesResult.error);
      }
      if (regulationsResult.error) {
        // regulationsテーブルが存在しない場合はエラーを無視
        if (!regulationsResult.error.message?.includes('Could not find the table') && 
            !regulationsResult.error.message?.includes('does not exist')) {
          console.error('regulations取得エラー:', regulationsResult.error);
        }
      }
      if (entityEmbeddingsResult.error) {
        console.error('entity_embeddings取得エラー:', entityEmbeddingsResult.error);
      }
      if (relationEmbeddingsResult.error) {
        console.error('relation_embeddings取得エラー:', relationEmbeddingsResult.error);
      }
      if (topicEmbeddingsResult.error) {
        console.error('topic_embeddings取得エラー:', topicEmbeddingsResult.error);
      }
      // 埋め込みテーブルが存在しない場合（まだ作成されていない）はエラーを無視
      if (startupEmbeddingsResult.error && !startupEmbeddingsResult.error.message?.includes('does not exist')) {
        console.error('startup_embeddings取得エラー:', startupEmbeddingsResult.error);
      }
      if (meetingNoteEmbeddingsResult.error && !meetingNoteEmbeddingsResult.error.message?.includes('does not exist')) {
        console.error('meeting_note_embeddings取得エラー:', meetingNoteEmbeddingsResult.error);
      }
      if (focusInitiativeEmbeddingsResult.error && !focusInitiativeEmbeddingsResult.error.message?.includes('does not exist')) {
        console.error('focus_initiative_embeddings取得エラー:', focusInitiativeEmbeddingsResult.error);
      }
      if (regulationEmbeddingsResult.error && !regulationEmbeddingsResult.error.message?.includes('does not exist')) {
        console.error('regulation_embeddings取得エラー:', regulationEmbeddingsResult.error);
      }
      // 埋め込みテーブルが存在しない場合（まだ作成されていない）はエラーを無視
      if (meetingNoteItemEmbeddingsResult.error && !meetingNoteItemEmbeddingsResult.error.message?.includes('does not exist')) {
        console.error('meeting_note_item_embeddings取得エラー:', meetingNoteItemEmbeddingsResult.error);
      }
      if (regulationItemEmbeddingsResult.error && !regulationItemEmbeddingsResult.error.message?.includes('does not exist')) {
        console.error('regulation_item_embeddings取得エラー:', regulationItemEmbeddingsResult.error);
      }

      // 全数（topicidがあるリレーションのみ - relationsテーブルではtopicIdは必須）
      const allEntities = entitiesResult.data || [];
      const allRelations = (relationsResult.data || []).filter((r: any) => {
        // Supabaseでは小文字のスネークケースで保存されている
        const topicId = r.topicid || r.topic_id || r.topicId;
        return !!topicId; // topicIdが存在するリレーションのみ
      });
      const allTopics = topicsResult.data || [];
      const allStartups = startupsResult.data || [];
      const allMeetingNotes = meetingNotesResult.data || [];
      const allFocusInitiatives = focusInitiativesResult.data || [];
      const allRegulations = regulationsResult.data || [];

      // 埋め込み済みIDのセット（テーブルが存在しない場合は空のセット）
      const embeddedEntityIds = new Set((entityEmbeddingsResult.data || []).map((e: any) => e.entity_id));
      const embeddedRelationIds = new Set((relationEmbeddingsResult.data || []).map((r: any) => r.relation_id));
      const embeddedTopicIds = new Set((topicEmbeddingsResult.data || []).map((t: any) => t.topic_id));
      const embeddedStartupIds = new Set(
        startupEmbeddingsResult.error && startupEmbeddingsResult.error.message?.includes('does not exist')
          ? []
          : (startupEmbeddingsResult.data || []).map((s: any) => s.startup_id)
      );
      const embeddedMeetingNoteIds = new Set(
        meetingNoteEmbeddingsResult.error && meetingNoteEmbeddingsResult.error.message?.includes('does not exist')
          ? []
          : (meetingNoteEmbeddingsResult.data || []).map((m: any) => m.meeting_note_id)
      );
      const embeddedFocusInitiativeIds = new Set(
        focusInitiativeEmbeddingsResult.error && focusInitiativeEmbeddingsResult.error.message?.includes('does not exist')
          ? []
          : (focusInitiativeEmbeddingsResult.data || []).map((f: any) => f.focus_initiative_id)
      );
      const embeddedRegulationIds = new Set(
        regulationEmbeddingsResult.error && regulationEmbeddingsResult.error.message?.includes('does not exist')
          ? []
          : (regulationEmbeddingsResult.data || []).map((r: any) => r.regulation_id)
      );
      
      // 議事録アイテム埋め込み済みIDのセット
      const embeddedMeetingNoteItemIds = new Set(
        meetingNoteItemEmbeddingsResult.error && meetingNoteItemEmbeddingsResult.error.message?.includes('does not exist')
          ? []
          : (meetingNoteItemEmbeddingsResult.data || []).map((m: any) => `${m.meeting_note_id}-item-${m.item_id}`)
      );
      
      // 制度アイテム埋め込み済みIDのセット
      const embeddedRegulationItemIds = new Set(
        regulationItemEmbeddingsResult.error && regulationItemEmbeddingsResult.error.message?.includes('does not exist')
          ? []
          : (regulationItemEmbeddingsResult.data || []).map((r: any) => `${r.regulation_id}-item-${r.item_id}`)
      );

      // 統計を計算
      const entityStats = {
        total: allEntities.length,
        embedded: allEntities.filter((e: any) => embeddedEntityIds.has(e.id)).length,
        missing: allEntities.filter((e: any) => !embeddedEntityIds.has(e.id)).length,
      };

      const relationStats = {
        total: allRelations.length,
        embedded: allRelations.filter((r: any) => embeddedRelationIds.has(r.id)).length,
        missing: allRelations.filter((r: any) => !embeddedRelationIds.has(r.id)).length,
      };

      const topicStats = {
        total: allTopics.length,
        embedded: allTopics.filter((t: any) => {
          const topicId = t.topicid || t.topicId;
          return topicId && embeddedTopicIds.has(topicId);
        }).length,
        missing: allTopics.filter((t: any) => {
          const topicId = t.topicid || t.topicId;
          return topicId && !embeddedTopicIds.has(topicId);
        }).length,
      };

      const startupStats = {
        total: allStartups.length,
        embedded: allStartups.filter((s: any) => embeddedStartupIds.has(s.id)).length,
        missing: allStartups.filter((s: any) => !embeddedStartupIds.has(s.id)).length,
      };

      // 議事録の詳細統計を計算
      let meetingNoteItemsTotal = 0;
      let meetingNoteItemsEmbedded = 0;
      let meetingNoteTopicsTotal = 0;
      let meetingNoteTopicsEmbedded = 0;
      let meetingNoteTopicsEntities = 0;
      let meetingNoteTopicsRelations = 0;
      
      // 議事録のcontentをパースしてItemIDとトピックを抽出
      const meetingNoteTopicIds = new Set<string>();
      for (const meetingNote of allMeetingNotes) {
        try {
          const meetingNoteData = await getMeetingNoteById(meetingNote.id);
          if (meetingNoteData && meetingNoteData.content) {
            try {
              const contentData = JSON.parse(meetingNoteData.content) as Record<string, MonthContent>;
              for (const [tabId, tabData] of Object.entries(contentData)) {
                if (tabData.items && Array.isArray(tabData.items)) {
                  for (const item of tabData.items) {
                    if (item.id) {
                      meetingNoteItemsTotal++;
                      const itemKey = `${meetingNote.id}-item-${item.id}`;
                      if (embeddedMeetingNoteItemIds.has(itemKey)) {
                        meetingNoteItemsEmbedded++;
                      }
                      
                      // トピックを抽出
                      if (item.topics && Array.isArray(item.topics)) {
                        for (const topic of item.topics) {
                          if (topic.id) {
                            meetingNoteTopicsTotal++;
                            const topicId = topic.id;
                            meetingNoteTopicIds.add(topicId);
                            
                            // トピックの埋め込み状態を確認
                            if (embeddedTopicIds.has(topicId)) {
                              meetingNoteTopicsEmbedded++;
                            }
                            
                            // トピックに紐づくエンティティとリレーションをカウント
                            const topicEmbeddingId = `${meetingNote.id}-topic-${topicId}`;
                            const topicEntities = allEntities.filter((e: any) => {
                              if (!e.metadata) return false;
                              
                              // metadataが文字列の場合はパース
                              let metadataObj: any = e.metadata;
                              if (typeof e.metadata === 'string') {
                                try {
                                  metadataObj = JSON.parse(e.metadata);
                                } catch (parseError) {
                                  return false;
                                }
                              }
                              
                              // metadataがオブジェクトで、topicIdが含まれているか確認
                              if (typeof metadataObj !== 'object' || metadataObj === null) return false;
                              return 'topicId' in metadataObj && metadataObj.topicId === topicId;
                            });
                            meetingNoteTopicsEntities += topicEntities.length;
                            
                            const topicRelations = allRelations.filter((r: any) => {
                              const rTopicId = r.topicid || r.topic_id || r.topicId;
                              return rTopicId && rTopicId === topicEmbeddingId;
                            });
                            meetingNoteTopicsRelations += topicRelations.length;
                          }
                        }
                      }
                    }
                  }
                }
              }
            } catch (parseError) {
              // contentパースエラーは無視
            }
          }
        } catch (error) {
          // 議事録取得エラーは無視
        }
      }
      
      const meetingNoteStats = {
        total: allMeetingNotes.length,
        embedded: allMeetingNotes.filter((m: any) => embeddedMeetingNoteIds.has(m.id)).length,
        missing: allMeetingNotes.filter((m: any) => !embeddedMeetingNoteIds.has(m.id)).length,
        items: {
          total: meetingNoteItemsTotal,
          embedded: meetingNoteItemsEmbedded,
          missing: meetingNoteItemsTotal - meetingNoteItemsEmbedded,
        },
        topics: {
          total: meetingNoteTopicsTotal,
          embedded: meetingNoteTopicsEmbedded,
          missing: meetingNoteTopicsTotal - meetingNoteTopicsEmbedded,
          entities: meetingNoteTopicsEntities,
          relations: meetingNoteTopicsRelations,
        },
      };

      const focusInitiativeStats = {
        total: allFocusInitiatives.length,
        embedded: allFocusInitiatives.filter((f: any) => embeddedFocusInitiativeIds.has(f.id)).length,
        missing: allFocusInitiatives.filter((f: any) => !embeddedFocusInitiativeIds.has(f.id)).length,
      };

      // 制度の詳細統計を計算
      let regulationItemsTotal = 0;
      let regulationItemsEmbedded = 0;
      let regulationTopicsTotal = 0;
      let regulationTopicsEmbedded = 0;
      let regulationTopicsEntities = 0;
      let regulationTopicsRelations = 0;
      
      // 制度のcontentをパースしてItemIDとトピックを抽出
      const regulationTopicIds = new Set<string>();
      for (const regulation of allRegulations) {
        try {
          const regulationData = await getRegulationById(regulation.id);
          if (regulationData && regulationData.content) {
            try {
              const contentData = JSON.parse(regulationData.content) as Record<string, MonthContent>;
              for (const [tabId, tabData] of Object.entries(contentData)) {
                if (tabData.items && Array.isArray(tabData.items)) {
                  for (const item of tabData.items) {
                    if (item.id) {
                      regulationItemsTotal++;
                      const itemKey = `${regulation.id}-item-${item.id}`;
                      if (embeddedRegulationItemIds.has(itemKey)) {
                        regulationItemsEmbedded++;
                      }
                      
                      // トピックを抽出
                      if (item.topics && Array.isArray(item.topics)) {
                        for (const topic of item.topics) {
                          if (topic.id) {
                            regulationTopicsTotal++;
                            const topicId = topic.id;
                            regulationTopicIds.add(topicId);
                            
                            // トピックの埋め込み状態を確認
                            if (embeddedTopicIds.has(topicId)) {
                              regulationTopicsEmbedded++;
                            }
                            
                            // トピックに紐づくエンティティとリレーションをカウント
                            const topicEmbeddingId = `${regulation.id}-topic-${topicId}`;
                            const topicEntities = allEntities.filter((e: any) => {
                              if (!e.metadata) return false;
                              
                              // metadataが文字列の場合はパース
                              let metadataObj: any = e.metadata;
                              if (typeof e.metadata === 'string') {
                                try {
                                  metadataObj = JSON.parse(e.metadata);
                                } catch (parseError) {
                                  return false;
                                }
                              }
                              
                              // metadataがオブジェクトで、topicIdが含まれているか確認
                              if (typeof metadataObj !== 'object' || metadataObj === null) return false;
                              return 'topicId' in metadataObj && metadataObj.topicId === topicId;
                            });
                            regulationTopicsEntities += topicEntities.length;
                            
                            const topicRelations = allRelations.filter((r: any) => {
                              const rTopicId = r.topicid || r.topic_id || r.topicId;
                              return rTopicId && rTopicId === topicEmbeddingId;
                            });
                            regulationTopicsRelations += topicRelations.length;
                          }
                        }
                      }
                    }
                  }
                }
              }
            } catch (parseError) {
              // contentパースエラーは無視
            }
          }
        } catch (error) {
          // 制度取得エラーは無視
        }
      }
      
      const regulationStats = {
        total: allRegulations.length,
        embedded: allRegulations.filter((r: any) => embeddedRegulationIds.has(r.id)).length,
        missing: allRegulations.filter((r: any) => !embeddedRegulationIds.has(r.id)).length,
        items: {
          total: regulationItemsTotal,
          embedded: regulationItemsEmbedded,
          missing: regulationItemsTotal - regulationItemsEmbedded,
        },
        topics: {
          total: regulationTopicsTotal,
          embedded: regulationTopicsEmbedded,
          missing: regulationTopicsTotal - regulationTopicsEmbedded,
          entities: regulationTopicsEntities,
          relations: regulationTopicsRelations,
        },
      };

      setStats({
        entities: entityStats,
        relations: relationStats,
        topics: topicStats,
        startups: startupStats,
        meetingNotes: meetingNoteStats,
        focusInitiatives: focusInitiativeStats,
        regulations: regulationStats,
      });
    } catch (error) {
      console.error('統計情報の取得エラー:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  if (!isOpen) return null;

  const handleExecute = async () => {
    if (!stats) return;
    
    setIsExecuting(true);
    setExecutionProgress({ current: 0, total: 0, category: '', status: 'processing' });
    
    try {
      const supabase = getSupabaseClient();
      
      // 未生成のIDを取得
      const results = await Promise.allSettled([
        supabase.from('entities').select('id, organizationid, companyid'),
        supabase.from('relations').select('id, topicid, organizationid, companyid'),
        supabase.from('topics').select('id, "topicId", "meetingNoteId", "organizationId", "companyId", title, content, description, "semanticCategory", keywords, importance'),
        supabase.from('startups').select('id, "organizationId", "companyId"'),
        supabase.from('meetingnotes').select('id, "organizationId", "companyId"'),
        supabase.from('focusinitiatives').select('id, "organizationId", "companyId"'),
        (async () => {
          try {
            const result = await supabase.from('regulations').select('id, "organizationId"');
            // regulationsテーブルが存在しない場合は空データを返す
            if (result.error && (result.error.code === 'PGRST205' || result.error.message?.includes('Could not find the table'))) {
              return { data: [], error: null };
            }
            return result.error ? { data: [], error: result.error } : result;
          } catch (error: any) {
            // regulationsテーブルが存在しない場合は空データを返す
            return { data: [], error: null };
          }
        })(),
        (async () => {
          try {
            const result = await supabase.from('entity_embeddings').select('entity_id');
            return result.error ? { data: [], error: result.error } : result;
          } catch (error: any) {
            return { data: [], error: null };
          }
        })(),
        (async () => {
          try {
            const result = await supabase.from('relation_embeddings').select('relation_id');
            return result.error ? { data: [], error: result.error } : result;
          } catch (error: any) {
            return { data: [], error: null };
          }
        })(),
        (async () => {
          try {
            const result = await supabase.from('topic_embeddings').select('topic_id');
            return result.error ? { data: [], error: result.error } : result;
          } catch (error: any) {
            return { data: [], error: null };
          }
        })(),
        (async () => {
          try {
            const result = await supabase.from('startup_embeddings').select('startup_id');
            return result.error ? { data: [], error: result.error } : result;
          } catch (error: any) {
            return { data: [], error: null };
          }
        })(),
        (async () => {
          try {
            const result = await supabase.from('meeting_note_embeddings').select('meeting_note_id');
            return result.error ? { data: [], error: result.error } : result;
          } catch (error: any) {
            return { data: [], error: null };
          }
        })(),
        (async () => {
          try {
            const result = await supabase.from('focus_initiative_embeddings').select('focus_initiative_id');
            return result.error ? { data: [], error: result.error } : result;
          } catch (error: any) {
            return { data: [], error: null };
          }
        })(),
        (async () => {
          try {
            const result = await supabase.from('regulation_embeddings').select('regulation_id');
            // regulationsテーブルが存在しない場合は空データを返す
            if (result.error && (result.error.code === 'PGRST205' || result.error.message?.includes('Could not find the table') || result.error.message?.includes('does not exist'))) {
              return { data: [], error: null };
            }
            return result.error ? { data: [], error: result.error } : result;
          } catch (error: any) {
            return { data: [], error: null };
          }
        })(),
        (async () => {
          try {
            return await supabase.from('regulation_item_embeddings').select('regulation_id, item_id');
          } catch (error: any) {
            return { data: [], error: error };
          }
        })(),
      ]);

      // 結果を展開
      const [
        entitiesResultFinal,
        relationsResultFinal,
        topicsResultFinal,
        startupsResultFinal,
        meetingNotesResultFinal,
        focusInitiativesResultFinal,
        regulationsResultFinal,
        entityEmbeddingsResultFinal,
        relationEmbeddingsResultFinal,
        topicEmbeddingsResultFinal,
        startupEmbeddingsResultFinal,
        meetingNoteEmbeddingsResultFinal,
        focusInitiativeEmbeddingsResultFinal,
        regulationEmbeddingsResultFinal,
        regulationItemEmbeddingsResultFinal,
      ] = results.map((result: any, index: number) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          const tableNames = ['entities', 'relations', 'topics', 'startups', 'meetingnotes', 'focusinitiatives', 'regulations', 'entity_embeddings', 'relation_embeddings', 'topic_embeddings', 'startup_embeddings', 'meeting_note_embeddings', 'focus_initiative_embeddings', 'regulation_embeddings', 'regulation_item_embeddings'];
          console.error(`❌ [埋め込み実行] ${tableNames[index]}取得エラー:`, result.reason);
          return { data: [], error: result.reason };
        }
      });

      // エラーチェック
      if (entitiesResultFinal.error) {
        console.error('❌ [埋め込み実行] entities取得エラー:', entitiesResultFinal.error);
      }
      if (topicsResultFinal.error) {
        console.error('❌ [埋め込み実行] topics取得エラー:', topicsResultFinal.error);
      }
      if (startupsResultFinal.error) {
        console.error('❌ [埋め込み実行] startups取得エラー:', startupsResultFinal.error);
      }
      if (meetingNotesResultFinal.error) {
        console.error('❌ [埋め込み実行] meetingnotes取得エラー:', meetingNotesResultFinal.error);
      }
      if (focusInitiativesResultFinal.error) {
        console.error('❌ [埋め込み実行] focusinitiatives取得エラー:', focusInitiativesResultFinal.error);
      }
      if (regulationsResultFinal.error) {
        // regulationsテーブルが存在しない場合はエラーを無視
        if (!regulationsResultFinal.error.message?.includes('Could not find the table') && 
            !regulationsResultFinal.error.message?.includes('does not exist') &&
            regulationsResultFinal.error.code !== 'PGRST205') {
          console.error('❌ [埋め込み実行] regulations取得エラー:', regulationsResultFinal.error);
        }
      }
      if (regulationEmbeddingsResultFinal.error && !regulationEmbeddingsResultFinal.error.message?.includes('does not exist') && regulationEmbeddingsResultFinal.error.code !== 'PGRST205') {
        console.error('❌ [埋め込み実行] regulation_embeddings取得エラー:', regulationEmbeddingsResultFinal.error);
      }
      if (regulationItemEmbeddingsResultFinal.error && !regulationItemEmbeddingsResultFinal.error.message?.includes('does not exist') && regulationItemEmbeddingsResultFinal.error.code !== 'PGRST205') {
        console.error('❌ [埋め込み実行] regulation_item_embeddings取得エラー:', regulationItemEmbeddingsResultFinal.error);
      }

      // 埋め込み済みIDのセット
      const embeddedEntityIds = new Set((entityEmbeddingsResultFinal.data || []).map((e: any) => e.entity_id));
      const embeddedRelationIds = new Set((relationEmbeddingsResultFinal.data || []).map((r: any) => r.relation_id));
      const embeddedTopicIds = new Set((topicEmbeddingsResultFinal.data || []).map((t: any) => t.topic_id));
      const embeddedStartupIds = new Set((startupEmbeddingsResultFinal.data || []).map((s: any) => s.startup_id));
      const embeddedMeetingNoteIds = new Set((meetingNoteEmbeddingsResultFinal.data || []).map((m: any) => m.meeting_note_id));
      const embeddedFocusInitiativeIds = new Set((focusInitiativeEmbeddingsResultFinal.data || []).map((f: any) => f.focus_initiative_id));
      const embeddedRegulationIds = new Set((regulationEmbeddingsResultFinal.data || []).map((r: any) => r.regulation_id));

      // 未生成のIDを抽出
      const missingEntityIds = (entitiesResultFinal.data || [])
        .filter((e: any) => !embeddedEntityIds.has(e.id))
        .map((e: any) => ({ id: e.id, organizationId: e.organizationid || e.organizationId || '', companyId: e.companyid || e.companyId || null }));
      
      const missingRelationIds = (relationsResultFinal.data || [])
        .filter((r: any) => {
          const topicId = r.topicid || r.topic_id || r.topicId;
          return !!topicId && !embeddedRelationIds.has(r.id);
        })
        .map((r: any) => ({ 
          id: r.id, 
          topicId: r.topicid || r.topic_id || r.topicId,
          organizationId: r.organizationid || r.organizationId || '',
          companyId: r.companyid || r.companyId || null,
        }));
      
      const missingTopicIds = (topicsResultFinal.data || [])
        .filter((t: any) => {
          // topic_embeddingsテーブルのtopic_idはtopics.topicIdを参照している
          const topicId = t.topicid || t.topicId || t["topicId"];
          return topicId && !embeddedTopicIds.has(topicId);
        })
        .map((t: any) => {
          const topicId = t.topicid || t.topicId || t["topicId"];
          return {
            id: topicId, // 実際のトピックID
            embeddingId: t.id, // 埋め込みID（${meetingNoteId}-topic-${topicId}）
            meetingNoteId: t.meetingnoteid || t.meetingNoteId || t["meetingNoteId"],
            regulationId: t.regulationid || t.regulationId || t["regulationId"],
            organizationId: t.organizationid || t.organizationId || t["organizationId"] || '',
            companyId: t.companyid || t.companyId || t["companyId"] || null,
            title: t.title || '',
            content: t.content || '',
            description: t.description || '',
            semanticCategory: t.semanticcategory || t.semanticCategory || t["semanticCategory"],
            keywords: t.keywords ? (typeof t.keywords === 'string' ? JSON.parse(t.keywords) : t.keywords) : undefined,
            importance: t.importance,
          };
        });
      
      const missingStartupIds = (startupsResultFinal.data || [])
        .filter((s: any) => !embeddedStartupIds.has(s.id))
        .map((s: any) => ({ 
          id: s.id, 
          organizationId: s.organizationId || s.organizationid || '', 
          companyId: s.companyId || s.companyid || null 
        }));
      
      const missingMeetingNoteIds = (meetingNotesResultFinal.data || [])
        .filter((m: any) => !embeddedMeetingNoteIds.has(m.id))
        .map((m: any) => ({ id: m.id, organizationId: m.organizationId || m.organizationid || '', companyId: m.companyId || m.companyid || null }));
      
      const missingFocusInitiativeIds = (focusInitiativesResultFinal.data || [])
        .filter((f: any) => !embeddedFocusInitiativeIds.has(f.id))
        .map((f: any) => ({ id: f.id, organizationId: f.organizationId || f.organizationid || '', companyId: f.companyId || f.companyid || null }));
      
      // regulationsテーブルが存在しない場合は空配列を返す
      const missingRegulationIds = (regulationsResultFinal.error && 
        (regulationsResultFinal.error.message?.includes('Could not find the table') || 
         regulationsResultFinal.error.message?.includes('does not exist') ||
         regulationsResultFinal.error.code === 'PGRST205'))
        ? []
        : (regulationsResultFinal.data || [])
            .filter((r: any) => !embeddedRegulationIds.has(r.id))
            .map((r: any) => ({ id: r.id, organizationId: r.organizationid || r.organizationId || '' }));

      // デバッグログ
      console.log('🔍 [埋め込み実行] 未生成IDの抽出結果:', {
        entities: { total: entitiesResultFinal.data?.length || 0, missing: missingEntityIds.length },
        relations: { total: relationsResultFinal.data?.length || 0, missing: missingRelationIds.length },
        topics: { total: topicsResultFinal.data?.length || 0, missing: missingTopicIds.length, sample: topicsResultFinal.data?.[0] },
        startups: { total: startupsResultFinal.data?.length || 0, missing: missingStartupIds.length },
        meetingNotes: { total: meetingNotesResultFinal.data?.length || 0, missing: missingMeetingNoteIds.length },
        focusInitiatives: { total: focusInitiativesResultFinal.data?.length || 0, missing: missingFocusInitiativeIds.length },
        regulations: { total: regulationsResultFinal.data?.length || 0, missing: missingRegulationIds.length },
      });

      // 総数を計算
      const totalMissing = 
        missingEntityIds.length +
        missingRelationIds.length +
        missingTopicIds.length +
        missingStartupIds.length +
        missingMeetingNoteIds.length +
        missingFocusInitiativeIds.length +
        missingRegulationIds.length;

      let processedCount = 0;

      // エンティティの埋め込み生成
      setExecutionProgress({ current: processedCount, total: totalMissing, category: 'エンティティ', status: 'processing' });
      for (const { id, organizationId } of missingEntityIds) {
        try {
          const entity = await getEntityById(id);
          if (entity && (entity.organizationId || organizationId)) {
            await saveEntityEmbeddingAsync(id, entity.organizationId || organizationId);
          }
        } catch (error) {
          console.error(`エンティティ ${id} の埋め込み生成エラー:`, error);
        }
        processedCount++;
        setExecutionProgress({ current: processedCount, total: totalMissing, category: 'エンティティ', status: 'processing' });
      }

      // リレーションの埋め込み生成
      setExecutionProgress({ current: processedCount, total: totalMissing, category: 'リレーション', status: 'processing' });
      for (const { id, topicId, organizationId } of missingRelationIds) {
        try {
          const relation = await getRelationById(id);
          if (relation && (relation.organizationId || organizationId)) {
            await saveRelationEmbeddingAsync(id, topicId, relation.organizationId || organizationId);
          }
        } catch (error) {
          console.error(`リレーション ${id} の埋め込み生成エラー:`, error);
        }
        processedCount++;
        setExecutionProgress({ current: processedCount, total: totalMissing, category: 'リレーション', status: 'processing' });
      }

      // トピックの埋め込み生成
      setExecutionProgress({ current: processedCount, total: totalMissing, category: 'トピック', status: 'processing' });
      for (const topic of missingTopicIds) {
        try {
          if (topic.organizationId && (topic.meetingNoteId || topic.regulationId)) {
            console.log('🔍 [埋め込み実行] トピック埋め込み開始:', {
              topicId: topic.id,
              meetingNoteId: topic.meetingNoteId,
              regulationId: topic.regulationId,
              organizationId: topic.organizationId,
            });
            // topic.idは実際のトピックID、topic.embeddingIdは埋め込みID
            await saveTopicEmbeddingAsync(
              topic.id, // 実際のトピックID
              topic.meetingNoteId,
              topic.organizationId,
              topic.title,
              topic.content,
              {
                keywords: topic.keywords,
                semanticCategory: topic.semanticCategory,
                summary: topic.description,
                importance: topic.importance,
              },
              topic.regulationId
            );
            console.log('✅ [埋め込み実行] トピック埋め込み成功:', topic.id);
          } else {
            console.warn('⚠️ [埋め込み実行] トピック埋め込みスキップ:', {
              topicId: topic.id,
              organizationId: topic.organizationId,
              meetingNoteId: topic.meetingNoteId,
              regulationId: topic.regulationId,
            });
          }
        } catch (error) {
          console.error(`❌ [埋め込み実行] トピック ${topic.id} の埋め込み生成エラー:`, error);
        }
        processedCount++;
        setExecutionProgress({ current: processedCount, total: totalMissing, category: 'トピック', status: 'processing' });
      }

      // スタートアップの埋め込み生成
      setExecutionProgress({ current: processedCount, total: totalMissing, category: 'スタートアップ', status: 'processing' });
      for (const { id, organizationId } of missingStartupIds) {
        try {
          if (organizationId) {
            console.log('🔍 [埋め込み実行] スタートアップ埋め込み開始:', { id, organizationId });
            await saveStartupEmbeddingAsync(id, organizationId);
            console.log('✅ [埋め込み実行] スタートアップ埋め込み成功:', id);
          } else {
            console.warn('⚠️ [埋め込み実行] スタートアップ埋め込みスキップ（organizationIdなし）:', id);
          }
        } catch (error) {
          console.error(`❌ [埋め込み実行] スタートアップ ${id} の埋め込み生成エラー:`, error);
        }
        processedCount++;
        setExecutionProgress({ current: processedCount, total: totalMissing, category: 'スタートアップ', status: 'processing' });
      }

      // 議事録の埋め込み生成（MeetingID単位 + ItemID単位）
      setExecutionProgress({ current: processedCount, total: totalMissing, category: '議事録', status: 'processing' });
      for (const { id, organizationId } of missingMeetingNoteIds) {
        try {
          if (organizationId) {
            console.log('🔍 [埋め込み実行] 議事録埋め込み開始:', { id, organizationId });
            // MeetingID単位の埋め込み生成
            await saveMeetingNoteEmbeddingAsync(id, organizationId);
            console.log('✅ [埋め込み実行] 議事録埋め込み成功:', id);
            
            // ItemID単位の埋め込み生成
            const meetingNote = await getMeetingNoteById(id);
            if (meetingNote && meetingNote.content) {
              try {
                const contentData = JSON.parse(meetingNote.content) as Record<string, MonthContent>;
                for (const [tabId, tabData] of Object.entries(contentData)) {
                  if (tabData.items && Array.isArray(tabData.items)) {
                    for (const item of tabData.items) {
                      if (item.id && item.title && item.content) {
                        try {
                          await saveMeetingNoteItemEmbeddingAsync(
                            id,
                            item.id,
                            organizationId,
                            {
                              title: item.title,
                              content: item.content,
                            }
                          );
                        } catch (itemError) {
                          console.error(`議事録アイテム ${id}, ${item.id} の埋め込み生成エラー:`, itemError);
                        }
                      }
                    }
                  }
                }
              } catch (parseError) {
                console.warn(`議事録 ${id} のcontentパースエラー（続行）:`, parseError);
              }
            }
          } else {
            console.warn('⚠️ [埋め込み実行] 議事録埋め込みスキップ（organizationIdなし）:', id);
          }
        } catch (error) {
          console.error(`❌ [埋め込み実行] 議事録 ${id} の埋め込み生成エラー:`, error);
        }
        processedCount++;
        setExecutionProgress({ current: processedCount, total: totalMissing, category: '議事録', status: 'processing' });
      }

      // 注力施策の埋め込み生成
      setExecutionProgress({ current: processedCount, total: totalMissing, category: '注力施策', status: 'processing' });
      for (const { id, organizationId } of missingFocusInitiativeIds) {
        try {
          if (organizationId) {
            console.log('🔍 [埋め込み実行] 注力施策埋め込み開始:', { id, organizationId });
            await saveFocusInitiativeEmbeddingAsync(id, organizationId);
            console.log('✅ [埋め込み実行] 注力施策埋め込み成功:', id);
          } else {
            console.warn('⚠️ [埋め込み実行] 注力施策埋め込みスキップ（organizationIdなし）:', id);
          }
        } catch (error) {
          console.error(`❌ [埋め込み実行] 注力施策 ${id} の埋め込み生成エラー:`, error);
        }
        processedCount++;
        setExecutionProgress({ current: processedCount, total: totalMissing, category: '注力施策', status: 'processing' });
      }

      // 制度の埋め込み生成（RegulationID単位 + ItemID単位）
      setExecutionProgress({ current: processedCount, total: totalMissing, category: '制度', status: 'processing' });
      for (const { id, organizationId } of missingRegulationIds) {
        try {
          if (organizationId) {
            console.log('🔍 [埋め込み実行] 制度埋め込み開始:', { id, organizationId });
            // RegulationID単位の埋め込み生成
            try {
              await saveRegulationEmbeddingAsync(id, organizationId);
              console.log('✅ [埋め込み実行] 制度埋め込み成功:', id);
            } catch (regError: any) {
              // regulationsテーブルが存在しない場合はスキップして続行
              if (regError?.message?.includes('Could not find the table') || 
                  regError?.message?.includes('does not exist') ||
                  regError?.code === 'PGRST205' ||
                  regError?.status === 404) {
                console.warn(`⚠️ [埋め込み実行] 制度埋め込みスキップ（regulationsテーブルが存在しない）:`, id);
                processedCount++;
                setExecutionProgress({ current: processedCount, total: totalMissing, category: '制度', status: 'processing' });
                continue;
              }
              throw regError;
            }
            
            // ItemID単位の埋め込み生成
            try {
              const regulation = await getRegulationById(id);
              if (regulation && regulation.content) {
                try {
                  const contentData = JSON.parse(regulation.content) as Record<string, MonthContent>;
                  for (const [tabId, tabData] of Object.entries(contentData)) {
                    if (tabData.items && Array.isArray(tabData.items)) {
                      for (const item of tabData.items) {
                        if (item.id && item.title && item.content) {
                          try {
                            await saveRegulationItemEmbeddingAsync(
                              id,
                              item.id,
                              organizationId,
                              {
                                title: item.title,
                                content: item.content,
                              }
                            );
                          } catch (itemError) {
                            console.error(`制度アイテム ${id}, ${item.id} の埋め込み生成エラー:`, itemError);
                          }
                        }
                      }
                    }
                  }
                } catch (parseError) {
                  console.warn(`制度 ${id} のcontentパースエラー（続行）:`, parseError);
                }
              }
            } catch (getError: any) {
              // regulationsテーブルが存在しない場合はスキップして続行
              if (getError?.message?.includes('Could not find the table') || 
                  getError?.message?.includes('does not exist') ||
                  getError?.code === 'PGRST205' ||
                  getError?.status === 404) {
                console.warn(`⚠️ [埋め込み実行] 制度取得スキップ（regulationsテーブルが存在しない）:`, id);
                // エラーを無視して続行
              } else {
                throw getError;
              }
            }
          } else {
            console.warn('⚠️ [埋め込み実行] 制度埋め込みスキップ（organizationIdなし）:', id);
          }
        } catch (error) {
          console.error(`❌ [埋め込み実行] 制度 ${id} の埋め込み生成エラー:`, error);
        }
        processedCount++;
        setExecutionProgress({ current: processedCount, total: totalMissing, category: '制度', status: 'processing' });
      }

      setExecutionProgress({ current: processedCount, total: totalMissing, category: '完了', status: 'completed' });
      
      // 統計情報を再読み込み
      await loadStats();
      
      // 完了メッセージを表示
      setTimeout(() => {
        setExecutionProgress({ current: 0, total: 0, category: '', status: 'idle' });
      }, 2000);
    } catch (error) {
      console.error('埋め込み実行エラー:', error);
      setExecutionProgress({ current: 0, total: 0, category: '', status: 'error' });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '1000px',
          width: '90%',
          maxHeight: '85vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>
          埋め込み実行
        </h2>
        
        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
            エンティティ、リレーション、トピック、スタートアップ、議事録、注力施策、制度の埋め込みを生成・更新します。
          </p>
          
          {/* 統計情報 */}
          {isLoadingStats ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
              統計情報を読み込み中...
            </div>
          ) : stats ? (
            <div style={{ 
              border: '1px solid #E5E7EB', 
              borderRadius: '8px', 
              overflow: 'hidden',
              backgroundColor: '#FFFFFF'
            }}>
              {/* テーブルヘッダー */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                gap: '16px',
                padding: '16px 20px',
                backgroundColor: '#F9FAFB',
                borderBottom: '2px solid #E5E7EB',
                fontWeight: 600,
                fontSize: '14px',
                color: '#374151',
              }}>
                <div>カテゴリ</div>
                <div style={{ textAlign: 'right' }}>全数</div>
                <div style={{ textAlign: 'right' }}>埋め込み済み</div>
                <div style={{ textAlign: 'right' }}>未生成</div>
              </div>
              
              {/* テーブルボディ */}
              <div>
                {/* エンティティ */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  gap: '16px',
                  padding: '16px 20px',
                  borderBottom: '1px solid #F3F4F6',
                  fontSize: '14px',
                }}>
                  <div style={{ fontWeight: 500, color: '#1F2937' }}>エンティティ</div>
                  <div style={{ textAlign: 'right', color: '#374151' }}>{stats.entities.total}</div>
                  <div style={{ textAlign: 'right', color: '#10B981', fontWeight: 600 }}>{stats.entities.embedded}</div>
                  <div style={{ textAlign: 'right', color: '#EF4444', fontWeight: 600 }}>{stats.entities.missing}</div>
                </div>

                {/* リレーション */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  gap: '16px',
                  padding: '16px 20px',
                  borderBottom: '1px solid #F3F4F6',
                  fontSize: '14px',
                }}>
                  <div style={{ fontWeight: 500, color: '#1F2937' }}>リレーション</div>
                  <div style={{ textAlign: 'right', color: '#374151' }}>{stats.relations.total}</div>
                  <div style={{ textAlign: 'right', color: '#10B981', fontWeight: 600 }}>{stats.relations.embedded}</div>
                  <div style={{ textAlign: 'right', color: '#EF4444', fontWeight: 600 }}>{stats.relations.missing}</div>
                </div>

                {/* トピック */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  gap: '16px',
                  padding: '16px 20px',
                  borderBottom: '1px solid #F3F4F6',
                  fontSize: '14px',
                }}>
                  <div style={{ fontWeight: 500, color: '#1F2937' }}>トピック</div>
                  <div style={{ textAlign: 'right', color: '#374151' }}>{stats.topics.total}</div>
                  <div style={{ textAlign: 'right', color: '#10B981', fontWeight: 600 }}>{stats.topics.embedded}</div>
                  <div style={{ textAlign: 'right', color: '#EF4444', fontWeight: 600 }}>{stats.topics.missing}</div>
                </div>

                {/* スタートアップ */}
                <div style={{
                  borderBottom: '1px solid #F3F4F6',
                }}>
                  {/* スタートアップ（StartupID単位） */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    gap: '16px',
                    padding: '16px 20px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                  }}>
                    <div style={{ fontWeight: 500, color: '#1F2937' }}>スタートアップ</div>
                    <div style={{ textAlign: 'right', color: '#374151' }}>{stats.startups.total}</div>
                    <div style={{ textAlign: 'right', color: '#10B981', fontWeight: 600 }}>{stats.startups.embedded}</div>
                    <div style={{ textAlign: 'right', color: '#EF4444', fontWeight: 600 }}>{stats.startups.missing}</div>
                  </div>
                </div>

                {/* 注力施策 */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  gap: '16px',
                  padding: '16px 20px',
                  borderBottom: '1px solid #F3F4F6',
                  fontSize: '14px',
                }}>
                  <div style={{ fontWeight: 500, color: '#1F2937' }}>注力施策</div>
                  <div style={{ textAlign: 'right', color: '#374151' }}>{stats.focusInitiatives.total}</div>
                  <div style={{ textAlign: 'right', color: '#10B981', fontWeight: 600 }}>{stats.focusInitiatives.embedded}</div>
                  <div style={{ textAlign: 'right', color: '#EF4444', fontWeight: 600 }}>{stats.focusInitiatives.missing}</div>
                </div>

                {/* 議事録 */}
                <div style={{
                  borderBottom: '1px solid #F3F4F6',
                }}>
                  {/* 議事録（MeetingID単位） */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    gap: '16px',
                    padding: '16px 20px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                  }}>
                    <div style={{ fontWeight: 500, color: '#1F2937' }}>議事録</div>
                    <div style={{ textAlign: 'right', color: '#374151' }}>{stats.meetingNotes.total}</div>
                    <div style={{ textAlign: 'right', color: '#10B981', fontWeight: 600 }}>{stats.meetingNotes.embedded}</div>
                    <div style={{ textAlign: 'right', color: '#EF4444', fontWeight: 600 }}>{stats.meetingNotes.missing}</div>
                  </div>
                  
                  {/* 議事録アイテム（ItemID単位） */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    gap: '16px',
                    padding: '12px 20px 12px 40px',
                    fontSize: '13px',
                    backgroundColor: '#FAFAFA',
                  }}>
                    <div style={{ color: '#6B7280' }}>└ アイテム</div>
                    <div style={{ textAlign: 'right', color: '#6B7280' }}>{stats.meetingNotes.items.total}</div>
                    <div style={{ textAlign: 'right', color: '#10B981', fontWeight: 500 }}>{stats.meetingNotes.items.embedded}</div>
                    <div style={{ textAlign: 'right', color: '#EF4444', fontWeight: 500 }}>{stats.meetingNotes.items.missing}</div>
                  </div>
                  
                  {/* 議事録トピック */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    gap: '16px',
                    padding: '12px 20px 12px 40px',
                    fontSize: '13px',
                    backgroundColor: '#FAFAFA',
                  }}>
                    <div style={{ color: '#6B7280' }}>└ トピック</div>
                    <div style={{ textAlign: 'right', color: '#6B7280' }}>{stats.meetingNotes.topics.total}</div>
                    <div style={{ textAlign: 'right', color: '#10B981', fontWeight: 500 }}>{stats.meetingNotes.topics.embedded}</div>
                    <div style={{ textAlign: 'right', color: '#EF4444', fontWeight: 500 }}>{stats.meetingNotes.topics.missing}</div>
                  </div>
                  
                </div>

                {/* 制度 */}
                <div style={{
                  borderBottom: '1px solid #F3F4F6',
                }}>
                  {/* 制度（RegulationID単位） */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    gap: '16px',
                    padding: '16px 20px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                  }}>
                    <div style={{ fontWeight: 500, color: '#1F2937' }}>制度</div>
                    <div style={{ textAlign: 'right', color: '#374151' }}>{stats.regulations.total}</div>
                    <div style={{ textAlign: 'right', color: '#10B981', fontWeight: 600 }}>{stats.regulations.embedded}</div>
                    <div style={{ textAlign: 'right', color: '#EF4444', fontWeight: 600 }}>{stats.regulations.missing}</div>
                  </div>
                  
                  {/* 制度アイテム（ItemID単位） */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    gap: '16px',
                    padding: '12px 20px 12px 40px',
                    fontSize: '13px',
                    backgroundColor: '#FAFAFA',
                  }}>
                    <div style={{ color: '#6B7280' }}>└ アイテム</div>
                    <div style={{ textAlign: 'right', color: '#6B7280' }}>{stats.regulations.items.total}</div>
                    <div style={{ textAlign: 'right', color: '#10B981', fontWeight: 500 }}>{stats.regulations.items.embedded}</div>
                    <div style={{ textAlign: 'right', color: '#EF4444', fontWeight: 500 }}>{stats.regulations.items.missing}</div>
                  </div>
                  
                  {/* 制度トピック */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    gap: '16px',
                    padding: '12px 20px 12px 40px',
                    fontSize: '13px',
                    backgroundColor: '#FAFAFA',
                  }}>
                    <div style={{ color: '#6B7280' }}>└ トピック</div>
                    <div style={{ textAlign: 'right', color: '#6B7280' }}>{stats.regulations.topics.total}</div>
                    <div style={{ textAlign: 'right', color: '#10B981', fontWeight: 500 }}>{stats.regulations.topics.embedded}</div>
                    <div style={{ textAlign: 'right', color: '#EF4444', fontWeight: 500 }}>{stats.regulations.topics.missing}</div>
                  </div>
                  
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#EF4444' }}>
              統計情報の取得に失敗しました
            </div>
          )}
          
          {/* 実行進捗表示 */}
          {isExecuting && executionProgress.total > 0 && (
            <div style={{ 
              marginTop: '24px', 
              padding: '16px', 
              backgroundColor: '#F9FAFB', 
              borderRadius: '8px',
              border: '1px solid #E5E7EB'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                  {executionProgress.category} を処理中...
                </span>
                <span style={{ fontSize: '14px', color: '#6B7280' }}>
                  {executionProgress.current} / {executionProgress.total}
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#E5E7EB',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${executionProgress.total > 0 ? (executionProgress.current / executionProgress.total) * 100 : 0}%`,
                  height: '100%',
                  backgroundColor: executionProgress.status === 'completed' ? '#10B981' : '#3B82F6',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}
          
          {executionProgress.status === 'completed' && !isExecuting && (
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              backgroundColor: '#D1FAE5', 
              borderRadius: '6px',
              border: '1px solid #10B981',
              color: '#065F46',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              埋め込み生成が完了しました
            </div>
          )}
          
          {executionProgress.status === 'error' && !isExecuting && (
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              backgroundColor: '#FEE2E2', 
              borderRadius: '6px',
              border: '1px solid #EF4444',
              color: '#991B1B',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              埋め込み生成中にエラーが発生しました
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={isExecuting}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              color: '#6B7280',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: isExecuting ? 'not-allowed' : 'pointer',
              opacity: isExecuting ? 0.5 : 1,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleExecute}
            disabled={isExecuting}
            style={{
              padding: '8px 16px',
              backgroundColor: isExecuting ? '#D1D5DB' : '#10B981',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: isExecuting ? 'not-allowed' : 'pointer',
              fontWeight: 500,
            }}
          >
            {isExecuting ? '実行中...' : '実行'}
          </button>
        </div>
      </div>
    </div>
  );
}

