import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { getScrapingJob } from '@/app/utils/db-operations';
import { updateJobSchedule, removeJobSchedules } from '@/lib/dynamic-cron-scheduler';

const dbClient = supabaseAdmin || supabase;

// GET: ジョブ詳細を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const job = await getScrapingJob(jobId);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: 'ジョブが見つかりません',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (error) {
    console.error('ジョブ詳細取得エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'ジョブ詳細の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

// PUT: ジョブを更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const body = await request.json();
    const { name, search_url, schedule_time1, schedule_time2, is_active } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (search_url !== undefined) updateData.search_url = search_url;
    if (schedule_time1 !== undefined) {
      // 時間形式の統一
      const time1 = schedule_time1.includes(':') && schedule_time1.split(':').length === 2
        ? `${schedule_time1}:00`
        : schedule_time1;
      updateData.schedule_time1 = time1;
    }
    if (schedule_time2 !== undefined) {
      const time2 = schedule_time2.includes(':') && schedule_time2.split(':').length === 2
        ? `${schedule_time2}:00`
        : schedule_time2;
      updateData.schedule_time2 = time2;
    }
    if (is_active !== undefined) updateData.is_active = is_active;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await dbClient
      .from('scraping_jobs')
      .update(updateData)
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      console.error('ジョブ更新エラー:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'ジョブの更新に失敗しました',
        },
        { status: 500 }
      );
    }

    // 定期実行ジョブの場合、Cronスケジューラーを更新
    if (data.job_type === 'scheduled') {
      if (data.is_active) {
        // アクティブな場合、スケジュールを更新
        await updateJobSchedule(jobId, data.schedule_time1, data.schedule_time2);
      } else {
        // 非アクティブな場合、スケジュールを削除
        await removeJobSchedules(jobId);
      }
    }

    return NextResponse.json({
      success: true,
      job: data,
    });
  } catch (error) {
    console.error('ジョブ更新処理中のエラー:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'ジョブの更新に失敗しました';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

// DELETE: ジョブを削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    // 削除前にジョブ情報を取得（Cronスケジューラーから削除するため）
    const job = await getScrapingJob(jobId);

    const { error } = await dbClient
      .from('scraping_jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      console.error('ジョブ削除エラー:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'ジョブの削除に失敗しました',
        },
        { status: 500 }
      );
    }

    // 定期実行ジョブの場合、Cronスケジューラーからも削除
    if (job && (job as any).job_type === 'scheduled') {
      await removeJobSchedules(jobId);
    }

    return NextResponse.json({
      success: true,
      message: 'ジョブを削除しました',
    });
  } catch (error) {
    console.error('ジョブ削除処理中のエラー:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'ジョブの削除に失敗しました';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

