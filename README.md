# SUUMO 物件スクレイピングツール

SUUMOの検索結果URLから物件情報を抽出・管理するツールです。

## 機能

- **手動実行**: SUUMOの検索結果URLから物件情報を即座に抽出（最大50件）
- **定期実行**: ユーザーが指定した時刻に自動実行される定期実行ジョブを登録・管理（開発環境では自動実行、本番環境では外部Cronサービス推奨）
- **重複チェック**: 定期実行時、過去の実行履歴と比較して重複物件を自動除外
- **結果管理**: 実行履歴と抽出した物件情報を確認・CSV出力
- **LINE通知**: 定期実行完了時にLINEへ通知（詳細画面へのURL付き）

## セットアップ

### 1. 依存パッケージのインストール

```bash
cd frontend
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LINE Messaging API設定
LINE_CHANNEL_ACCESS_TOKEN=your-channel-access-token

# アプリケーションURL（本番環境用）
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Cron認証トークン（オプション、本番環境で推奨）
CRON_SECRET_TOKEN=your-secret-token
```

### 3. Supabaseデータベースのセットアップ

`supabase/schema.sql`ファイルをSupabaseのSQLエディタで実行してください。

**手順:**
1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. 左メニューから「SQL Editor」をクリック
4. 「New query」をクリック
5. `supabase/schema.sql`ファイルの内容をコピーして貼り付け
6. 「Run」ボタンをクリックして実行

詳細は `supabase/README.md` を参照してください。

### 4. Playwrightのセットアップ

```bash
npx playwright install chromium
```

## 使用方法

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

**自動実行機能について**: 開発環境では、定期実行ジョブを登録すると、指定した時刻に自動的にスクレイピングが実行されます。詳細は `AUTO_SCHEDULE_GUIDE.md` を参照してください。

### 定期実行の設定（本番環境）

本番環境では、外部のCronサービス（例: cron-job.org, EasyCron等）を使用して、以下のURLを定期的に呼び出してください：

- 9:15に実行: `GET https://your-domain.com/api/cron?time=09:15:00`
- 22:15に実行: `GET https://your-domain.com/api/cron?time=22:15:00`

認証トークンを設定している場合は、リクエストヘッダーに以下を追加してください：

```
Authorization: Bearer your-secret-token
```

## 画面構成

- **ホーム** (`/`): 各機能へのナビゲーション
- **手動実行** (`/manual`): SUUMO URLから物件情報を即座に抽出
- **定期実行** (`/scheduled`): 定期実行ジョブの登録・管理
- **結果一覧** (`/results`): 実行履歴の一覧表示
- **結果詳細** (`/results/[id]`): 実行結果の詳細と物件一覧

## API エンドポイント

- `POST /api/scrape`: スクレイピング実行（手動/定期）
- `GET /api/jobs`: ジョブ一覧取得
- `POST /api/jobs`: ジョブ作成
- `GET /api/jobs/[id]`: ジョブ詳細取得
- `PUT /api/jobs/[id]`: ジョブ更新
- `DELETE /api/jobs/[id]`: ジョブ削除
- `POST /api/jobs/[id]/execute`: ジョブ手動実行
- `GET /api/executions`: 実行履歴一覧取得
- `GET /api/executions/[id]`: 実行履歴詳細取得
- `GET /api/executions/[id]/properties`: 物件一覧取得
- `POST /api/scheduled-scrape`: 定期実行用スクレイピング
- `GET /api/cron`: Cron実行エンドポイント

## 注意事項

- スクレイピングは最大50件まで抽出します
- 定期実行時は、過去の実行履歴と比較して重複物件を自動除外します
- LINE通知は定期実行時のみ送信されます
- スクレイピングには時間がかかる場合があります（最大5分）
