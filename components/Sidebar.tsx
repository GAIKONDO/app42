'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { signOut, type User } from '@/lib/localFirebase';
import { DashboardIcon, LineChartIcon, BarChartIcon, DocumentIcon, SettingsIcon, OrganizationIcon, KnowledgeGraphIcon, DesignIcon, MenuIcon, CloseIcon, AgentIcon, UserIcon, LogOutIcon } from './Icons';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentPage?: string;
  user?: User | null;
}

export default function Sidebar({ isOpen, onToggle, currentPage, user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = async () => {
    try {
      await signOut(null);
      router.push('/');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const menuItems = [
    { icon: DashboardIcon, label: 'ダッシュボード', id: 'dashboard', path: '/' },
    { icon: LineChartIcon, label: '分析', id: 'analytics', path: '/analytics' },
    { icon: OrganizationIcon, label: '組織', id: 'organization', path: '/organization' },
    { icon: KnowledgeGraphIcon, label: 'ナレッジグラフ', id: 'knowledge-graph', path: '/knowledge-graph' },
    { icon: BarChartIcon, label: 'レポート', id: 'reports', path: '/reports' },
    { icon: AgentIcon, label: 'Agent', id: 'agents', path: '/agents' },
    { icon: DesignIcon, label: '設計', id: 'design', path: '/design' },
    // Graphvizタブは非表示（機能オフ）
    // { icon: GraphvizIcon, label: 'Graphviz', id: 'graphviz', path: '/graphviz' },
    { icon: SettingsIcon, label: '設定', id: 'settings', path: '/settings' },
  ];

  // 現在のページを判定
  const getCurrentPage = () => {
    if (currentPage) {
      return currentPage;
    }
    if (pathname === '/') return 'dashboard';
    if (pathname.startsWith('/knowledge-graph')) return 'knowledge-graph';
    if (pathname.startsWith('/design')) return 'design';
    if (pathname.startsWith('/agents')) return 'agents';
    // Graphvizタブは非表示（機能オフ）
    // if (pathname.startsWith('/graphviz')) return 'graphviz';
    const pathWithoutSlash = pathname.replace('/', '');
    return pathWithoutSlash || 'dashboard';
  };

  const activePage = getCurrentPage();

  const handleNavigation = (path: string) => {
    startTransition(() => {
      router.push(path);
    });
  };

  return (
    <>
      {/* サイドバー（アイコン表示） - 常に表示 */}
      <aside
        style={{
          position: 'fixed',
          left: 0,
          top: '76px',
          width: '70px',
          height: 'calc(100vh - 76px)',
          background: 'linear-gradient(180deg, #1F2933 0%, #18222D 100%)',
          zIndex: 997,
          padding: '20px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
        }}
      >
        {/* ハンバーガーメニューボタン - サイドバーの一番上 */}
        <button
          onClick={onToggle}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            width: '50px',
            height: '50px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            transition: 'background-color 0.2s',
            opacity: 0.8,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.opacity = '0.8';
          }}
          aria-label="メニューを開く"
        >
          {isOpen ? <CloseIcon size={20} color="white" /> : <MenuIcon size={20} color="white" />}
        </button>

        {/* メニューアイテム */}
        {menuItems.map((item, index) => {
          const IconComponent = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              title={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '50px',
                height: '50px',
                marginBottom: index < menuItems.length - 1 ? '10px' : '0',
                borderRadius: '6px',
                color: 'white',
                textDecoration: 'none',
                transition: 'background-color 0.2s',
                backgroundColor: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                opacity: isActive ? 1 : 0.7,
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.opacity = '1';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.opacity = '0.7';
                }
              }}
            >
              <IconComponent size={20} color="white" />
            </button>
          );
        })}
      </aside>

      {/* サイドメニュー - サイドバーの右側に表示 */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: '76px',
            left: '70px',
            width: '280px',
            height: 'calc(100vh - 76px)',
            background: 'var(--color-surface)',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
            zIndex: 998,
            display: 'flex',
            flexDirection: 'column',
            borderRight: `1px solid var(--color-border-color)`,
          }}
        >
          {/* メニュー部分 - スクロール可能 */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 0',
            }}
          >
            <div style={{ padding: '0 24px', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-light)', marginBottom: '0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                メニュー
              </h2>
            </div>
            <nav>
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 24px',
                      width: '100%',
                      color: isActive ? 'var(--color-text)' : 'var(--color-text-light)',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                      borderLeft: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                      backgroundColor: isActive ? 'var(--color-background)' : 'transparent',
                      fontSize: '14px',
                      fontWeight: isActive ? 500 : 400,
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--color-background)';
                        e.currentTarget.style.borderLeftColor = 'rgba(31, 41, 51, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderLeftColor = 'transparent';
                      }
                    }}
                  >
                    <span style={{ marginRight: '12px', opacity: isActive ? 1 : 0.6 }}>
                      <IconComponent size={18} color={isActive ? 'var(--color-text)' : 'var(--color-text-light)'} />
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* アカウント情報とログアウトボタン - サイドメニューの一番下（固定） */}
          {user && (
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--color-border-color)',
                backgroundColor: 'var(--color-surface)',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: 'var(--color-text-light)',
                    marginBottom: '4px',
                  }}
                >
                  <UserIcon size={14} color="var(--color-text-light)" />
                  <span>ログイン中</span>
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: 'var(--color-text)',
                    fontWeight: 500,
                    wordBreak: 'break-word',
                    marginBottom: '8px',
                    paddingLeft: '22px',
                  }}
                >
                  {user.email || user.displayName || 'ユーザー'}
                </div>
                <button
                  onClick={handleSignOut}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    color: 'var(--color-text)',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--color-border-color)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-background)';
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--color-border-color)';
                  }}
                >
                  <LogOutIcon size={14} color="var(--color-text)" />
                  <span>ログアウト</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
