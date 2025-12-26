# GitHub Actions設定ガイド

このプロジェクトでは、UI（ジョブ登録・結果表示）はVercelで実行し、スクレイピング処理はGitHub Actionsで実行する構成になっています。

## アーキテクチャ

```
┌─────────────────┐
│   Vercel (UI)   │
│  - ジョブ登録    │
│  - 結果表示     │
└────────┬────────┘
         │
         │ Supabase (共有データベース)
         │
┌────────▼────────┐
│ GitHub Actions  │
│  - スクレイピング実行 │
│  - Playwright    │
└─────────────────┘
```

## セットアップ手順

### 1. GitHub Secretsの設定

GitHubリポジトリの Settings → Secrets and variables → Actions で以下を追加してください：

#### 必須のSecrets

- `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトのURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabaseの匿名キー
- `SUPABASE_SERVICE_ROLE_KEY`: Supabaseのサービスロールキー（書き込み権限が必要）
- `LINE_CHANNEL_ACCESS_TOKEN`: LINE Messaging APIのチャネルアクセストークン（オプション）
- `NEXT_PUBLIC_BASE_URL`: VercelのアプリケーションURL（例: `https://your-app.vercel.app`）

### 2. ワークフローの確認

`.github/workflows/scrape-scheduled-jobs.yml` が正しく配置されていることを確認してください。

このワークフローは以下のスケジュールで実行されます：
- 毎日 09:15 JST（UTC 00:15）
- 毎日 22:15 JST（UTC 13:15）

### 3. スケジュールの変更

スケジュールを変更する場合は、`.github/workflows/scrape-scheduled-jobs.yml` の `cron` 式を編集してください。

```yaml
schedule:
  - cron: '15 0 * * *'  # UTC 00:15 (JST 09:15)
  - cron: '13 15 * * *' # UTC 13:15 (JST 22:15)
```

**注意**: GitHub ActionsのcronはUTC時刻で指定する必要があります。JST = UTC + 9時間です。

### 4. 手動実行

GitHub Actionsのワークフローは、手動でも実行できます：

1. GitHubリポジトリのページで「Actions」タブをクリック
2. 「Execute Scheduled Scraping Jobs」ワークフローを選択
3. 「Run workflow」ボタンをクリック
4. 「Run workflow」をクリックして実行

### 5. Vercel側の設定

Vercelの環境変数で以下を設定してください：

```env
SCRAPING_EXECUTOR=github-actions
```

この設定により、Vercel環境での定期実行は無効化され、GitHub Actionsでの実行のみが有効になります。

手動実行は引き続きVercel環境でも利用可能です。

## 実行フロー

1. **ジョブ登録**: Vercel UIで定期実行ジョブを登録
2. **スケジュール**: GitHub Actionsが指定時刻に実行
3. **ジョブ取得**: Supabaseから実行すべきジョブを取得
4. **スクレイピング**: Playwrightでスクレイピング実行
5. **重複チェック**: 過去14日間の実行履歴と比較
6. **結果保存**: Supabaseに保存
7. **LINE通知**: 実行結果をLINEに通知（設定されている場合）
8. **結果表示**: Vercel UIで結果を確認

## トラブルシューティング

### ワークフローが実行されない

- GitHub Actionsの無料プランでは、リポジトリがプライベートの場合、実行時間に制限があります
- スケジュールが正しく設定されているか確認してください（UTC時刻）
- ワークフローファイルが `.github/workflows/` ディレクトリに正しく配置されているか確認してください

### スクレイピングが失敗する

- GitHub Secretsが正しく設定されているか確認してください
- Playwrightのブラウザインストールが正常に完了しているか確認してください
- 実行ログを確認してエラー内容を確認してください

### ジョブが実行されない

- Supabaseのデータベースにアクティブな定期実行ジョブが登録されているか確認してください
- ジョブの `is_active` が `true` になっているか確認してください
- 現在時刻とジョブの `schedule_time1` または `schedule_time2` が一致しているか確認してください

## GitHub Actionsの制限

- **無料プラン**: 月間2,000分の実行時間（プライベートリポジトリ）
- **パブリックリポジトリ**: 無制限
- **実行時間**: 最大6時間（このプロジェクトでは15分に制限）

## 関連ファイル

- `.github/workflows/scrape-scheduled-jobs.yml`: GitHub Actionsワークフロー定義
- `frontend/scripts/execute-scheduled-jobs.ts`: スクレイピング実行スクリプト
- `frontend/lib/scraping.ts`: 共通スクレイピングモジュール
- `frontend/app/api/scrape/route.ts`: Vercel APIルート（手動実行用）

