'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import SearchResults from '../../components/SearchResults';
import { Property } from '../../components/PropertyCard';

interface ScrapingExecution {
  id: string;
  job_id: string;
  executed_at: string;
  status: 'running' | 'completed' | 'failed';
  total_scraped: number;
  new_properties: number;
  error_message?: string;
  execution_type: 'manual' | 'scheduled';
  scraping_jobs?: {
    id: string;
    name: string;
    search_url: string;
  };
}

export default function ResultDetailPage() {
  const params = useParams();
  const executionId = params.id as string;

  const [execution, setExecution] = useState<ScrapingExecution | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (executionId) {
      loadExecution();
      loadProperties();
    }
  }, [executionId]);

  const loadExecution = async () => {
    try {
      const response = await fetch(`/api/executions/${executionId}`);
      const data = await response.json();
      if (data.success) {
        setExecution(data.execution);
      }
    } catch (error) {
      console.error('実行履歴詳細取得エラー:', error);
      alert('実行履歴の取得に失敗しました');
    }
  };

  const loadProperties = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/executions/${executionId}/properties`);
      const data = await response.json();
      if (data.success) {
        setProperties(data.properties);
      }
    } catch (error) {
      console.error('物件一覧取得エラー:', error);
      alert('物件一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      running: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    const labels = {
      running: '実行中',
      completed: '完了',
      failed: '失敗',
    };
    return (
      <span className={`px-3 py-1 text-sm rounded ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (!execution) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            読み込み中...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            実行結果詳細
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-all">
            実行ID: {execution.id}
          </p>
        </header>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
              実行情報
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">ジョブ名:</span>
                <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
                  {execution.scraping_jobs?.name || '不明なジョブ'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">実行タイプ:</span>
                <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
                  {execution.execution_type === 'scheduled' ? '定期実行' : '手動実行'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">実行日時:</span>
                <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
                  {formatDate(execution.executed_at)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">ステータス:</span>
                <div className="mt-1">{getStatusBadge(execution.status)}</div>
              </div>
              {execution.status === 'completed' && (
                <>
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">抽出件数:</span>
                    <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
                      {execution.total_scraped}件
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">新規物件数:</span>
                    <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
                      {execution.new_properties}件
                    </p>
                  </div>
                </>
              )}
              {execution.status === 'failed' && execution.error_message && (
                <div className="md:col-span-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">エラーメッセージ:</span>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {execution.error_message}
                  </p>
                </div>
              )}
            </div>
            {execution.scraping_jobs?.search_url && (
              <div className="mt-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">検索URL:</span>
                <p className="text-sm text-gray-600 dark:text-gray-400 break-all mt-1">
                  {execution.scraping_jobs.search_url}
                </p>
              </div>
            )}
          </div>

          {execution.status === 'completed' && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                物件一覧 ({properties.length}件)
              </h2>
              <SearchResults properties={properties} isLoading={isLoading} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


