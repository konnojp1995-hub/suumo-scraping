/**
 * Cronスケジューラーの初期化エンドポイント
 * 開発サーバー起動時にこのエンドポイントを呼び出すことで、動的Cronスケジューラーを初期化します
 */

import { NextResponse } from 'next/server';
import { initCronOnStartup } from '@/lib/init-cron-on-startup';

export async function GET() {
  try {
    await initCronOnStartup();
    
    return NextResponse.json({
      success: true,
      message: '動的Cronスケジューラーを初期化しました',
    });
  } catch (error) {
    console.error('Cronスケジューラー初期化エラー:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Cronスケジューラーの初期化に失敗しました';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

