'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Startup } from '@/lib/orgApi';
import { formatStartupDate } from '@/lib/orgApi/utils';

interface StartupListModalProps {
  isOpen: boolean;
  onClose: () => void;
  startups: Startup[];
  title: string;
}

const ITEMS_PER_PAGE = 20;

export function StartupListModal({
  isOpen,
  onClose,
  startups,
  title,
}: StartupListModalProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  // ページネーション計算
  const totalPages = useMemo(() => {
    return Math.ceil(startups.length / ITEMS_PER_PAGE);
  }, [startups.length]);

  const paginatedStartups = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return startups.slice(startIndex, endIndex);
  }, [startups, currentPage]);

  // モーダルが開かれた時にページをリセット
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1A1A1A',
              margin: 0,
              fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
            }}
          >
            {title}
            <span
              style={{
                marginLeft: '12px',
                fontSize: '16px',
                fontWeight: '400',
                color: '#6B7280',
              }}
            >
              ({startups.length}件)
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6B7280',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
              e.currentTarget.style.color = '#1A1A1A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6B7280';
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {paginatedStartups.length === 0 ? (
            <div
              style={{
                padding: '40px',
                textAlign: 'center',
                color: '#6B7280',
                fontSize: '14px',
              }}
            >
              スタートアップがありません。
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px',
              }}
            >
              {paginatedStartups.map((startup) => (
                <div
                  key={startup.id}
                  onClick={() => {
                    if (startup.organizationId && startup.id) {
                      router.push(
                        `/organization/startup?organizationId=${startup.organizationId}&startupId=${startup.id}`
                      );
                      onClose();
                    }
                  }}
                  style={{
                    padding: '16px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    cursor: startup.organizationId ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                  onMouseEnter={(e) => {
                    if (startup.organizationId) {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                      e.currentTarget.style.borderColor = '#4262FF';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (startup.organizationId) {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E5E7EB';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <h5
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1A1A1A',
                      margin: '0 0 8px 0',
                      fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                    }}
                  >
                    {startup.title}
                  </h5>
                  {startup.createdAt && (() => {
                    const formattedDate = formatStartupDate(startup.createdAt);
                    return formattedDate ? (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#9CA3AF',
                          marginTop: '8px',
                        }}
                      >
                        作成日: {formattedDate}
                      </div>
                    ) : null;
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 16px',
                backgroundColor: currentPage === 1 ? '#F3F4F6' : '#4262FF',
                color: currentPage === 1 ? '#9CA3AF' : '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 150ms',
                fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
              }}
              onMouseEnter={(e) => {
                if (currentPage !== 1) {
                  e.currentTarget.style.backgroundColor = '#3151CC';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== 1) {
                  e.currentTarget.style.backgroundColor = '#4262FF';
                }
              }}
            >
              前へ
            </button>
            <span
              style={{
                fontSize: '14px',
                color: '#6B7280',
                fontWeight: '500',
                fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
              }}
            >
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 16px',
                backgroundColor:
                  currentPage === totalPages ? '#F3F4F6' : '#4262FF',
                color: currentPage === totalPages ? '#9CA3AF' : '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor:
                  currentPage === totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 150ms',
                fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
              }}
              onMouseEnter={(e) => {
                if (currentPage !== totalPages) {
                  e.currentTarget.style.backgroundColor = '#3151CC';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== totalPages) {
                  e.currentTarget.style.backgroundColor = '#4262FF';
                }
              }}
            >
              次へ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

