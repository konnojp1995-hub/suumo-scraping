'use client';

import { useState } from 'react';
import UrlScraper, { parseUrlConditions, SearchConditionsFromUrl } from '../components/UrlScraper';
import SearchResults from '../components/SearchResults';
import { Property } from '../components/PropertyCard';

export default function ManualScrapePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [conditions, setConditions] = useState<SearchConditionsFromUrl | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');

  const handleScrape = async (url: string) => {
    setIsLoading(true);
    setHasSearched(true);
    setCurrentUrl(url);
    
    // URLから検索条件を抽出
    const parsedConditions = parseUrlConditions(url);
    setConditions(parsedConditions);
    
    try {
      console.log('スクレイピング開始:', url);
      
      // タイムアウトを5分（300秒）に設定（50件の物件詳細ページにアクセスするため）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);
      
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url,
          executionType: 'manual',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'サーバーエラーが発生しました' }));
        // 503エラーの場合は詳細なメッセージを表示
        if (response.status === 503) {
          throw new Error(errorData.error || '本番環境ではPlaywrightが使用できないため、スクレイピングはGitHub Actions経由で実行されます。');
        }
        throw new Error(errorData.error || `HTTPエラー: ${response.status}`);
      }

      const data = await response.json();
      console.log('APIレスポンス:', data);

      if (!data.success) {
        throw new Error(data.error || 'スクレイピングに失敗しました');
      }

      setProperties(data.properties || []);
      
      if (data.properties && data.properties.length === 0) {
        alert('物件が見つかりませんでした');
      }
    } catch (error) {
      console.error('スクレイピングエラー:', error);
      let errorMessage = 'スクレイピング中にエラーが発生しました';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'リクエストがタイムアウトしました。時間をおいて再度お試しください。';
        } else {
          errorMessage = error.message;
        }
      }
      
      alert(errorMessage);
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            手動実行
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            SUUMOの検索結果URLから物件情報を抽出できます（最大50件）
          </p>
        </header>

        <UrlScraper 
          onScrape={handleScrape} 
          isLoading={isLoading} 
          conditions={conditions}
        />

        {(hasSearched || properties.length > 0) && (
          <SearchResults properties={properties} isLoading={isLoading} />
        )}
      </div>
    </div>
  );
}


