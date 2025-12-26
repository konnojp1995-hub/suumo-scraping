# Supabaseデータベース接続テスト方法

## MCPサーバー経由での接続確認（Cursorが直接Supabaseに接続）

MCPサーバーが正しく設定されている場合、Cursorから直接Supabaseデータベースにアクセスできます。

### テスト方法

以下のようなクエリをCursorに送信してください：

```
Supabaseデータベースに接続して、以下のテーブルが存在するか確認してください:
1. scraping_jobs
2. scraping_executions  
3. properties

各テーブルのレコード数も取得してください。
```

### 期待される結果

- MCPサーバーが正しく設定されていれば、CursorがSupabaseに接続してテーブル情報を返します
- テーブルが存在する場合は、各テーブルのレコード数が表示されます
- テーブルが存在しない場合は、エラーメッセージが表示されます

### 問題が発生した場合

1. **MCPサーバーが起動していない**
   - Cursorの設定ファイル（`%APPDATA%\Cursor\User\settings.json`）で`mcpServers`が正しく設定されているか確認
   - Cursorを再起動

2. **Personal Access Tokenが無効**
   - Supabase Dashboard > Account Settings > Access Tokens で新しいトークンを生成
   - 設定ファイルの`SUPABASE_ACCESS_TOKEN`を更新

3. **テーブルが存在しない**
   - `frontend/supabase/schema.sql`をSupabaseのSQLエディタで実行

---

## APIエンドポイント経由での接続確認（推奨）

### 1. 開発サーバーを起動

```bash
cd frontend
npm run dev
```

### 2. テストエンドポイントにアクセス

ブラウザまたはcurlで以下にアクセス：

```
http://localhost:3000/api/test-db
```

または、PowerShellで：

```powershell
curl http://localhost:3000/api/test-db
```

### 期待されるレスポンス

#### ✅ 成功時（すべてのテーブルが存在する場合）

```json
{
  "status": "success",
  "message": "✅ データベース接続成功！すべてのテーブルが存在します。",
  "connection": "success",
  "timestamp": "2025-01-XX...",
  "tables": {
    "scraping_jobs": {
      "exists": true,
      "count": 0,
      "error": null
    },
    "scraping_executions": {
      "exists": true,
      "count": 0,
      "error": null
    },
    "properties": {
      "exists": true,
      "count": 0,
      "error": null
    }
  }
}
```

#### ⚠️ 一部のテーブルが存在しない場合

```json
{
  "status": "partial",
  "message": "⚠️ データベース接続は成功しましたが、一部のテーブルが見つかりません。",
  "suggestion": "frontend/supabase/schema.sqlをSupabaseのSQLエディタで実行してください。",
  ...
}
```

#### ❌ 接続エラーの場合

```json
{
  "status": "error",
  "message": "❌ データベース接続エラー",
  "error": "...",
  "suggestion": "環境変数（NEXT_PUBLIC_SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY）が正しく設定されているか確認してください。"
}
```

---

## テーブル作成が必要な場合

テーブルが存在しない場合は、`frontend/supabase/schema.sql`をSupabaseのSQLエディタで実行してください。

**手順:**
1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. 左メニューから「SQL Editor」をクリック
4. 「New query」をクリック
5. `frontend/supabase/schema.sql`ファイルの内容をコピーして貼り付け
6. 「Run」ボタンをクリックして実行

---

## トラブルシューティング

### 環境変数が設定されていない

`.env.local`ファイルが存在し、以下の環境変数が設定されているか確認：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 接続エラーが発生する

1. Supabase URLが正しいか確認
2. Service Role Keyが正しいか確認（Supabase Dashboard > Settings > API）
3. ネットワーク接続を確認

### テーブルが見つからない

`frontend/supabase/schema.sql`をSupabaseのSQLエディタで実行してください。

