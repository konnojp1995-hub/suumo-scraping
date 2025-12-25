import { NextRequest, NextResponse } from 'next/server';
import { getExecutionProperties } from '@/app/utils/db-operations';

// GET: 実行履歴に紐づく物件一覧を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: executionId } = await params;
    const properties = await getExecutionProperties(executionId);

    return NextResponse.json({
      success: true,
      properties,
      count: properties.length,
    });
  } catch (error) {
    console.error('物件一覧取得エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: '物件一覧の取得に失敗しました',
        properties: [],
      },
      { status: 500 }
    );
  }
}


