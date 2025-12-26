/**
 * 動的Cronスケジューラー
 * データベースに保存されているジョブのスケジュールに基づいて、動的にCronジョブを管理します
 */

import { getAllScrapingJobs } from '@/app/utils/db-operations';

interface ScheduledTask {
  jobId: string;
  time: string;
  cronTask: any; // node-cronのTask
}

// ジョブIDと時刻の組み合わせをキーとして、Cronタスクを管理
const scheduledTasks = new Map<string, ScheduledTask>();

let cronModule: any = null;
let isInitialized = false;

/**
 * Cronモジュールを読み込む
 */
async function loadCronModule() {
  if (!cronModule) {
    cronModule = await import('node-cron');
  }
  return cronModule;
}

/**
 * 時間文字列（HH:MM:SS）をCron式に変換
 * @param time 時間文字列（例: "09:15:00"）
 * @returns Cron式（例: "15 9 * * *"）
 */
function timeToCronExpression(time: string): string {
  // HH:MM:SS形式をパース
  const parts = time.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  // Cron式: 分 時 * * * (毎日実行)
  return `${minutes} ${hours} * * *`;
}

/**
 * ジョブのスケジュールに基づいてCronタスクを作成
 * @param jobId ジョブID
 * @param time 実行時刻（HH:MM:SS形式）
 */
async function createCronTask(jobId: string, time: string): Promise<void> {
  const cron = await loadCronModule();
  const cronExpression = timeToCronExpression(time);
  const taskKey = `${jobId}:${time}`;

  // 既存のタスクがある場合は削除
  if (scheduledTasks.has(taskKey)) {
    const existingTask = scheduledTasks.get(taskKey);
    if (existingTask?.cronTask) {
      existingTask.cronTask.stop();
      existingTask.cronTask.destroy();
    }
    scheduledTasks.delete(taskKey);
  }

  console.log(`Cronタスクを作成: ジョブID=${jobId}, 時刻=${time}, Cron式=${cronExpression}`);

  // 新しいCronタスクを作成
  const cronTask = cron.schedule(cronExpression, async () => {
    console.log(`定期実行開始: ジョブID=${jobId}, 時刻=${time}`);
    await executeScheduledJob(jobId, time);
  });

  // タスクを管理マップに保存
  scheduledTasks.set(taskKey, {
    jobId,
    time,
    cronTask,
  });
}

/**
 * ジョブを削除
 * @param jobId ジョブID
 */
export async function removeJobSchedules(jobId: string): Promise<void> {
  const tasksToRemove: string[] = [];

  // 該当するジョブのタスクを検索
  for (const [key, task] of scheduledTasks.entries()) {
    if (task.jobId === jobId) {
      tasksToRemove.push(key);
    }
  }

  // タスクを停止して削除
  for (const key of tasksToRemove) {
    const task = scheduledTasks.get(key);
    if (task?.cronTask) {
      task.cronTask.stop();
      task.cronTask.destroy();
      console.log(`Cronタスクを削除: ジョブID=${jobId}, 時刻=${task.time}`);
    }
    scheduledTasks.delete(key);
  }
}

/**
 * ジョブのスケジュールを更新（既存のタスクを削除して新しく作成）
 * @param jobId ジョブID
 * @param time1 実行時刻1（HH:MM:SS形式、省略可能）
 * @param time2 実行時刻2（HH:MM:SS形式、省略可能）
 */
export async function updateJobSchedule(
  jobId: string,
  time1?: string,
  time2?: string
): Promise<void> {
  // 既存のタスクを削除
  await removeJobSchedules(jobId);

  // 新しいスケジュールを作成
  if (time1) {
    await createCronTask(jobId, time1);
  }
  if (time2) {
    await createCronTask(jobId, time2);
  }
}

/**
 * スケジュールされたジョブを実行
 */
async function executeScheduledJob(jobId: string, time: string): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/scheduled-scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`ジョブ実行エラー (ジョブID=${jobId}):`, errorData);
    } else {
      const data = await response.json();
      console.log(`ジョブ実行成功 (ジョブID=${jobId}):`, data);
    }
  } catch (error) {
    console.error(`ジョブ実行エラー (ジョブID=${jobId}):`, error);
  }
}

/**
 * 動的Cronスケジューラーを初期化
 * データベースからすべてのアクティブなスケジュールジョブを取得して、Cronタスクを作成
 */
export async function initializeDynamicCronScheduler(): Promise<void> {
  // 本番環境では実行しない（外部のCronサービスを使用するため）
  if (process.env.NODE_ENV === 'production') {
    console.log('本番環境では外部のCronサービスを使用してください');
    return;
  }

  // 既に初期化済みの場合はスキップ
  if (isInitialized) {
    console.log('動的Cronスケジューラーは既に初期化済みです');
    return;
  }

  try {
    console.log('動的Cronスケジューラーを初期化中...');

    // データベースからすべてのアクティブなスケジュールジョブを取得
    const jobs = await getAllScrapingJobs();
    const scheduledJobs = jobs.filter(
      (job: any) => job.job_type === 'scheduled' && job.is_active === true
    );

    console.log(`アクティブなスケジュールジョブ: ${scheduledJobs.length}件`);

    // 各ジョブのスケジュールに基づいてCronタスクを作成
    for (const job of scheduledJobs) {
      if (job.schedule_time1) {
        await createCronTask(job.id, job.schedule_time1);
      }
      if (job.schedule_time2) {
        await createCronTask(job.id, job.schedule_time2);
      }
    }

    isInitialized = true;
    console.log(
      `動的Cronスケジューラーを初期化しました（${scheduledTasks.size}個のCronタスクを作成）`
    );
  } catch (error) {
    console.error('動的Cronスケジューラーの初期化に失敗しました:', error);
  }
}

/**
 * すべてのCronタスクを停止
 */
export async function stopAllScheduledTasks(): Promise<void> {
  for (const [key, task] of scheduledTasks.entries()) {
    if (task.cronTask) {
      task.cronTask.stop();
      task.cronTask.destroy();
    }
    scheduledTasks.delete(key);
  }
  isInitialized = false;
  console.log('すべてのCronタスクを停止しました');
}

/**
 * 現在のスケジュールタスク一覧を取得（デバッグ用）
 */
export function getScheduledTasksInfo(): Array<{ jobId: string; time: string }> {
  return Array.from(scheduledTasks.values()).map(task => ({
    jobId: task.jobId,
    time: task.time,
  }));
}





