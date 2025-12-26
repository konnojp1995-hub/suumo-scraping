'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export default function ResultsPage() {
  const [executions, setExecutions] = useState<ScrapingExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadExecutions();
  }, []);

  const loadExecutions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/executions?limit=50');
      const data = await response.json();
      if (data.success) {
        setExecutions(data.executions);
      }
    } catch (error) {
      console.error('実行履歴取得エラー:', error);
      alert('実行履歴の取得に失敗しました');
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
      <span className={`px-2 py-1 text-xs rounded ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            実行履歴一覧
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            過去の実行履歴と抽出した物件情報を確認できます
          </p>
        </header>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 sm:mb-6">
            実行履歴
          </h2>

          {isLoading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              読み込み中...
            </div>
          ) : executions.length === 0 ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              実行履歴がありません
            </div>
          ) : (
            <div className="space-y-4">
              {executions.map((execution) => (
                <Link
                  key={execution.id}
                  href={`/results/${execution.id}`}
                  className="block border border-gray-200 dark:border-gray-700 rounded-md p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200">
                          {execution.scraping_jobs?.name || '不明なジョブ'}
                        </h3>
                        {getStatusBadge(execution.status)}
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            execution.execution_type === 'scheduled'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {execution.execution_type === 'scheduled' ? '定期実行' : '手動実行'}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                        実行日時: {formatDate(execution.executed_at)}
                      </p>
                      {execution.status === 'completed' && (
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">
                          <span>抽出件数: {execution.total_scraped}件</span>
                          {execution.new_properties !== undefined && (
                            <span className="ml-2 sm:ml-4">
                              新規物件: {execution.new_properties}件
                            </span>
                          )}
                        </div>
                      )}
                      {execution.status === 'failed' && execution.error_message && (
                        <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-2">
                          エラー: {execution.error_message}
                        </p>
                      )}
                    </div>
                    <div className="text-gray-400 dark:text-gray-600 hidden sm:block">
                      →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


