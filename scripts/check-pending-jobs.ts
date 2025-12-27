/**
 * 未実行のジョブがあるかチェックするスクリプト
 * Playwright install前に実行して、ジョブがなければ処理を終了
 */

import {
  getPendingJobsForTime,
} from '../app/utils/db-operations';

/**
 * 未実行のジョブがあるかチェック
 * @returns 未実行のジョブがある場合はtrue、ない場合はfalse
 */
async function checkPendingJobs(): Promise<boolean> {
  try {
    // 現在時刻を取得（JST）
    const now = new Date();
    const jstTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const hours = jstTime.getHours();
    const minutes = jstTime.getMinutes();

    console.log(`=== 未実行ジョブチェック: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} (JST) ===`);

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
      return false;
    }

    console.log(`対象キュー時刻: ${targetTime}`);

    // 未実行のジョブを取得
    console.log('未実行ジョブをチェック中...');
    const pendingJobs = await getPendingJobsForTime(targetTime);

    console.log(`未実行ジョブ数: ${pendingJobs.length}`);

    if (pendingJobs.length === 0) {
      console.log('実行すべきジョブがありません。');
      return false;
    }

    console.log(`実行対象ジョブ:`);
    pendingJobs.forEach((job: any, index: number) => {
      console.log(`  ${index + 1}. ${job.name} (ID: ${job.id})`);
    });

    return true;
  } catch (error) {
    console.error('ジョブチェックエラー:', error);
    // エラーが発生した場合は、実行を続行する（安全側に倒す）
    return true;
  }
}

// スクリプト実行
checkPendingJobs()
  .then((hasPendingJobs) => {
    process.exit(hasPendingJobs ? 0 : 1);
  })
  .catch((error) => {
    console.error('チェック処理でエラーが発生しました:', error);
    // エラーが発生した場合は実行を続行する（安全側に倒す）
    process.exit(0);
  });

