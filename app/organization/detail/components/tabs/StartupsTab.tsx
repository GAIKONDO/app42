'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Startup, BizDevPhase, OrgNodeData } from '@/lib/orgApi';
import { getBizDevPhases, getAllStartups, getOrgTreeFromDb, findOrganizationById } from '@/lib/orgApi';
import { formatStartupDate } from '@/lib/orgApi/utils';

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
  onToggleFavorite?: (startupId: string) => void;
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
  onToggleFavorite,
}: StartupsTabProps) {
  const router = useRouter();
  const [bizDevPhases, setBizDevPhases] = useState<BizDevPhase[]>([]);
  const [loadingPhases, setLoadingPhases] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allStartupsForSearch, setAllStartupsForSearch] = useState<Startup[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchInputFocused, setSearchInputFocused] = useState(false);
  const [orgTree, setOrgTree] = useState<OrgNodeData | null>(null);

  // Biz-Devフェーズを取得
  useEffect(() => {
    const loadBizDevPhases = async () => {
      try {
        setLoadingPhases(true);
        const phases = await getBizDevPhases();
        setBizDevPhases(phases);
      } catch (error) {
        console.error('Biz-Devフェーズの取得に失敗:', error);
      } finally {
        setLoadingPhases(false);
      }
    };
    loadBizDevPhases();
  }, []);

  // 全組織のスタートアップを取得（検索用）
  useEffect(() => {
    const loadAllStartups = async () => {
      try {
        const allStartups = await getAllStartups();
        setAllStartupsForSearch(allStartups);
      } catch (error) {
        console.error('全組織のスタートアップ取得に失敗:', error);
      }
    };
    loadAllStartups();
  }, []);

  // 組織ツリーを取得（組織名取得用）
  useEffect(() => {
    const loadOrgTree = async () => {
      try {
        const tree = await getOrgTreeFromDb();
        setOrgTree(tree);
      } catch (error) {
        console.error('組織ツリーの取得に失敗:', error);
      }
    };
    loadOrgTree();
  }, []);

  // 検索候補を取得（全組織のスタートアップから）
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) {
      return [];
    }
    
    const query = searchQuery.trim().toLowerCase();
    const matchingStartups = allStartupsForSearch
      .filter(startup => startup.title.toLowerCase().includes(query))
      .slice(0, 10); // 最大10件まで表示
    
    // 重複を除去（タイトルで）
    const seenTitles = new Set<string>();
    return matchingStartups.filter(startup => {
      if (seenTitles.has(startup.title)) {
        return false;
      }
      seenTitles.add(startup.title);
      return true;
    });
  }, [allStartupsForSearch, searchQuery]);

  // ドロップダウンを外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-search-input]')) {
        setShowSearchSuggestions(false);
      }
    };

    if (showSearchSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchSuggestions]);

  // 組織名を取得するヘルパー関数
  const getOrganizationName = (orgId: string): string => {
    // まず、startupsByOrgから取得を試みる
    const orgData = startupsByOrg.get(orgId);
    if (orgData?.orgName) {
      return orgData.orgName;
    }
    
    // 組織ツリーから取得を試みる
    if (orgTree) {
      const foundOrg = findOrganizationById(orgTree, orgId);
      if (foundOrg?.name) {
        return foundOrg.name;
      }
    }
    
    // どちらも見つからない場合はIDを返す
    return orgId;
  };

  // 検索クエリでフィルタリングされたスタートアップを取得（全組織のスタートアップを含む）
  const filteredStartups = useMemo(() => {
    if (!searchQuery.trim()) {
      return startups;
    }
    
    const query = searchQuery.trim().toLowerCase();
    // 全組織のスタートアップから検索
    const matchingStartups = allStartupsForSearch.filter(startup => 
      startup.title.toLowerCase().includes(query)
    );
    
    // 検索結果を返す（現在の組織に属するものも、別の組織に属するものも含む）
    return matchingStartups;
  }, [startups, allStartupsForSearch, searchQuery]);

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
      {/* 検索フォーム */}
      <div style={{ marginBottom: '16px' }} data-search-input>
        <div style={{
          position: 'relative',
          maxWidth: '500px',
        }}>
          <input
            type="text"
            placeholder="スタートアップ名で検索（全組織横断検索）..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchSuggestions(true);
            }}
            onFocus={(e) => {
              setSearchInputFocused(true);
              if (searchSuggestions.length > 0) {
                setShowSearchSuggestions(true);
              }
              e.target.style.borderColor = '#3B82F6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              setSearchInputFocused(false);
              e.target.style.borderColor = '#E5E7EB';
              e.target.style.boxShadow = 'none';
              // 少し遅延させてから閉じる（候補クリックを可能にするため）
              setTimeout(() => {
                setShowSearchSuggestions(false);
              }, 200);
            }}
            style={{
              width: '100%',
              padding: '10px 16px 10px 40px',
              border: '1.5px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: '#FFFFFF',
              color: '#111827',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
          />
          <div style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9CA3AF',
            pointerEvents: 'none',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowSearchSuggestions(false);
              }}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                padding: 0,
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#9CA3AF',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.color = '#6B7280';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#9CA3AF';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          
          {/* 予測変換ドロップダウン */}
          {showSearchSuggestions && searchSuggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              maxHeight: '300px',
              overflowY: 'auto',
            }}>
              {searchSuggestions.map((startup, index) => (
                <div
                  key={startup.id || index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: index < searchSuggestions.length - 1 ? '1px solid #F3F4F6' : 'none',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      // 別の組織のスタートアップの場合は、そのスタートアップの詳細ページに移動
                      if (startup.organizationId && startup.id) {
                        router.push(`/organization/startup?organizationId=${startup.organizationId}&startupId=${startup.id}`);
                        setShowSearchSuggestions(false);
                      } else {
                        setSearchQuery(startup.title);
                        setShowSearchSuggestions(false);
                      }
                    }}
                    style={{
                      flex: 1,
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#1A1A1A',
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span>{startup.title}</span>
                      {startup.organizationId && startup.organizationId !== organizationId && (
                        <span style={{ fontSize: '11px', color: '#6B7280' }}>
                          {getOrganizationName(startup.organizationId)}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {searchQuery && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
            検索結果: {filteredStartups.length}件 / 全組織のスタートアップから検索中
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
          スタートアップ ({filteredStartups.length}件{searchQuery ? '（検索中）' : ''})
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
      {loadingPhases ? (
        <p style={{ color: 'var(--color-text-light)', padding: '20px', textAlign: 'center' }}>
          Biz-Devフェーズを読み込み中...
        </p>
      ) : filteredStartups.length === 0 ? (
        <p style={{ color: 'var(--color-text-light)', padding: '20px', textAlign: 'center' }}>
          {searchQuery ? '検索条件に一致するスタートアップが見つかりませんでした' : 'スタートアップが登録されていません'}
        </p>
      ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {(() => {
              // 検索結果を組織ごとにグループ化
              const startupsByOrgMap = new Map<string, { orgName: string; startups: Startup[] }>();
              
              // 既存の組織のスタートアップを追加
              for (const [orgId, orgData] of startupsByOrg.entries()) {
                const orgFilteredStartups = searchQuery.trim()
                  ? orgData.startups.filter(startup => 
                      filteredStartups.some(fs => fs.id === startup.id)
                    )
                  : orgData.startups;
                
                if (orgFilteredStartups.length > 0) {
                  startupsByOrgMap.set(orgId, {
                    orgName: orgData.orgName,
                    startups: orgFilteredStartups,
                  });
                }
              }
              
              // 検索結果に含まれる別の組織のスタートアップを追加
              if (searchQuery.trim()) {
                for (const startup of filteredStartups) {
                  if (!startup.organizationId) continue;
                  
                  // 既に追加されている組織の場合はスキップ
                  if (startupsByOrgMap.has(startup.organizationId)) continue;
                  
                  // 別の組織のスタートアップを追加
                  const orgName = getOrganizationName(startup.organizationId);
                  if (!startupsByOrgMap.has(startup.organizationId)) {
                    startupsByOrgMap.set(startup.organizationId, {
                      orgName,
                      startups: [],
                    });
                  }
                  startupsByOrgMap.get(startup.organizationId)!.startups.push(startup);
                }
              }
              
              return Array.from(startupsByOrgMap.entries()).map(([orgId, orgData]) => {
                const orgFilteredStartups = orgData.startups;
                const isCurrentOrg = orgId === organizationId;
                const isOtherOrg = !startupsByOrg.has(orgId);
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
                        color: isOtherOrg ? '#3B82F6' : '#6B7280',
                        margin: 0,
                      }}>
                        {orgData.orgName} ({orgFilteredStartups.length}件{searchQuery.trim() ? '（検索結果）' : ''}{isOtherOrg ? ' - 別の組織' : ''})
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
                  {isExpanded && (() => {
                    // この組織のスタートアップをフェーズごとにグループ化（フィルタリング済みのスタートアップを使用）
                    const orgStartupsByPhase = new Map<string, { phase: BizDevPhase | null; startups: Startup[] }>();
                    
                    for (const startup of orgFilteredStartups) {
                      const phaseId = (startup as any).bizDevPhase || 'none';
                      if (!orgStartupsByPhase.has(phaseId)) {
                        const phase = phaseId === 'none' ? null : bizDevPhases.find(p => p.id === phaseId) || null;
                        orgStartupsByPhase.set(phaseId, { phase, startups: [] });
                      }
                      orgStartupsByPhase.get(phaseId)!.startups.push(startup);
                    }
                    
                    // フェーズIDをソート
                    const orgSortedPhaseIds: string[] = [];
                    for (const phase of bizDevPhases) {
                      if (orgStartupsByPhase.has(phase.id) && orgStartupsByPhase.get(phase.id)!.startups.length > 0) {
                        orgSortedPhaseIds.push(phase.id);
                      }
                    }
                    if (orgStartupsByPhase.has('none') && orgStartupsByPhase.get('none')!.startups.length > 0) {
                      orgSortedPhaseIds.push('none');
                    }
                    
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {orgSortedPhaseIds.map((phaseId) => {
                          const phaseData = orgStartupsByPhase.get(phaseId);
                          if (!phaseData || phaseData.startups.length === 0) return null;
                          
                          const phaseTitle = phaseData.phase ? phaseData.phase.title : 'Biz-Devフェーズ未設定';
                          
                          return (
                            <div key={phaseId} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                                  {phaseTitle} ({phaseData.startups.length}件)
                                </h4>
                              </div>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                  gap: '16px',
                                }}
                              >
                                {phaseData.startups.map((startup) => (
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
                                      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
                                            {onToggleFavorite && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onToggleFavorite(startup.id);
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
                                                  color: startup.isFavorite ? '#F59E0B' : '#9CA3AF',
                                                  border: 'none',
                                                  borderRadius: '4px',
                                                  cursor: savingStartup ? 'not-allowed' : 'pointer',
                                                  opacity: startup.isFavorite ? 1 : 0.3,
                                                  transition: 'all 0.2s ease',
                                                }}
                                                onMouseEnter={(e) => {
                                                  if (!savingStartup) {
                                                    e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.08)';
                                                    e.currentTarget.style.opacity = '1';
                                                    e.currentTarget.style.color = '#F59E0B';
                                                  }
                                                }}
                                                onMouseLeave={(e) => {
                                                  if (!savingStartup) {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                    e.currentTarget.style.opacity = startup.isFavorite ? '1' : '0.3';
                                                    e.currentTarget.style.color = startup.isFavorite ? '#F59E0B' : '#9CA3AF';
                                                  }
                                                }}
                                                title={startup.isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
                                              >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill={startup.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                                </svg>
                                              </button>
                                            )}
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
                                      </div>
                                      {startup.createdAt && (() => {
                                        const formattedDate = formatStartupDate(startup.createdAt);
                                        return formattedDate ? (
                                          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>
                                            作成日: {formattedDate}
                                          </div>
                                        ) : null;
                                      })()}
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                  })()}
                </div>
              );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

