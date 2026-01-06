/**
 * スタートアップランドスケープ表示タブ
 * カテゴリー別にスタートアップを表示
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  getAllStartups, 
  getCategories, 
  getBizDevPhases,
  getStatuses,
  getVcs,
  type Startup, 
  type Category,
  type BizDevPhase,
  type Status,
  type VC,
} from '@/lib/orgApi';

import SearchForm from './StartupLandscapeTab/SearchForm';
import FilterDropdown from './StartupLandscapeTab/FilterDropdown';
import StatsCards from './StartupLandscapeTab/StatsCards';
import ViewModeToggle from './StartupLandscapeTab/ViewModeToggle';
import ParentCategorySection from './StartupLandscapeTab/ParentCategorySection';
import CategorySection from './StartupLandscapeTab/CategorySection';
import LandscapeView from './StartupLandscapeTab/LandscapeView';
import BizDevPhaseView from './StartupLandscapeTab/BizDevPhaseView';
import StartupCard from './StartupLandscapeTab/StartupCard';
import { showToast } from '@/components/Toast';

import type { StartupLandscapeTabProps } from './StartupLandscapeTab/types';

export function StartupLandscapeTab({}: StartupLandscapeTabProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [bizDevPhases, setBizDevPhases] = useState<BizDevPhase[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [vcs, setVcs] = useState<VC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedBizDevPhaseIds, setSelectedBizDevPhaseIds] = useState<Set<string>>(new Set());
  const [selectedVCIds, setSelectedVCIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'all' | 'parent-only'>('all');
  const [displayMode, setDisplayMode] = useState<'box' | 'landscape' | 'bizdev'>('bizdev');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [showBizDevPhaseFilter, setShowBizDevPhaseFilter] = useState(false);
  const [showVCFilter, setShowVCFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchInputFocused, setSearchInputFocused] = useState(false);
  const [favoriteFilter, setFavoriteFilter] = useState<'all' | 'favorite'>('all');
  const [showExportModal, setShowExportModal] = useState(false);

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [categoriesData, startupsData, bizDevPhasesData, statusesData, vcsData] = await Promise.all([
          getCategories().catch((err) => {
            console.warn('カテゴリーの取得に失敗しました:', err);
            return [];
          }),
          getAllStartups().catch((err) => {
            console.warn('スタートアップの取得に失敗しました:', err);
            return [];
          }),
          getBizDevPhases().catch((err) => {
            console.warn('Biz-Devフェーズの取得に失敗しました:', err);
            return [];
          }),
          getStatuses().catch((err) => {
            console.warn('ステータスの取得に失敗しました:', err);
            return [];
          }),
          getVcs().catch((err) => {
            console.warn('VCの取得に失敗しました:', err);
            return [];
          }),
        ]);

        setCategories(categoriesData);
        setStartups(startupsData);
        setBizDevPhases(bizDevPhasesData);
        setStatuses(statusesData);
        setVcs(vcsData);
      } catch (err: any) {
        console.error('データの読み込みに失敗しました:', err);
        setError(`データの読み込みに失敗しました: ${err?.message || err}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ファイルダウンロード用のヘルパー関数
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  // HTML形式でエクスポート
  const exportToHTML = () => {
    try {
      // スタートアップをBiz-Devフェーズでグループ化（Biz-Dev形式用）
      const startupsByPhase = new Map<string, { phase: BizDevPhase | null; startups: Startup[] }>();
      for (const startup of filteredStartups) {
        const phaseId = (startup as any).bizDevPhase || 'none';
        if (!startupsByPhase.has(phaseId)) {
          const phase = phaseId === 'none' ? null : bizDevPhases.find(p => p.id === phaseId) || null;
          startupsByPhase.set(phaseId, { phase, startups: [] });
        }
        startupsByPhase.get(phaseId)!.startups.push(startup);
      }

      const sortedPhaseIds: string[] = [];
      for (const phase of bizDevPhases) {
        if (startupsByPhase.has(phase.id) && startupsByPhase.get(phase.id)!.startups.length > 0) {
          sortedPhaseIds.push(phase.id);
        }
      }
      if (startupsByPhase.has('none') && startupsByPhase.get('none')!.startups.length > 0) {
        sortedPhaseIds.push('none');
      }

      // スタートアップカードのHTMLを生成する関数
      const generateStartupCardHTML = (startup: Startup, isCompact: boolean = false) => {
        const bizDevPhase = (startup as any).bizDevPhase 
          ? bizDevPhases.find(p => p.id === (startup as any).bizDevPhase)
          : null;
        const isFavorite = startup.isFavorite === true;
        const isSpecialPhase = bizDevPhase && (
          bizDevPhase.title.includes('全社取扱商材') || 
          bizDevPhase.title.includes('CTCA関連')
        );

        let bgColor = '#FFFFFF';
        let borderColor = '#E5E7EB';
        if (isFavorite) {
          bgColor = '#FEF3C7';
          borderColor = '#F59E0B';
        } else if (isSpecialPhase) {
          bgColor = '#EFF6FF';
          borderColor = '#3B82F6';
        }

        if (isCompact) {
          return `
            <div style="
              padding: 10px 14px;
              background-color: ${bgColor};
              border: 1px solid ${borderColor};
              border-radius: 8px;
              font-size: 13px;
              font-weight: 500;
              color: #1A1A1A;
              text-align: center;
              min-height: 44px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              ${startup.title}
            </div>`;
        } else {
          return `
            <div style="
              padding: 16px;
              background-color: ${bgColor};
              border: 1px solid ${borderColor};
              border-radius: 10px;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
            ">
              <div style="
                font-size: 15px;
                font-weight: 600;
                color: #1A1A1A;
                line-height: 1.4;
                margin-bottom: 12px;
              ">
                ${startup.title}
              </div>
              ${bizDevPhase ? `
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                <span style="
                  padding: 4px 10px;
                  background-color: #EFF6FF;
                  color: #1E40AF;
                  border-radius: 6px;
                  font-size: 11px;
                  font-weight: 500;
                ">
                  ${bizDevPhase.title}
                </span>
              </div>` : ''}
            </div>`;
        }
      };

      // Biz-Dev形式のHTMLを生成
      let bizDevHTML = '';
      if (sortedPhaseIds.length > 0) {
        sortedPhaseIds.forEach(phaseId => {
          const phaseData = startupsByPhase.get(phaseId);
          if (!phaseData || phaseData.startups.length === 0) return;
          
          const phaseTitle = phaseData.phase ? phaseData.phase.title : 'Biz-Devフェーズ未設定';
          bizDevHTML += `
            <div style="margin-bottom: 24px;">
              <h3 style="
                font-size: 18px;
                font-weight: 600;
                color: #374151;
                margin: 0 0 16px 0;
                padding-bottom: 8px;
                border-bottom: 1px solid #E5E7EB;
              ">
                ${phaseTitle} (${phaseData.startups.length}件)
              </h3>
              <div style="
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 12px;
              ">
                ${phaseData.startups.map(startup => generateStartupCardHTML(startup, true)).join('')}
              </div>
            </div>`;
        });
      } else {
        bizDevHTML = '<p style="color: #6B7280; text-align: center; padding: 40px;">スタートアップが登録されていません</p>';
      }

      // ランドスケープ形式のHTMLを生成
      let landscapeHTML = '';
      if (selectedCategoryIds.size > 0) {
        const selectedCategories = Array.from(selectedCategoryIds)
          .map(id => categories.find(c => c.id === id))
          .filter((c): c is Category => c !== undefined);
        
        selectedCategories.forEach(category => {
          const categoryStartups = filteredStartups.filter(startup => 
            startup.categoryIds && startup.categoryIds.includes(category.id)
          );
          
          landscapeHTML += `
            <div style="
              padding: 32px;
              background-color: #F9FAFB;
              border-radius: 16px;
              margin-bottom: 32px;
            ">
              <div style="
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 3px solid #3B82F6;
              ">
                <h3 style="
                  font-size: 32px;
                  font-weight: 700;
                  color: #1A1A1A;
                  margin: 0 0 8px 0;
                ">
                  ${category.title}
                </h3>
                <div style="
                  font-size: 16px;
                  color: #6B7280;
                  font-weight: 500;
                ">
                  ${categoryStartups.length}件のスタートアップ
                </div>
              </div>
              <div style="
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 12px;
              ">
                ${categoryStartups.map(startup => generateStartupCardHTML(startup, true)).join('')}
              </div>
            </div>`;
        });
      } else {
        categoryHierarchy.forEach(({ parent, children }) => {
          const parentStartups = startupsByCategory[parent.id] || [];
          const hasChildStartups = children.some(child => {
            const childStartups = startupsByCategory[child.id] || [];
            return childStartups.length > 0;
          });

          if (viewMode === 'parent-only') {
            const startupSet = new Set<string>();
            const allStartupsForParent: Startup[] = [];
            
            parentStartups.forEach(startup => {
              if (startup.id && !startupSet.has(startup.id)) {
                startupSet.add(startup.id);
                allStartupsForParent.push(startup);
              }
            });
            
            children.forEach(child => {
              const childStartups = startupsByCategory[child.id] || [];
              childStartups.forEach(startup => {
                if (startup.id && !startupSet.has(startup.id)) {
                  startupSet.add(startup.id);
                  allStartupsForParent.push(startup);
                }
              });
            });
            
            if (allStartupsForParent.length === 0) return;

            landscapeHTML += `
              <div style="
                padding: 24px;
                background-color: #FFFFFF;
                border-radius: 12px;
                border: 2px solid #E5E7EB;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
                margin-bottom: 24px;
              ">
                <div style="
                  margin-bottom: 20px;
                  padding-bottom: 12px;
                  border-bottom: 2px solid #3B82F6;
                ">
                  <h3 style="
                    font-size: 24px;
                    font-weight: 700;
                    color: #1A1A1A;
                    margin: 0 0 4px 0;
                  ">
                    ${parent.title}
                  </h3>
                  <div style="
                    font-size: 14px;
                    color: #6B7280;
                    font-weight: 500;
                  ">
                    ${allStartupsForParent.length}件
                  </div>
                </div>
                <div style="
                  display: grid;
                  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                  gap: 10px;
                ">
                  ${allStartupsForParent.map(startup => generateStartupCardHTML(startup, true)).join('')}
                </div>
              </div>`;
          } else {
            if (!hasChildStartups) return;

            const totalStartups = children.reduce((sum, child) => sum + (startupsByCategory[child.id] || []).length, 0);

            landscapeHTML += `
              <div style="
                padding: 24px;
                background-color: #FFFFFF;
                border-radius: 12px;
                border: 2px solid #E5E7EB;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
                margin-bottom: 24px;
              ">
                <div style="
                  margin-bottom: 20px;
                  padding-bottom: 12px;
                  border-bottom: 2px solid #3B82F6;
                ">
                  <h3 style="
                    font-size: 24px;
                    font-weight: 700;
                    color: #1A1A1A;
                    margin: 0 0 4px 0;
                  ">
                    ${parent.title}
                  </h3>
                  <div style="
                    font-size: 14px;
                    color: #6B7280;
                    font-weight: 500;
                  ">
                    ${totalStartups}件
                  </div>
                </div>
                ${children.map(child => {
                  const childStartups = startupsByCategory[child.id] || [];
                  if (childStartups.length === 0) return '';
                  
                  return `
                    <div style="margin-bottom: 20px;">
                      <h4 style="
                        font-size: 18px;
                        font-weight: 600;
                        color: #374151;
                        margin: 0 0 12px 0;
                        padding-bottom: 8px;
                        border-bottom: 1px solid #E5E7EB;
                      ">
                        ${child.title}
                        <span style="margin-left: 8px; font-size: 13px; font-weight: 400; color: #9CA3AF;">
                          (${childStartups.length})
                        </span>
                      </h4>
                      <div style="
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                        gap: 10px;
                      ">
                        ${childStartups.map(startup => generateStartupCardHTML(startup, true)).join('')}
                      </div>
                    </div>`;
                }).join('')}
              </div>`;
          }
        });
      }

      // フィルター条件のHTMLを生成
      const hasAnyFilter = searchQuery.trim() || selectedCategoryIds.size > 0 || selectedBizDevPhaseIds.size > 0 || selectedVCIds.size > 0 || favoriteFilter === 'favorite';
      let filterConditionsHTML = '';
      if (hasAnyFilter) {
        const filterItems: string[] = [];
        
        // 検索クエリ
        if (searchQuery.trim()) {
          filterItems.push(`<li><strong>検索:</strong> "${searchQuery}"</li>`);
        }
        
        // カテゴリー
        if (selectedCategoryIds.size > 0) {
          const selectedCategoryNames = Array.from(selectedCategoryIds)
            .map(id => categories.find(c => c.id === id)?.title)
            .filter((title): title is string => title !== undefined);
          filterItems.push(`<li><strong>カテゴリー:</strong> ${selectedCategoryNames.join(', ')}</li>`);
        }
        
        // Biz-Devフェーズ
        if (selectedBizDevPhaseIds.size > 0) {
          const selectedPhaseNames = Array.from(selectedBizDevPhaseIds)
            .map(id => bizDevPhases.find(p => p.id === id)?.title)
            .filter((title): title is string => title !== undefined);
          filterItems.push(`<li><strong>Biz-Devフェーズ:</strong> ${selectedPhaseNames.join(', ')}</li>`);
        }
        
        // 関連VC
        if (selectedVCIds.size > 0) {
          const selectedVCNames = Array.from(selectedVCIds)
            .map(id => vcs.find(v => v.id === id)?.title)
            .filter((title): title is string => title !== undefined);
          filterItems.push(`<li><strong>関連VC:</strong> ${selectedVCNames.join(', ')}</li>`);
        }
        
        // お気に入り
        if (favoriteFilter === 'favorite') {
          filterItems.push(`<li><strong>お気に入り:</strong> お気に入りのみ</li>`);
        }
        
        // ビューモード
        if (viewMode === 'parent-only') {
          filterItems.push(`<li><strong>表示モード:</strong> 親カテゴリーのみ</li>`);
        }
        
        filterConditionsHTML = `
          <div style="
            padding: 20px;
            background-color: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 12px;
            margin-bottom: 24px;
          ">
            <h3 style="
              font-size: 16px;
              font-weight: 600;
              color: #374151;
              margin: 0 0 12px 0;
            ">
              適用中のフィルター条件
            </h3>
            <ul style="
              list-style: none;
              padding: 0;
              margin: 0;
              display: flex;
              flex-direction: column;
              gap: 8px;
            ">
              ${filterItems.join('')}
            </ul>
          </div>`;
      } else {
        filterConditionsHTML = `
          <div style="
            padding: 20px;
            background-color: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 12px;
            margin-bottom: 24px;
          ">
            <p style="
              margin: 0;
              font-size: 14px;
              color: #6B7280;
            ">
              フィルター条件: なし（すべてのスタートアップを表示）
            </p>
          </div>`;
      }

      // 統計カードのHTMLを生成
      const statsHTML = `
        <div class="stats-grid">
          <!-- カテゴリー数 -->
          <div style="
            padding: 24px;
            background-color: #FFFFFF;
            border: 1px solid #E5E7EB;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            position: relative;
            overflow: hidden;
          ">
            <div style="
              position: absolute;
              top: 0;
              right: 0;
              width: 60px;
              height: 60px;
              background: linear-gradient(135deg, #F0F4FF 0%, #E0E8FF 100%);
              border-radius: 0 12px 0 60px;
              opacity: 0.5;
            "></div>
            <div style="
              font-size: 13px;
              color: #6B7280;
              margin-bottom: 12px;
              font-weight: 500;
              letter-spacing: 0.02em;
              text-transform: uppercase;
              position: relative;
              z-index: 1;
            ">
              カテゴリー数
            </div>
            <div style="
              font-size: 40px;
              font-weight: 700;
              color: #1A1A1A;
              line-height: 1;
              margin-bottom: 4px;
              position: relative;
              z-index: 1;
            ">
              ${parentCategories.length}
            </div>
            <div style="
              font-size: 13px;
              color: #9CA3AF;
              font-weight: 400;
              position: relative;
              z-index: 1;
            ">
              件のカテゴリー
            </div>
          </div>

          <!-- サブカテゴリー数 -->
          <div style="
            padding: 24px;
            background-color: #FFFFFF;
            border: 1px solid #E5E7EB;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            position: relative;
            overflow: hidden;
          ">
            <div style="
              position: absolute;
              top: 0;
              right: 0;
              width: 60px;
              height: 60px;
              background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
              border-radius: 0 12px 0 60px;
              opacity: 0.5;
            "></div>
            <div style="
              font-size: 13px;
              color: #6B7280;
              margin-bottom: 12px;
              font-weight: 500;
              letter-spacing: 0.02em;
              text-transform: uppercase;
              position: relative;
              z-index: 1;
            ">
              サブカテゴリー数
            </div>
            <div style="
              font-size: 40px;
              font-weight: 700;
              color: #1A1A1A;
              line-height: 1;
              margin-bottom: 4px;
              position: relative;
              z-index: 1;
            ">
              ${categories.filter(c => c.parentCategoryId).length}
            </div>
            <div style="
              font-size: 13px;
              color: #9CA3AF;
              font-weight: 400;
              position: relative;
              z-index: 1;
            ">
              件のサブカテゴリー
            </div>
          </div>

          <!-- 全企業数 -->
          <div style="
            padding: 24px;
            background-color: #FFFFFF;
            border: 1px solid #E5E7EB;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            position: relative;
            overflow: hidden;
          ">
            <div style="
              position: absolute;
              top: 0;
              right: 0;
              width: 60px;
              height: 60px;
              background: linear-gradient(135deg, #FEF3F2 0%, #FEE2E2 100%);
              border-radius: 0 12px 0 60px;
              opacity: 0.5;
            "></div>
            <div style="
              font-size: 13px;
              color: #6B7280;
              margin-bottom: 12px;
              font-weight: 500;
              letter-spacing: 0.02em;
              text-transform: uppercase;
              position: relative;
              z-index: 1;
            ">
              全企業数
            </div>
            <div style="
              font-size: 40px;
              font-weight: 700;
              color: #1A1A1A;
              line-height: 1;
              margin-bottom: 4px;
              position: relative;
              z-index: 1;
            ">
              ${(selectedCategoryIds.size > 0 || selectedBizDevPhaseIds.size > 0 || selectedVCIds.size > 0) ? filteredStartups.length : startups.length}
            </div>
            <div style="
              font-size: 13px;
              color: #9CA3AF;
              font-weight: 400;
              position: relative;
              z-index: 1;
            ">
              件の企業
            </div>
          </div>

          <!-- お気に入り企業数 -->
          <div style="
            padding: 24px;
            background-color: #FFFFFF;
            border: 1px solid #E5E7EB;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            position: relative;
            overflow: hidden;
          ">
            <div style="
              position: absolute;
              top: 0;
              right: 0;
              width: 60px;
              height: 60px;
              background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
              border-radius: 0 12px 0 60px;
              opacity: 0.5;
            "></div>
            <div style="
              font-size: 13px;
              color: #6B7280;
              margin-bottom: 12px;
              font-weight: 500;
              letter-spacing: 0.02em;
              text-transform: uppercase;
              position: relative;
              z-index: 1;
            ">
              お気に入り企業数
            </div>
            <div style="
              font-size: 40px;
              font-weight: 700;
              color: #1A1A1A;
              line-height: 1;
              margin-bottom: 4px;
              position: relative;
              z-index: 1;
            ">
              ${startups.filter(s => s.isFavorite === true).length}
            </div>
            <div style="
              font-size: 13px;
              color: #9CA3AF;
              font-weight: 400;
              position: relative;
              z-index: 1;
            ">
              件の企業
            </div>
          </div>
        </div>`;

      // HTMLコンテンツを生成
      const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>スタートアップランドスケープ - エクスポート</title>
    <style>
        html {
            scroll-behavior: smooth;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
            background-color: #F9FAFB;
            color: #374151;
            line-height: 1.6;
            padding: 24px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background-color: #FFFFFF;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        h1 {
            font-size: 28px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
        }
        .meta-info {
            color: #6B7280;
            font-size: 14px;
            margin-bottom: 24px;
        }
        .tabs {
            display: flex;
            border-bottom: 2px solid #E5E7EB;
            margin-bottom: 24px;
        }
        .tab-button {
            padding: 12px 24px;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
            color: #6B7280;
            transition: all 0.2s ease;
            margin-bottom: -2px;
        }
        .tab-button:hover {
            color: #374151;
            background-color: #F9FAFB;
        }
        .tab-button.active {
            color: #4262FF;
            border-bottom-color: #4262FF;
            font-weight: 600;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 32px;
        }
        @media (max-width: 1200px) {
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        @media (max-width: 600px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
        @media print {
            body {
                padding: 0;
            }
            .container {
                box-shadow: none;
            }
            .tabs {
                display: none;
            }
            .tab-content {
                display: block !important;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>スタートアップランドスケープ</h1>
        <div class="meta-info">
            <strong>エクスポート日時:</strong> ${new Date().toLocaleString('ja-JP')}<br>
            <strong>総スタートアップ数:</strong> ${filteredStartups.length}件
        </div>
        
        <!-- フィルター条件 -->
        ${filterConditionsHTML}
        
        <!-- 統計カード -->
        ${statsHTML}
        
        <!-- タブ -->
        <div class="tabs">
            <button class="tab-button active" onclick="showTab('bizdev')">Biz-Dev形式</button>
            <button class="tab-button" onclick="showTab('landscape')">ランドスケープ形式</button>
        </div>
        
        <!-- Biz-Dev形式タブ -->
        <div id="bizdev" class="tab-content active">
            <h2 style="font-size: 22px; font-weight: 600; color: #374151; margin-bottom: 20px;">Biz-Dev形式</h2>
            ${bizDevHTML}
        </div>
        
        <!-- ランドスケープ形式タブ -->
        <div id="landscape" class="tab-content">
            <h2 style="font-size: 22px; font-weight: 600; color: #374151; margin-bottom: 20px;">ランドスケープ形式</h2>
            ${landscapeHTML}
        </div>
    </div>
    
    <script>
        function showTab(tabName) {
            var i, tabcontent, tablinks;
            tabcontent = document.getElementsByClassName("tab-content");
            for (i = 0; i < tabcontent.length; i++) {
                tabcontent[i].style.display = "none";
                tabcontent[i].classList.remove("active");
            }
            tablinks = document.getElementsByClassName("tab-button");
            for (i = 0; i < tablinks.length; i++) {
                tablinks[i].classList.remove("active");
            }
            document.getElementById(tabName).style.display = "block";
            document.getElementById(tabName).classList.add("active");
            event.currentTarget.classList.add("active");
        }
    </script>
</body>
</html>`;

      const filename = `スタートアップランドスケープ_${new Date().toISOString().split('T')[0]}.html`;
      downloadFile(htmlContent, filename, 'text/html;charset=utf-8');
      setShowExportModal(false);
      showToast('完了しました。', 'success');
    } catch (error) {
      console.error('HTMLエクスポートエラー:', error);
      showToast('HTML形式でのエクスポートに失敗しました', 'error');
    }
  };

  // 検索候補を取得（スタートアップオブジェクトの配列）
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) {
      return [];
    }
    
    const query = searchQuery.trim().toLowerCase();
    const matchingStartups = startups
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
  }, [startups, searchQuery]);

  // ドロップダウンを外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-filter-dropdown]')) {
        setShowCategoryFilter(false);
        setShowBizDevPhaseFilter(false);
        setShowVCFilter(false);
      }
      if (!target.closest('[data-search-input]')) {
        setShowSearchSuggestions(false);
      }
    };

    if (showCategoryFilter || showBizDevPhaseFilter || showVCFilter || showSearchSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCategoryFilter, showBizDevPhaseFilter, showVCFilter, showSearchSuggestions]);

  // 親カテゴリーのみを取得
  const parentCategories = useMemo(() => {
    return categories.filter(cat => !cat.parentCategoryId).sort((a, b) => {
      const posA = a.position ?? 999999;
      const posB = b.position ?? 999999;
      return posA - posB;
    });
  }, [categories]);

  // 親カテゴリーとその子カテゴリーを階層的に取得
  const categoryHierarchy = useMemo(() => {
    return parentCategories.map(parent => {
      const children = categories
        .filter(cat => cat.parentCategoryId === parent.id)
        .sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
      return {
        parent,
        children,
      };
    });
  }, [categories, parentCategories]);

  // 選択されたカテゴリーとBiz-Devフェーズ、検索クエリでフィルタリングされたスタートアップを取得
  const filteredStartups = useMemo(() => {
    let filtered = startups;
    
    // 検索クエリでフィルタリング
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(startup => 
        startup.title.toLowerCase().includes(query)
      );
    }
    
    // カテゴリーでフィルタリング（複数選択対応）
    if (selectedCategoryIds.size > 0) {
      // 選択されたカテゴリーとその子カテゴリーを取得
      const getCategoryAndChildren = (categoryId: string): string[] => {
        const categoryIds = [categoryId];
        const childCategories = categories.filter(c => c.parentCategoryId === categoryId);
        childCategories.forEach(child => {
          categoryIds.push(...getCategoryAndChildren(child.id));
        });
        return categoryIds;
      };
      
      const targetCategoryIds = new Set<string>();
      selectedCategoryIds.forEach(categoryId => {
        const categoryAndChildren = getCategoryAndChildren(categoryId);
        categoryAndChildren.forEach(id => targetCategoryIds.add(id));
      });
      
      filtered = filtered.filter(startup => 
        startup.categoryIds && 
        startup.categoryIds.some(catId => targetCategoryIds.has(catId))
      );
    }
    
    // Biz-Devフェーズでフィルタリング（複数選択対応）
    if (selectedBizDevPhaseIds.size > 0) {
      filtered = filtered.filter(startup => {
        const bizDevPhase = (startup as any).bizDevPhase;
        return bizDevPhase !== undefined && selectedBizDevPhaseIds.has(bizDevPhase);
      });
    }
    
    // 関連VCでフィルタリング（複数選択対応）
    if (selectedVCIds.size > 0) {
      filtered = filtered.filter(startup => 
        startup.relatedVCS && 
        startup.relatedVCS.some(vcId => selectedVCIds.has(vcId))
      );
    }
    
    // お気に入りでフィルタリング
    if (favoriteFilter === 'favorite') {
      filtered = filtered.filter(startup => startup.isFavorite === true);
    }
    
    return filtered;
  }, [startups, selectedCategoryIds, selectedBizDevPhaseIds, selectedVCIds, categories, searchQuery, favoriteFilter]);

  // カテゴリー別にスタートアップをグループ化（フィルター適用済みのスタートアップを使用）
  const startupsByCategory = useMemo(() => {
    const grouped: Record<string, Startup[]> = {};
    
    // すべてのカテゴリー（親と子）を初期化
    categories.forEach(category => {
      grouped[category.id] = [];
    });
    
    // フィルター適用済みのスタートアップを使用
    filteredStartups.forEach(startup => {
      if (startup.categoryIds && startup.categoryIds.length > 0) {
        startup.categoryIds.forEach(categoryId => {
          if (grouped[categoryId]) {
            grouped[categoryId].push(startup);
          }
        });
      }
    });
    
    return grouped;
  }, [filteredStartups, categories]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>データを読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{
          padding: '16px',
          backgroundColor: '#FEF2F2',
          border: '1.5px solid #FCA5A5',
          borderRadius: '8px',
          color: '#991B1B',
          fontSize: '14px',
        }}>
          <strong>エラー:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1A1A1A', marginBottom: '8px' }}>
            スタートアップランドスケープ
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
            カテゴリー別にスタートアップを表示します
          </p>
        </div>
        <button
          onClick={() => setShowExportModal(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3B82F6',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563EB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3B82F6';
          }}
        >
          エクスポート
        </button>
      </div>

      {/* 検索フォーム */}
      <SearchForm
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showSearchSuggestions={showSearchSuggestions}
        setShowSearchSuggestions={setShowSearchSuggestions}
        searchInputFocused={searchInputFocused}
        setSearchInputFocused={setSearchInputFocused}
        searchSuggestions={searchSuggestions}
        startups={startups}
        setStartups={setStartups}
      />

      {/* フィルターとビューモード */}
      <div style={{ 
        marginBottom: '24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* カテゴリーフィルター */}
          <FilterDropdown
            label="カテゴリー"
            selectedIds={selectedCategoryIds}
            items={parentCategories}
            getItemId={(cat) => cat.id}
            getItemTitle={(cat) => cat.title}
            onSelectionChange={setSelectedCategoryIds}
            showFilter={showCategoryFilter}
            setShowFilter={setShowCategoryFilter}
          />

          {/* Biz-Devフェーズフィルター */}
          <FilterDropdown
            label="Biz-Devフェーズ"
            selectedIds={selectedBizDevPhaseIds}
            items={bizDevPhases}
            getItemId={(phase) => phase.id}
            getItemTitle={(phase) => phase.title}
            onSelectionChange={setSelectedBizDevPhaseIds}
            showFilter={showBizDevPhaseFilter}
            setShowFilter={setShowBizDevPhaseFilter}
          />

          {/* 関連VCフィルター */}
          <FilterDropdown
            label="関連VC"
            selectedIds={selectedVCIds}
            items={vcs}
            getItemId={(vc) => vc.id}
            getItemTitle={(vc) => vc.title}
            onSelectionChange={setSelectedVCIds}
            showFilter={showVCFilter}
            setShowFilter={setShowVCFilter}
          />
        </div>
        
        <ViewModeToggle
          viewMode={viewMode}
          setViewMode={setViewMode}
          displayMode={displayMode}
          setDisplayMode={setDisplayMode}
          favoriteFilter={favoriteFilter}
          setFavoriteFilter={setFavoriteFilter}
        />
      </div>

      {/* 統計情報カード */}
      <StatsCards
        parentCategoriesCount={parentCategories.length}
        subCategoriesCount={categories.filter(c => c.parentCategoryId).length}
        totalStartups={startups.length}
        filteredStartupsCount={filteredStartups.length}
        favoriteStartupsCount={startups.filter(s => s.isFavorite === true).length}
        hasFilters={selectedCategoryIds.size > 0 || selectedBizDevPhaseIds.size > 0 || selectedVCIds.size > 0}
      />

      {/* カテゴリー別スタートアップ表示 */}
      {displayMode === 'bizdev' ? (
        // Biz-Dev形式
        <BizDevPhaseView
          filteredStartups={filteredStartups}
          bizDevPhases={bizDevPhases}
          statuses={statuses}
        />
      ) : displayMode === 'landscape' ? (
        // ランドスケープ形式
        <LandscapeView
          selectedCategoryIds={selectedCategoryIds}
          filteredStartups={filteredStartups}
          categoryHierarchy={categoryHierarchy}
          startupsByCategory={startupsByCategory}
          categories={categories}
          viewMode={viewMode}
          bizDevPhases={bizDevPhases}
        />
      ) : selectedCategoryIds.size > 0 ? (
        // 選択されたカテゴリーのみ表示（囲まれたボックス形式）
        <div style={{
          padding: '24px',
          backgroundColor: '#FFFFFF',
          border: '2px solid #3B82F6',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)',
        }}>
          <div style={{
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid #F3F4F6',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#1A1A1A',
                  margin: 0,
                  marginBottom: '8px',
                }}>
                  {selectedCategoryIds.size === 1 
                    ? categories.find(c => c.id === Array.from(selectedCategoryIds)[0])?.title
                    : `${selectedCategoryIds.size}件のカテゴリー`}
                </h3>
                {selectedCategoryIds.size === 1 && categories.find(c => c.id === Array.from(selectedCategoryIds)[0])?.description && (
                  <p style={{
                    fontSize: '14px',
                    color: '#6B7280',
                    margin: 0,
                  }}>
                    {categories.find(c => c.id === Array.from(selectedCategoryIds)[0])?.description}
                  </p>
                )}
              </div>
              <div style={{
                padding: '8px 16px',
                backgroundColor: '#EFF6FF',
                color: '#1E40AF',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
              }}>
                {filteredStartups.length}件
              </div>
            </div>
          </div>
          
          {filteredStartups.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
                ? '1fr' 
                : 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '16px',
            }}>
              {filteredStartups.map(startup => (
                <StartupCard 
                  key={startup.id} 
                  startup={startup}
                  bizDevPhases={bizDevPhases}
                  statuses={statuses}
                />
              ))}
            </div>
          ) : (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#9CA3AF',
              fontSize: '14px',
            }}>
              選択されたカテゴリーにスタートアップはありません
            </div>
          )}
        </div>
      ) : (
        // すべてのカテゴリーを表示（親カテゴリーの中にサブカテゴリーをネスト）
        <div>
          {categoryHierarchy.map(({ parent, children }) => {
            const parentStartups = startupsByCategory[parent.id] || [];
            const hasChildStartups = children.some(child => {
              const childStartups = startupsByCategory[child.id] || [];
              return childStartups.length > 0;
            });
            
            // 親カテゴリーのみ表示モードでは、親カテゴリーに直接紐づいているスタートアップと子カテゴリーのスタートアップをすべて親カテゴリーに表示
            if (viewMode === 'parent-only') {
              // 重複を避けるためにSetを使用
              const startupSet = new Set<string>();
              const allStartupsForParent: Startup[] = [];
              
              // 親カテゴリーに直接紐づいているスタートアップを追加
              parentStartups.forEach(startup => {
                if (startup.id && !startupSet.has(startup.id)) {
                  startupSet.add(startup.id);
                  allStartupsForParent.push(startup);
                }
              });
              
              // 子カテゴリーのスタートアップを追加
              children.forEach(child => {
                const childStartups = startupsByCategory[child.id] || [];
                childStartups.forEach(startup => {
                  if (startup.id && !startupSet.has(startup.id)) {
                    startupSet.add(startup.id);
                    allStartupsForParent.push(startup);
                  }
                });
              });
              
              if (allStartupsForParent.length === 0) return null;
              
              return (
                <CategorySection
                  key={parent.id}
                  category={parent}
                  startups={allStartupsForParent}
                  level={0}
                  bizDevPhases={bizDevPhases}
                  statuses={statuses}
                />
              );
            }
            
            // すべて表示モードでは、親カテゴリーの中にサブカテゴリーをネスト（親カテゴリーに直接紐づくスタートアップは表示しない）
            if (!hasChildStartups) return null;
            
            return (
              <ParentCategorySection
                key={parent.id}
                parent={parent}
                parentStartups={parentStartups}
                children={children}
                startupsByCategory={startupsByCategory}
                bizDevPhases={bizDevPhases}
                statuses={statuses}
              />
            );
          })}
        </div>
      )}

      {/* エクスポートモーダル */}
      {showExportModal && (
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
          onClick={() => setShowExportModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600', color: '#1A1A1A' }}>
              エクスポート形式を選択
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => {
                  exportToHTML();
                }}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                }}
              >
                HTML形式
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#E5E7EB',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#D1D5DB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


