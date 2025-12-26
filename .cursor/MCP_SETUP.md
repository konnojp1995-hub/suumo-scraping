# Supabase MCPサーバー セットアップガイド

このガイドでは、CursorからSupabaseのデータベースに直接接続して、テーブル作成などの操作を行えるようにする手順を説明します。

## 方法1: Supabase公式MCPサーバーを使用（推奨）

Supabase公式のMCPサーバーを使用する方法です。Personal Access Tokenが必要です。

### 1. Supabaseの個人アクセストークンを取得

1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. 右上のプロフィールアイコンをクリック
3. 「Account Settings」を選択
4. 左メニューから「Access Tokens」を選択
5. 「Generate New Token」をクリック
6. トークンに名前を付けて（例: "Cursor MCP"）作成
7. 生成されたトークンをコピー（一度しか表示されないので注意）

### 2. CursorのMCP設定を更新

1. Cursorを開く
2. `Ctrl+Shift+P` でコマンドパレットを開く
3. 「Preferences: Open User Settings (JSON)」を選択
4. または、設定ファイルを直接開く：
   - Windows: `%APPDATA%\Cursor\User\settings.json`
   - macOS: `~/Library/Application Support/Cursor/User/settings.json`
   - Linux: `~/.config/Cursor/User/settings.json`

5. 以下の設定を追加：

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "ここに取得した個人アクセストークンを貼り付け"
      }
    }
  }
}
```

**注意**: Cursorのバージョンによっては、MCP設定が別の場所にある場合があります：
- `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

### 3. Cursorを再起動

設定を反映させるため、Cursorを完全に再起動してください。

---

## 方法2: PostgreSQL MCPサーバーを使用（代替方法）

Supabaseのデータベースに直接PostgreSQL接続する方法です。データベース接続情報が必要です。

### 1. Supabaseのデータベース接続情報を取得

1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. 左メニューから「Settings」をクリック
4. 「Database」を選択
5. 「Connection parameters」セクションで以下の情報を確認：
   - **Host**: `db.[PROJECT_REF].supabase.co`（例: `db.ebhdownigaslrtoxoigaq.supabase.co`）
   - **Port**: `5432`
   - **Database**: `postgres`
   - **User**: `postgres.[PROJECT_REF]`（例: `postgres.ebhdownigaslrtoxoigaq`）
   - **Password**: データベースパスワード（プロジェクト作成時に設定したもの、または「Reset database password」で再設定可能）

### 2. 接続文字列を作成

以下の形式で接続文字列を作成します：

```
postgresql://postgres.[PROJECT_REF]:[DATABASE_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require
```

例：
```
postgresql://postgres.ebhdownigaslrtoxoigaq:your-password@db.ebhdownigaslrtoxoigaq.supabase.co:5432/postgres?sslmode=require
```

### 3. CursorのMCP設定を更新

以下の設定を追加：

```json
{
  "mcpServers": {
    "supabase-postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres.[PROJECT_REF]:[DATABASE_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require"
      ]
    }
  }
}
```

### 4. Cursorを再起動

設定を反映させるため、Cursorを完全に再起動してください。

---

## 接続確認とテーブル作成

### 接続確認

Cursor内で以下を試してみてください：

```
Supabaseデータベースに接続できているか確認してください
```

### テーブル作成

接続が確認できたら、以下のように指示してください：

```
supabase/schema.sqlの内容を使って、Supabaseデータベースにテーブルを作成してください
```

または、直接SQLを指定することもできます。

---

## トラブルシューティング

### MCPサーバーが接続できない場合

1. **設定ファイルの場所確認**: Cursorのバージョンによって設定ファイルの場所が異なる場合があります
2. **トークン/パスワードの確認**: 正しく設定されているか確認
3. **パッケージの確認**: `npx @supabase/mcp-server-supabase@latest` または `npx @modelcontextprotocol/server-postgres` が正常に実行できるか確認
4. **Cursorのログ確認**: Cursorのデベロッパーツール（`Ctrl+Shift+I`）でエラーを確認
5. **Cursorの再起動**: 設定変更後は必ず再起動

### どちらの方法を使うべきか

- **方法1（Supabase公式）**: より簡単で、Supabaseの機能をフルに活用できる
- **方法2（PostgreSQL直接）**: より確実で、標準的なPostgreSQL接続を使用

まずは方法1を試し、うまくいかない場合は方法2を試してください。


