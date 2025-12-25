'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4">
            SUUMO 物件スクレイピングツール
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400">
            SUUMOの検索結果URLから物件情報を抽出・管理できます
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Link
            href="/manual"
            className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                手動実行
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                SUUMOの検索結果URLから物件情報を即座に抽出します（最大50件）
              </p>
            </div>
          </Link>

          <Link
            href="/scheduled"
            className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">⏰</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                定期実行
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                1日2回（9:15と22:15）の定期実行ジョブを登録・管理します
              </p>
            </div>
          </Link>

          <Link
            href="/results"
            className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">📋</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                結果一覧
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                過去の実行履歴と抽出した物件情報を確認できます
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
