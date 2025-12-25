import { NextRequest, NextResponse } from 'next/server';
import { getScrapingExecution } from '@/app/utils/db-operations';

// GET: 実行履歴詳細を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: executionId } = await params;
    const execution = await getScrapingExecution(executionId);

    if (!execution) {
      return NextResponse.json(
        {
          success: false,
          error: '実行履歴が見つかりません',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      execution,
    });
  } catch (error) {
    console.error('実行履歴詳細取得エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: '実行履歴詳細の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}


