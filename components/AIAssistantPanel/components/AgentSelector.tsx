import React, { useRef } from 'react';
import { FiUser, FiSettings } from 'react-icons/fi';
import type { Agent } from '@/lib/agent-system/types';

interface AgentSelectorProps {
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent | null) => void;
  showAgentSelector: boolean;
  setShowAgentSelector: (show: boolean) => void;
  availableAgents: Agent[];
  loadingAgents: boolean;
  onReload?: () => void;
}

export function AgentSelector({
  selectedAgent,
  setSelectedAgent,
  showAgentSelector,
  setShowAgentSelector,
  availableAgents,
  loadingAgents,
  onReload,
}: AgentSelectorProps) {
  const agentSelectorRef = useRef<HTMLDivElement>(null);

  // Agentセレクターの外側をクリックしたら閉じる
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (agentSelectorRef.current && !agentSelectorRef.current.contains(event.target as Node)) {
        setShowAgentSelector(false);
      }
    };

    if (showAgentSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showAgentSelector, setShowAgentSelector]);

  return (
    <div ref={agentSelectorRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setShowAgentSelector(!showAgentSelector)}
        style={{
          background: showAgentSelector ? 'rgba(139, 92, 246, 0.2)' : 'none',
          border: showAgentSelector ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent',
          color: showAgentSelector ? '#A78BFA' : 'rgba(255, 255, 255, 0.6)',
          cursor: 'pointer',
          padding: '6px 8px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (!showAgentSelector) {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (!showAgentSelector) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
            e.currentTarget.style.borderColor = 'transparent';
          }
        }}
        title={selectedAgent ? `Agent: ${selectedAgent.name}` : 'Agentを選択'}
      >
        <FiUser size={16} />
        {showAgentSelector && selectedAgent && (
          <span style={{ fontSize: '10px', fontWeight: 500 }}>
            {selectedAgent.name.length > 10 ? selectedAgent.name.substring(0, 10) + '...' : selectedAgent.name}
          </span>
        )}
      </button>

      {/* Agent選択ポップオーバー */}
      {showAgentSelector && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: '8px',
            width: '360px',
            maxHeight: '400px',
            backgroundColor: '#2a2a2a',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            zIndex: 1001,
            overflowY: 'auto',
          }}
        >
          {/* ヘッダー */}
          <div style={{ 
            marginBottom: '12px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.9)',
            }}>
              <FiSettings size={14} />
              <span>Agentを選択</span>
            </label>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onReload) {
                  onReload();
                }
              }}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
              }}
              title="再読み込み"
            >
              🔄
            </button>
          </div>

          {/* ローディング状態 */}
          {loadingAgents && (
            <div style={{
              padding: '16px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '12px',
            }}>
              🔄 Agent一覧を読み込み中...
            </div>
          )}

          {/* Agent一覧 */}
          {!loadingAgents && (
            <>
              {/* 「なし」オプション */}
              <button
                onClick={() => {
                  setSelectedAgent(null);
                  setShowAgentSelector(false);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  marginBottom: '8px',
                  backgroundColor: selectedAgent === null ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${selectedAgent === null ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '13px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (selectedAgent !== null) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedAgent !== null) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }
                }}
              >
                <div style={{ fontWeight: 500 }}>なし（通常モード）</div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px' }}>
                  Agentを使用しない
                </div>
              </button>

              {/* Agent一覧 */}
              {availableAgents.length === 0 ? (
                <div style={{
                  padding: '16px',
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '12px',
                }}>
                  Agentが登録されていません
                  <div style={{ marginTop: '8px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.3)' }}>
                    /agents ページでAgentを作成してください
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {availableAgents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgent(agent);
                        setShowAgentSelector(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: selectedAgent?.id === agent.id ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${selectedAgent?.id === agent.id ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '6px',
                        color: '#ffffff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedAgent?.id !== agent.id) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedAgent?.id !== agent.id) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        }
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginBottom: '4px',
                      }}>
                        <FiUser size={14} style={{ flexShrink: 0 }} />
                        <div style={{ fontWeight: 600, fontSize: '13px', flex: 1 }}>
                          {agent.name}
                        </div>
                      </div>
                      {agent.description && (
                        <div style={{ 
                          fontSize: '11px', 
                          color: 'rgba(255, 255, 255, 0.6)', 
                          marginTop: '4px',
                          lineHeight: '1.4',
                        }}>
                          {agent.description}
                        </div>
                      )}
                      {agent.role && (
                        <div style={{ 
                          fontSize: '10px', 
                          color: 'rgba(255, 255, 255, 0.4)', 
                          marginTop: '4px',
                          fontStyle: 'italic',
                        }}>
                          ロール: {agent.role}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

