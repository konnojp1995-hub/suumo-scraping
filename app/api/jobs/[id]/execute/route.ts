import { NextRequest, NextResponse } from 'next/server';
import { getScrapingJob } from '@/app/utils/db-operations';

// POST: ジョブを手動実行
export async function POST(
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

    // スクレイピングAPIを呼び出し
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const scrapeResponse = await fetch(`${baseUrl}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: job.search_url,
        jobId: jobId,
        executionType: 'manual',
      }),
    });

    if (!scrapeResponse.ok) {
      const errorData = await scrapeResponse.json().catch(() => ({
        error: 'スクレイピングに失敗しました',
      }));
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || 'スクレイピングに失敗しました',
        },
        { status: scrapeResponse.status }
      );
    }

    const scrapeData = await scrapeResponse.json();
    return NextResponse.json({
      success: true,
      execution: {
        executionId: scrapeData.executionId,
        properties: scrapeData.properties,
        count: scrapeData.count,
        totalScraped: scrapeData.totalScraped,
        duplicateCount: scrapeData.duplicateCount,
      },
    });
  } catch (error) {
    console.error('ジョブ実行エラー:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'ジョブの実行に失敗しました';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}


