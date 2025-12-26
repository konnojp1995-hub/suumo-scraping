/**
 * 開発環境用のCronスケジューラー
 * 本番環境では外部のCronサービスを使用することを推奨します
 */

let cronScheduler: any = null;

/**
 * Cronスケジューラーを開始（開発環境用）
 */
export async function startCronScheduler() {
  // 本番環境では実行しない（外部のCronサービスを使用するため）
  if (process.env.NODE_ENV === 'production') {
    console.log('本番環境では外部のCronサービスを使用してください');
    return;
  }

  try {
    const cron = await import('node-cron');
    
    // 既にスケジューラーが起動している場合はスキップ
    if (cronScheduler) {
      console.log('Cronスケジューラーは既に起動しています');
      return;
    }

    console.log('開発環境用Cronスケジューラーを起動します');

    // 9:15に実行
    cron.schedule('15 9 * * *', async () => {
      console.log('定期実行開始: 09:15:00');
      await executeCron('09:15:00');
    });

    // 22:15に実行
    cron.schedule('15 22 * * *', async () => {
      console.log('定期実行開始: 22:15:00');
      await executeCron('22:15:00');
    });

    cronScheduler = true;
    console.log('Cronスケジューラーを起動しました（9:15と22:15に実行）');
  } catch (error) {
    console.error('Cronスケジューラーの起動に失敗しました:', error);
  }
}

async function executeCron(time: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/cron?time=${time}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Cron実行エラー:', errorData);
    } else {
      const data = await response.json();
      console.log('Cron実行成功:', data);
    }
  } catch (error) {
    console.error('Cron実行エラー:', error);
  }
}






