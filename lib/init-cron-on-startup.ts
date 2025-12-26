/**
 * アプリケーション起動時にCronスケジューラーを初期化
 * このファイルは、Next.jsのサーバーサイドで自動的に実行されます
 */

import { initializeDynamicCronScheduler } from './dynamic-cron-scheduler';

// グローバル変数で初期化済みフラグを管理（Next.jsのホットリロードに対応）
let initPromise: Promise<void> | null = null;

/**
 * Cronスケジューラーを初期化（一度だけ実行される）
 */
export async function initCronOnStartup(): Promise<void> {
  // 既に初期化中または初期化済みの場合はスキップ
  if (initPromise) {
    return initPromise;
  }

  // 本番環境では実行しない
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  initPromise = (async () => {
    try {
      await initializeDynamicCronScheduler();
      console.log('✅ 動的Cronスケジューラーの初期化が完了しました');
    } catch (error) {
      console.error('❌ Cronスケジューラーの初期化に失敗しました:', error);
    }
  })();

  return initPromise;
}

// 開発環境でのみ、モジュール読み込み時に初期化を試みる
if (process.env.NODE_ENV !== 'production' && typeof window === 'undefined') {
  // サーバーサイドでのみ実行
  initCronOnStartup().catch(console.error);
}





