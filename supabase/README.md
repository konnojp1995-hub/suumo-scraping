# Supabase データベースセットアップ

このディレクトリには、データベーススキーマのSQLファイルが含まれています。

## テーブル作成手順

### 方法1: Supabaseダッシュボードを使用（推奨）

1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. 左メニューから「SQL Editor」をクリック
4. 「New query」をクリック
5. `schema.sql`ファイルの内容をコピーして貼り付け
6. 「Run」ボタンをクリックして実行
7. エラーがないことを確認

### 方法2: Supabase CLIを使用（開発環境向け）

Supabase CLIがインストールされている場合：

```bash
# Supabase CLIのインストール（未インストールの場合）
npm install -g supabase

# Supabaseにログイン
supabase login

# プロジェクトをリンク
supabase link --project-ref your-project-ref

# SQLを実行
supabase db execute -f schema.sql
```

## テーブル構成

- **scraping_jobs**: スクレイピングジョブ（検索条件とスケジュール設定）
- **scraping_executions**: スクレイピング実行履歴
- **properties**: 物件情報

## トラブルシューティング

### テーブルが既に存在する場合

`CREATE TABLE IF NOT EXISTS`を使用しているため、既存のテーブルはスキップされます。
既存のテーブルを削除して再作成したい場合は、先に以下を実行してください：

```sql
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS scraping_executions CASCADE;
DROP TABLE IF EXISTS scraping_jobs CASCADE;
```

その後、`schema.sql`を実行してください。

### RLSポリシーのエラー

既にポリシーが存在する場合は、`DROP POLICY IF EXISTS`で削除してから再作成されます。
エラーが出る場合は、手動で既存のポリシーを削除してください。


