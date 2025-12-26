import { NextRequest, NextResponse } from 'next/server';
import { initCronOnStartup } from '@/lib/init-cron-on-startup';

/**
 * Cronエンドポイント
 * このエンドポイントは外部のCronサービス（例: cron-job.org, EasyCron等）から
 * 定期的に呼び出されることを想定しています。
 * 
 * 呼び出し例:
 * - 9:15に実行: GET /api/cron?time=09:15:00
 * - 22:15に実行: GET /api/cron?time=22:15:00
 * 
 * または、Authorizationヘッダーに設定したトークンで認証することもできます
 */
export async function GET(request: NextRequest) {
  try {
    // 開発環境では、初回アクセス時にスケジューラーを初期化
    if (process.env.NODE_ENV !== 'production') {
      await initCronOnStartup();
    }

    // 認証トークンの確認（オプション）
    const authToken = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (expectedToken && authToken !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const time = searchParams.get('time');

    if (!time) {
      // 現在時刻から実行すべき時間を判定
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${hours}:${minutes}:00`;
      
      // 9:15または22:15の場合のみ実行
      if (currentTime === '09:15:00' || currentTime === '22:15:00') {
        return await executeScheduledJobs(currentTime);
      } else {
        return NextResponse.json({
          success: true,
          message: `現在時刻は${currentTime}です。9:15または22:15に実行してください。`,
        });
      }
    }

    // 指定時刻のジョブを実行
    return await executeScheduledJobs(time);
  } catch (error) {
    console.error('Cron実行エラー:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Cron実行に失敗しました';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

async function executeScheduledJobs(time: string): Promise<NextResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    console.log(`定期実行を開始: ${time}`);
    
    const response = await fetch(`${baseUrl}/api/scheduled-scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ time }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: '定期実行APIの呼び出しに失敗しました',
      }));
      throw new Error(errorData.error);
    }

    const data = await response.json();
    console.log(`定期実行完了: ${time}`, data);

    return NextResponse.json({
      success: true,
      time,
      ...data,
    });
  } catch (error) {
    console.error(`定期実行エラー (${time}):`, error);
    throw error;
  }
}


