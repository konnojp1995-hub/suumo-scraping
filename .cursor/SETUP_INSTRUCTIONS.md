# Cursor MCP設定 - セットアップ手順

## ステップ1: Supabaseの接続情報を取得

### オプションA: Personal Access Tokenを取得（方法1推奨）

1. https://app.supabase.com/ にログイン
2. 右上のプロフィールアイコン → 「Account Settings」
3. 「Access Tokens」→ 「Generate New Token」
4. トークンをコピー（一度しか表示されません）

### オプションB: データベース接続情報を取得（方法2用）

1. https://app.supabase.com/ にログイン
2. プロジェクトを選択
3. 「Settings」→ 「Database」
4. 「Connection parameters」から以下を確認：
   - Host (例: `db.ebhdownigaslrtoxoigaq.supabase.co`)
   - Port (通常: `5432`)
   - Database (通常: `postgres`)
   - User (例: `postgres.ebhdownigaslrtoxoigaq`)
   - Password (データベースパスワード)

## ステップ2: Cursorの設定ファイルを編集

### 設定ファイルの場所を確認

1. Cursorを開く
2. `Ctrl+Shift+P` でコマンドパレットを開く
3. 「Preferences: Open User Settings (JSON)」を選択

または、以下のパスを直接開く：
- Windows: `%APPDATA%\Cursor\User\settings.json`

### 設定を追加

`mcp-config-supabase.json`（方法1）または `mcp-config-postgres.json`（方法2）の内容を、Cursorの設定ファイルに追加またはマージしてください。

**重要**: プレースホルダー（`YOUR_SUPABASE_PERSONAL_ACCESS_TOKEN_HERE` など）を実際の値に置き換えてください。

## ステップ3: Cursorを再起動

設定を反映させるため、Cursorを完全に終了して再起動してください。

## ステップ4: 接続確認

Cursor内で以下を試してください：

```
Supabaseデータベースに接続できているか確認してください
```

または

```
/mcp
```

## ステップ5: テーブル作成

接続が確認できたら、以下を試してください：

```
supabase/schema.sqlの内容を使って、Supabaseデータベースにテーブルを作成してください
```

詳細は `MCP_SETUP.md` を参照してください。


