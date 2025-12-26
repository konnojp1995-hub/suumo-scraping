# ローカル環境での定期実行について

## ⚠️ 現在の実装状況

**重要な点：**
- ローカル環境では、**指定した時間に自動的にスクレイピングは実行されません**
- 現在の実装では、**固定時刻（9:15と22:15）**にのみ実行される仕組みになっています
- `cron-scheduler.ts`の`startCronScheduler()`関数がどこからも呼ばれていないため、ローカルのCronスケジューラーは起動していません

## 📋 現在の実装の動作

### 1. ジョブ登録
- 定期実行ジョブはデータベースに保存されます（`scraping_jobs`テーブル）
- 登録した時間は保存されますが、**自動実行のトリガーにはなりません**

### 2. 実行方法
現在、以下の方法で実行できます：

#### 方法A: 手動でAPIを呼び出す（ローカル環境でのテスト用）
```bash
# PowerShellで実行
curl -X POST http://localhost:3000/api/scheduled-scrape `
  -H "Content-Type: application/json" `
  -d '{\"time\":\"09:15:00\"}'
```

または、特定のジョブIDを指定：
```bash
curl -X POST http://localhost:3000/api/scheduled-scrape `
  -H "Content-Type: application/json" `
  -d '{\"jobId\":\"your-job-id\"}'
```

#### 方法B: Cronエンドポイントを直接呼び出す
```bash
curl http://localhost:3000/api/cron?time=09:15:00
```

#### 方法C: ブラウザから直接アクセス
```
http://localhost:3000/api/cron?time=09:15:00
```

## 🔧 ローカル環境で自動実行させるには

現在の実装では以下のいずれかが必要です：

### オプション1: 動的Cronスケジューラーを実装（推奨）

データベースに保存されているジョブのスケジュールに基づいて、動的にCronジョブを設定する機能を追加します。

**実装が必要な機能：**
- ジョブ登録時に、そのジョブのスケジュールに基づいてCronジョブを作成
- ジョブ更新時に、既存のCronジョブを更新
- ジョブ削除時に、既存のCronジョブを削除

### オプション2: 既存の固定時刻スケジューラーを使用（簡単）

`cron-scheduler.ts`を修正して、アプリケーション起動時に自動的に起動させる：

```typescript
// app/layout.tsx または app/page.tsx で
import { startCronScheduler } from '@/lib/cron-scheduler';

// サーバーサイドでのみ実行
if (typeof window === 'undefined') {
  startCronScheduler();
}
```

**ただし、この方法でも固定時刻（9:15と22:15）にしか実行されません。**

### オプション3: 外部のCronサービスを使用（本番環境向け）

本番環境では、外部のCronサービス（cron-job.org、EasyCron等）を使用して、`/api/cron`エンドポイントを定期的に呼び出す方法が推奨されます。

## 💡 ローカル環境でのテスト方法

### 即座に実行してテストする

1. **特定のジョブを手動実行**
   ```
   POST /api/jobs/{jobId}/execute
   ```
   ブラウザの開発者ツールやcurlで実行

2. **指定時刻のジョブを実行**
   ```
   POST /api/scheduled-scrape
   Body: {"time": "09:15:00"}
   ```

3. **現在時刻のジョブを実行**
   ```
   GET /api/cron?time=09:15:00
   ```

## 🚀 推奨される実装

ローカル環境でユーザーが登録した時間に自動実行させるには、以下のような動的Cronスケジューラーを実装することをお勧めします：

1. ジョブ登録時に、そのジョブの`schedule_time1`と`schedule_time2`に基づいてCronジョブを動的に作成
2. アプリケーション起動時に、データベースからすべてのアクティブなジョブを取得し、それぞれのスケジュールに基づいてCronジョブを設定
3. ジョブ更新・削除時に、対応するCronジョブを更新・削除

この実装を追加しますか？

