'use client';

import { useState, useEffect } from 'react';
import { getAllStartups, type Startup } from '@/lib/orgApi';

interface NDARenewalAlert {
  approaching: Array<{ id: string; title: string }>;
  overdue: Array<{ id: string; title: string }>;
}

/**
 * NDA更新予定期間をチェックするカスタムフック
 * 開始期間が現在日時から30日以内、または開始期間を過ぎているスタートアップを検出
 */
export function useNDARenewalAlerts() {
  const [alerts, setAlerts] = useState<NDARenewalAlert>({ approaching: [], overdue: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkNDARenewalDates = async () => {
      try {
        setLoading(true);
        const startups = await getAllStartups();
        
        // 現在日時を日付のみに正規化（時刻を00:00:00に設定）
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const thirtyDaysLater = new Date(now);
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        
        const approaching: Array<{ id: string; title: string }> = [];
        const overdue: Array<{ id: string; title: string }> = [];
        
        startups.forEach((startup: Startup) => {
          // 更新不要フラグがtrueの場合はアラートを表示しない
          if (startup.monetizationRenewalNotRequired) return;
          
          // monetizationPeriodがNDA更新予定期間
          const monetizationPeriod = startup.monetizationPeriod;
          if (!monetizationPeriod) return;
          
          // monetizationPeriodは開始予定日のみ（終了期間は不要）
          // 「YYYY-MM-DD」または「YYYY-MM」形式をサポート
          const startPeriod = monetizationPeriod.trim();
          if (!startPeriod) return;
          
          // 「YYYY-MM-DD」または「YYYY-MM」形式を日付に変換
          const parsePeriodToDate = (period: string): Date | null => {
            // 「YYYY-MM-DD」形式
            const dateMatch = period.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (dateMatch) {
              const year = parseInt(dateMatch[1], 10);
              const month = parseInt(dateMatch[2], 10) - 1; // 月は0ベース
              const day = parseInt(dateMatch[3], 10);
              if (month < 0 || month > 11 || day < 1 || day > 31) return null;
              
              const date = new Date(year, month, day);
              date.setHours(0, 0, 0, 0); // 時刻を00:00:00に設定
              return date;
            }
            
            // 「YYYY-MM」形式（既存データとの互換性のため、月初日として扱う）
            const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
            if (monthMatch) {
              const year = parseInt(monthMatch[1], 10);
              const month = parseInt(monthMatch[2], 10) - 1; // 月は0ベース
              if (month < 0 || month > 11) return null;
              
              const date = new Date(year, month, 1);
              date.setHours(0, 0, 0, 0); // 時刻を00:00:00に設定
              return date;
            }
            
            return null;
          };
          
          const startDate = parsePeriodToDate(startPeriod);
          if (!startDate) return;
          
          // 開始期間を過ぎている場合（現在日時より前）
          if (startDate < now) {
            overdue.push({
              id: startup.id || '',
              title: startup.title || '無題',
            });
          }
          // 開始期間が30日以内の場合（現在日時から30日以内）
          else if (startDate <= thirtyDaysLater) {
            approaching.push({
              id: startup.id || '',
              title: startup.title || '無題',
            });
          }
        });
        
        setAlerts({ approaching, overdue });
      } catch (error) {
        console.error('❌ [useNDARenewalAlerts] エラー:', error);
        setAlerts({ approaching: [], overdue: [] });
      } finally {
        setLoading(false);
      }
    };
    
    checkNDARenewalDates();
    
    // 1時間ごとに再チェック
    const interval = setInterval(checkNDARenewalDates, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return { alerts, loading };
}

