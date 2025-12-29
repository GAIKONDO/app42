'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Startup } from '@/lib/orgApi';

interface StartupsTabProps {
  organizationId: string;
  startups: Startup[];
  startupsByOrg: Map<string, { orgName: string; startups: Startup[] }>;
  expandedOrgIds: Set<string>;
  setExpandedOrgIds: (ids: Set<string>) => void;
  editingStartupId: string | null;
  editingStartupTitle: string;
  setEditingStartupTitle: (title: string) => void;
  savingStartup: boolean;
  tabRef: React.RefObject<HTMLDivElement>;
  onDownloadImage: (tabType: 'introduction' | 'focusAreas' | 'focusInitiatives' | 'meetingNotes' | 'regulations' | 'startups') => void;
  onOpenAddModal: () => void;
  onStartEdit: (startup: Startup) => void;
  onCancelEdit: () => void;
  onSaveEdit: (startupId: string) => void;
  onDelete: (startupId: string) => void;
}

export default function StartupsTab({
  organizationId,
  startups,
  startupsByOrg,
  expandedOrgIds,
  setExpandedOrgIds,
  editingStartupId,
  editingStartupTitle,
  setEditingStartupTitle,
  savingStartup,
  tabRef,
  onDownloadImage,
  onOpenAddModal,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: StartupsTabProps) {
  const router = useRouter();

  return (
    <div ref={tabRef}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => onDownloadImage('startups')}
          title="スタートアップを画像としてダウンロード"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            padding: 0,
            fontSize: '14px',
            color: '#6B7280',
            backgroundColor: 'transparent',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
            e.currentTarget.style.borderColor = '#D1D5DB';
            e.currentTarget.style.color = '#374151';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = '#E5E7EB';
            e.currentTarget.style.color = '#6B7280';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 2.5V12.5M10 12.5L6.25 8.75M10 12.5L13.75 8.75M2.5 15V16.25C2.5 16.913 3.037 17.5 3.75 17.5H16.25C16.963 17.5 17.5 16.913 17.5 16.25V15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
            スタートアップ ({startups.length}件)
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {startupsByOrg.size > 1 && (
              <button
                onClick={() => {
                  const childOrgIds = Array.from(startupsByOrg.keys()).filter(id => id !== organizationId);
                  const allExpanded = childOrgIds.length > 0 && childOrgIds.every(id => expandedOrgIds.has(id));
                  
                  if (allExpanded) {
                    setExpandedOrgIds(new Set());
                  } else {
                    setExpandedOrgIds(new Set(childOrgIds));
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6B7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4B5563';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#6B7280';
                }}
              >
                {(() => {
                  const childOrgIds = Array.from(startupsByOrg.keys()).filter(id => id !== organizationId);
                  const allExpanded = childOrgIds.length > 0 && childOrgIds.every(id => expandedOrgIds.has(id));
                  return allExpanded ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                      すべて閉じる
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      すべて開く
                    </>
                  );
                })()}
              </button>
            )}
            <button
              onClick={onOpenAddModal}
              style={{
                padding: '8px 16px',
                backgroundColor: '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              + 追加
            </button>
          </div>
        </div>
        {startups.length === 0 ? (
          <p style={{ color: 'var(--color-text-light)', padding: '20px', textAlign: 'center' }}>
            スタートアップが登録されていません
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Array.from(startupsByOrg.entries()).map(([orgId, orgData]) => {
              const isCurrentOrg = orgId === organizationId;
              const isExpanded = isCurrentOrg || expandedOrgIds.has(orgId);
              
              return (
                <div key={orgId} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #E5E7EB',
                  }}>
                    <h4 style={{ 
                      fontSize: '14px', 
                      fontWeight: 600, 
                      color: '#6B7280',
                      margin: 0,
                    }}>
                      {orgData.orgName} ({orgData.startups.length}件)
                    </h4>
                    {!isCurrentOrg && (
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedOrgIds);
                          if (isExpanded) {
                            newExpanded.delete(orgId);
                          } else {
                            newExpanded.add(orgId);
                          }
                          setExpandedOrgIds(newExpanded);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          padding: 0,
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#6B7280',
                          transition: 'transform 0.2s ease',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#374151';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#6B7280';
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {isExpanded && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '16px',
                      }}
                    >
                      {orgData.startups.map((startup) => (
                        <div
                          key={startup.id}
                          onClick={() => {
                            if (editingStartupId !== startup.id && startup.organizationId && startup.id) {
                              router.push(`/organization/startup?organizationId=${startup.organizationId}&startupId=${startup.id}`);
                            }
                          }}
              style={{
                padding: '16px',
                backgroundColor: '#ffffff',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                cursor: editingStartupId !== startup.id ? 'pointer' : 'default',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
              onMouseEnter={(e) => {
                if (editingStartupId !== startup.id) {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                  e.currentTarget.style.borderColor = '#3B82F6';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (editingStartupId !== startup.id) {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {editingStartupId === startup.id ? (
                <div>
                  <input
                    type="text"
                    value={editingStartupTitle}
                    onChange={(e) => setEditingStartupTitle(e.target.value)}
                    autoFocus
                    disabled={savingStartup}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #3B82F6',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontWeight: 600,
                      marginBottom: '8px',
                      backgroundColor: savingStartup ? '#F3F4F6' : '#FFFFFF',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onSaveEdit(startup.id);
                      } else if (e.key === 'Escape') {
                        onCancelEdit();
                      }
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={onCancelEdit}
                      disabled={savingStartup}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#6B7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: savingStartup ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => onSaveEdit(startup.id)}
                      disabled={savingStartup || !editingStartupTitle.trim()}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: savingStartup || !editingStartupTitle.trim() ? '#9CA3AF' : '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: savingStartup || !editingStartupTitle.trim() ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      {savingStartup ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h4 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (startup.organizationId && startup.id) {
                          router.push(`/organization/startup?organizationId=${startup.organizationId}&startupId=${startup.id}`);
                        }
                      }}
                      style={{ 
                        fontSize: '16px', 
                        fontWeight: 600, 
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        flex: 1,
                      }}
                    >
                      {startup.title}
                    </h4>
                    <div style={{ display: 'flex', gap: '2px', marginLeft: '8px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartEdit(startup);
                        }}
                        disabled={savingStartup}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          padding: 0,
                          backgroundColor: 'transparent',
                          color: '#9CA3AF',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: savingStartup ? 'not-allowed' : 'pointer',
                          opacity: 0.3,
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!savingStartup) {
                            e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.08)';
                            e.currentTarget.style.opacity = '0.6';
                            e.currentTarget.style.color = '#6B7280';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!savingStartup) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.opacity = '0.3';
                            e.currentTarget.style.color = '#9CA3AF';
                          }
                        }}
                        title="編集"
                      >
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(startup.id);
                        }}
                        disabled={savingStartup}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          padding: 0,
                          backgroundColor: 'transparent',
                          color: '#9CA3AF',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: savingStartup ? 'not-allowed' : 'pointer',
                          opacity: 0.3,
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!savingStartup) {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                            e.currentTarget.style.opacity = '0.6';
                            e.currentTarget.style.color = '#9CA3AF';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!savingStartup) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.opacity = '0.3';
                            e.currentTarget.style.color = '#9CA3AF';
                          }
                        }}
                        title="削除"
                      >
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {startup.description && (
                    <p style={{ fontSize: '14px', color: 'var(--color-text-light)', marginBottom: '8px', lineHeight: '1.5' }}>
                      {startup.description}
                    </p>
                  )}
                  {startup.createdAt && (
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>
                      作成日: {new Date(startup.createdAt).toLocaleDateString('ja-JP')}
                    </div>
                  )}
                </>
              )}
            </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

