/**
 * GitHub Actionsで定期実行ジョブを実行するスクリプト
 * キュー方式: 9:15と22:15に統一されたジョブをキューとして管理し、未実行のものを順次実行
 */

import { chromium } from 'playwright';
import { scrapePropertiesFromUrl } from '../lib/scraping';
import {
  getPendingJobsForTime,
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
    const hours = jstTime.getHours();
    const minutes = jstTime.getMinutes();
    const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

    console.log(`=== 定期実行開始: ${currentTime} (JST) ===`);

    // 現在時刻から判断して、どちらのキューをチェックするか決定
    // 朝のキュー（09:15:00）: 09:18-12:00の間、または10:34-12:00で遅延実行の場合
    // 夜のキュー（22:15:00）: 22:18-23:59の間、または23:34-翌01:00で遅延実行の場合
    let targetTime: string | null = null;
    
    // 朝のキュー（09:15:00）の対象時間
    if ((hours === 9 && minutes >= 18) || (hours === 10) || (hours === 11)) {
      targetTime = '09:15:00';
    }
    // 夜のキュー（22:15:00）の対象時間
    else if ((hours === 22 && minutes >= 18) || hours === 23) {
      targetTime = '22:15:00';
    }
    // 翌日の0時台も夜のキューの遅延実行として扱う
    else if (hours === 0) {
      targetTime = '22:15:00';
    }

    if (!targetTime) {
      console.log('現在時刻は実行対象時間外です');
      return;
    }

    console.log(`対象キュー時刻: ${targetTime}`);

    // 未実行のジョブを取得（Playwrightインストール前にチェック）
    console.log('未実行ジョブをチェック中...');
    const pendingJobs = await getPendingJobsForTime(targetTime);

    console.log(`未実行ジョブ数: ${pendingJobs.length}`);

    if (pendingJobs.length === 0) {
      console.log('実行すべきジョブがありません。処理を終了します。');
      return;
    }

    // 未実行のジョブがある場合のみ、Playwrightをインストールしてブラウザを起動
    console.log('ブラウザを起動中...');
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      // 各ジョブを順次実行
      for (const job of pendingJobs) {
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
  
  // 検索条件をログに出力
  console.log(`検索URL: ${job.search_url}`);
  try {
    const urlObj = new URL(job.search_url);
    const params = urlObj.searchParams;
    console.log(`検索条件:`);
    console.log(`  - URL: ${job.search_url}`);
    if (params.get('ta')) console.log(`  - 都道府県コード: ${params.get('ta')}`);
    if (params.get('sc')) console.log(`  - 市区町村コード: ${params.get('sc')}`);
    if (params.get('cb')) console.log(`  - 家賃下限: ${params.get('cb')}万円`);
    if (params.get('ct')) console.log(`  - 家賃上限: ${params.get('ct')}万円`);
    if (params.get('mb')) console.log(`  - 面積下限: ${params.get('mb')}㎡`);
    if (params.get('mt')) console.log(`  - 面積上限: ${params.get('mt')}㎡`);
    if (params.get('ts')) console.log(`  - 建物種類: ${params.get('ts')}`);
  } catch (error) {
    console.log(`検索URL解析エラー: ${error}`);
  }

  try {
    // コンテキストとページを作成
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
      // スクレイピング実行
      console.log(`スクレイピングを開始します: ${job.search_url}`);
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


