import { NextRequest, NextResponse } from 'next/server';
import { 
  getScheduledJobsByTime, 
  getScrapingJob,
  ScrapingJob 
} from '@/app/utils/db-operations';

// POST: 定期実行用のスクレイピングAPI
// このAPIはCronから呼び出される
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { time, jobId } = body;

    // timeまたはjobIdが指定されている必要がある
    if (!time && !jobId) {
      return NextResponse.json(
        {
          success: false,
          error: 'timeまたはjobIdが必要です',
        },
        { status: 400 }
      );
    }

    let jobsToExecute: ScrapingJob[] = [];

    if (jobId) {
      // 特定のジョブを実行
      const job = await getScrapingJob(jobId);
      if (job && (job as any).job_type === 'scheduled' && (job as any).is_active) {
        jobsToExecute = [job as ScrapingJob];
      }
    } else if (time) {
      // 指定時刻に実行すべきジョブを取得
      jobsToExecute = await getScheduledJobsByTime(time);
    }

    if (jobsToExecute.length === 0) {
      return NextResponse.json({
        success: true,
        message: '実行すべきジョブがありません',
        executed: 0,
      });
    }

    // 各ジョブを実行
    const results = [];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    for (const job of jobsToExecute) {
      try {
        console.log(`ジョブ実行開始: ${job.name} (ID: ${job.id})`);
        
        const scrapeResponse = await fetch(`${baseUrl}/api/scrape`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: job.search_url,
            jobId: job.id,
            executionType: 'scheduled',
          }),
        });

        if (scrapeResponse.ok) {
          const scrapeData = await scrapeResponse.json();
          results.push({
            jobId: job.id,
            jobName: job.name,
            success: true,
            executionId: scrapeData.executionId,
            count: scrapeData.count,
          });
        } else {
          const errorData = await scrapeResponse.json().catch(() => ({
            error: 'スクレイピングに失敗しました',
          }));
          results.push({
            jobId: job.id,
            jobName: job.name,
            success: false,
            error: errorData.error,
          });
        }
      } catch (error) {
        console.error(`ジョブ実行エラー (${job.name}):`, error);
        results.push({
          jobId: job.id,
          jobName: job.name,
          success: false,
          error: error instanceof Error ? error.message : '不明なエラー',
        });
      }
    }

    return NextResponse.json({
      success: true,
      executed: jobsToExecute.length,
      results,
    });
  } catch (error) {
    console.error('定期実行処理エラー:', error);
    const errorMessage =
      error instanceof Error ? error.message : '定期実行処理に失敗しました';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

