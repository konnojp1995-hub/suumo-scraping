/**
 * GitHub Actionsで定期実行ジョブを実行するスクリプト
 */

import { chromium } from 'playwright';
import { scrapePropertiesFromUrl } from '../lib/scraping';
import {
  getAllScrapingJobs,
  createScrapingExecution,
  updateScrapingExecution,
  saveProperties,
  getScrapingJob,
} from '../app/utils/db-operations';
import { filterDuplicateProperties } from '../app/utils/duplicate-checker';
import { sendLineNotificationWithCSV } from '../app/api/line-messaging';

/**
 * 実行すべきジョブを取得してスクレイピングを実行
 */
async function executeScheduledJobs() {
  try {
    // 現在時刻を取得（JST）
    const now = new Date();
    const jstTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const hours = String(jstTime.getHours()).padStart(2, '0');
    const minutes = String(jstTime.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}:00`;

    console.log(`=== 定期実行開始: ${currentTime} (JST) ===`);

    // データベースから実行すべきジョブを取得
    const allJobs = await getAllScrapingJobs();
    const scheduledJobs = allJobs.filter(
      (job: any) =>
        job.job_type === 'scheduled' &&
        job.is_active === true &&
        (job.schedule_time1 === currentTime || job.schedule_time2 === currentTime)
    );

    console.log(`実行対象ジョブ数: ${scheduledJobs.length}`);

    if (scheduledJobs.length === 0) {
      console.log('実行すべきジョブがありません');
      return;
    }

    // Playwrightでブラウザを起動
    console.log('ブラウザを起動中...');
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      // 各ジョブを実行
      for (const job of scheduledJobs) {
        await executeJob(job, browser);
      }
    } finally {
      await browser.close();
      console.log('ブラウザを閉じました');
    }

    console.log('=== 定期実行完了 ===');
  } catch (error) {
    console.error('ジョブ実行エラー:', error);
    process.exit(1);
  }
}

/**
 * 個別のジョブを実行
 */
async function executeJob(job: any, browser: any) {
  const executionId = await createScrapingExecution({
    job_id: job.id,
    status: 'running',
    execution_type: 'scheduled',
  });

  if (!executionId) {
    console.error(`実行履歴の作成に失敗しました: ${job.name}`);
    return;
  }

  console.log(`\nジョブ実行開始: ${job.name} (ID: ${job.id})`);

  try {
    // コンテキストとページを作成
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
      // スクレイピング実行
      const properties = await scrapePropertiesFromUrl(job.search_url, page, 50);

      // 重複チェック（過去14日間の定期実行を対象）
      console.log('重複チェックを実行中（過去14日間の定期実行を対象）...');
      const duplicateResult = await filterDuplicateProperties(
        properties,
        job.id,
        14, // 過去14日間
        true // すべての定期実行ジョブを対象にする
      );
      const newProperties = duplicateResult.newProperties;
      const duplicateCount = duplicateResult.duplicateCount;
      console.log(`重複チェック完了: 新規${newProperties.length}件、重複${duplicateCount}件`);

      // データベースに保存
      console.log('データベースに保存中...');
      const savedCount = await saveProperties(executionId, newProperties);
      console.log(`${savedCount}件の物件情報を保存しました`);

      // 実行履歴を更新
      await updateScrapingExecution(executionId, {
        status: 'completed',
        total_scraped: properties.length,
        new_properties: newProperties.length,
      });

      // LINE通知を送信
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.vercel.app';
      const resultUrl = `${baseUrl}/results/${executionId}`;
      const searchConditions = `ジョブ名: ${job.name}\n検索URL: ${job.search_url}\n\n詳細: ${resultUrl}`;
      
      await sendLineNotificationWithCSV(searchConditions, '', newProperties.length)
        .then(success => {
          if (success) {
            console.log('LINE通知を送信しました');
          } else {
            console.warn('LINE通知の送信に失敗しました');
          }
        })
        .catch(error => {
          console.error('LINE通知の送信に失敗しました:', error);
        });

      console.log(`ジョブ実行完了: ${job.name}`);
    } finally {
      await context.close();
    }
  } catch (error) {
    console.error(`ジョブ実行エラー (${job.name}):`, error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    await updateScrapingExecution(executionId, {
      status: 'failed',
      error_message: errorMessage,
    });
  }
}

// スクリプト実行
executeScheduledJobs();

