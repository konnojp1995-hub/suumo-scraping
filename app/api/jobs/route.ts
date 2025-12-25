import { NextRequest, NextResponse } from 'next/server';
import {
  createScrapingJob,
  getAllScrapingJobs,
  getScrapingJob,
} from '@/app/utils/db-operations';
import { updateJobSchedule } from '@/lib/dynamic-cron-scheduler';

// GET: ジョブ一覧を取得
export async function GET() {
  try {
    const jobs = await getAllScrapingJobs();
    return NextResponse.json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error('ジョブ一覧取得エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'ジョブ一覧の取得に失敗しました',
        jobs: [],
      },
      { status: 500 }
    );
  }
}

// POST: 新しいジョブを作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, search_url, job_type, schedule_time1, schedule_time2 } = body;

    if (!name || !search_url || !job_type) {
      return NextResponse.json(
        {
          success: false,
          error: '必須パラメータが不足しています（name, search_url, job_type）',
        },
        { status: 400 }
      );
    }

    if (job_type !== 'manual' && job_type !== 'scheduled') {
      return NextResponse.json(
        {
          success: false,
          error: 'job_typeは"manual"または"scheduled"である必要があります',
        },
        { status: 400 }
      );
    }

    // 定期実行の場合、スケジュール時間の検証
    if (job_type === 'scheduled') {
      if (!schedule_time1 || !schedule_time2) {
        return NextResponse.json(
          {
            success: false,
            error: '定期実行の場合、schedule_time1とschedule_time2が必要です',
          },
          { status: 400 }
        );
      }

      // 時間形式の検証（HH:MM:SSまたはHH:MM）
      const timePattern = /^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
      if (!timePattern.test(schedule_time1) || !timePattern.test(schedule_time2)) {
        return NextResponse.json(
          {
            success: false,
            error: 'スケジュール時間の形式が正しくありません（HH:MM:SSまたはHH:MM形式）',
          },
          { status: 400 }
        );
      }

      // 時間をHH:MM:SS形式に統一
      const time1 = schedule_time1.includes(':') && schedule_time1.split(':').length === 2
        ? `${schedule_time1}:00`
        : schedule_time1;
      const time2 = schedule_time2.includes(':') && schedule_time2.split(':').length === 2
        ? `${schedule_time2}:00`
        : schedule_time2;

      const jobId = await createScrapingJob({
        name,
        search_url,
        job_type: 'scheduled',
        schedule_time1: time1,
        schedule_time2: time2,
        is_active: true,
      });

      if (!jobId) {
        return NextResponse.json(
          {
            success: false,
            error: 'ジョブの作成に失敗しました',
          },
          { status: 500 }
        );
      }

      const job = await getScrapingJob(jobId);
      
      // 定期実行の場合、Cronスケジューラーに登録
      if (job && (job as any).job_type === 'scheduled') {
        await updateJobSchedule(jobId, time1, time2);
      }
      
      return NextResponse.json({
        success: true,
        job,
      });
    } else {
      // 手動実行の場合
      const jobId = await createScrapingJob({
        name,
        search_url,
        job_type: 'manual',
        is_active: true,
      });

      if (!jobId) {
        return NextResponse.json(
          {
            success: false,
            error: 'ジョブの作成に失敗しました',
          },
          { status: 500 }
        );
      }

      const job = await getScrapingJob(jobId);
      return NextResponse.json({
        success: true,
        job,
      });
    }
  } catch (error) {
    console.error('ジョブ作成エラー:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'ジョブの作成に失敗しました';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}


