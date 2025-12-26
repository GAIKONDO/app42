import { useState, useEffect } from 'react';
import type { Agent } from '@/lib/agent-system/types';
import { loadAllAgents } from '@/lib/agent-system/agentStorage';
import { agentRegistry } from '@/lib/agent-system/agentRegistry';

export function useAgentSelector() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiAssistantSelectedAgentId');
      // IDだけ保存されているので、後でAgent一覧から取得する
      return null;
    }
    return null;
  });

  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Agent一覧を読み込む
  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoadingAgents(true);
      console.log('[useAgentSelector] Agent一覧の読み込みを開始...');
      
      // まず、メモリ内のAgent定義を取得（Agent管理ページと同じ方法）
      let agents = agentRegistry.getAllDefinitions();
      console.log('[useAgentSelector] メモリ内のAgent数:', agents.length, '件');
      
      // メモリ内にAgentがない場合、データベースから読み込む
      if (agents.length === 0) {
        console.log('[useAgentSelector] メモリ内にAgentがないため、データベースから読み込みます...');
        agents = await loadAllAgents();
        console.log('[useAgentSelector] データベースから取得したAgent数:', agents.length, '件');
      }
      
      console.log('[useAgentSelector] 取得したAgent一覧:', agents.length, '件');
      console.log('[useAgentSelector] Agent詳細:', agents.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        role: a.role,
      })));
      
      // 議事録Agentが含まれているか確認
      const meetingNoteAgent = agents.find(a => a.id === 'meeting-note-agent');
      if (!meetingNoteAgent) {
        console.warn('[useAgentSelector] ⚠️ 議事録Agentが見つかりません。');
      } else {
        console.log('[useAgentSelector] ✅ 議事録Agentが見つかりました:', meetingNoteAgent.name);
      }
      
      setAvailableAgents(agents);

      // 保存されているAgent IDがあれば、Agent一覧から取得して設定
      if (typeof window !== 'undefined') {
        const savedAgentId = localStorage.getItem('aiAssistantSelectedAgentId');
        if (savedAgentId && agents.length > 0) {
          const agent = agents.find(a => a.id === savedAgentId);
          if (agent) {
            setSelectedAgent(agent);
          } else {
            // 保存されているAgent IDが見つからない場合はクリア
            localStorage.removeItem('aiAssistantSelectedAgentId');
          }
        }
      }
    } catch (error) {
      console.error('Agent一覧の取得エラー:', error);
    } finally {
      setLoadingAgents(false);
    }
  };

  // 選択されたAgentが変更されたら保存
  useEffect(() => {
    if (selectedAgent) {
      localStorage.setItem('aiAssistantSelectedAgentId', selectedAgent.id);
    } else {
      localStorage.removeItem('aiAssistantSelectedAgentId');
    }
  }, [selectedAgent]);

  return {
    selectedAgent,
    setSelectedAgent,
    showAgentSelector,
    setShowAgentSelector,
    availableAgents,
    loadingAgents,
    loadAgents,
  };
}

