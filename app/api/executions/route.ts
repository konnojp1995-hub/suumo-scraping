import { NextRequest, NextResponse } from 'next/server';
import { getScrapingExecutions } from '@/app/utils/db-operations';

// GET: 実行履歴一覧を取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const executions = await getScrapingExecutions(limit);
    return NextResponse.json({
      success: true,
      executions,
    });
  } catch (error) {
    console.error('実行履歴一覧取得エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: '実行履歴一覧の取得に失敗しました',
        executions: [],
      },
      { status: 500 }
    );
  }
}


