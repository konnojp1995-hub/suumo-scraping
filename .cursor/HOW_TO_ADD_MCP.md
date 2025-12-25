# 既存の設定ファイルにMCP設定を追加する方法

## 現在の設定ファイル

```json
{
    "window.commandCenter": true
}
```

## 追加後の設定ファイル

以下のように`mcpServers`を追加します：

```json
{
    "window.commandCenter": true,
    "mcpServers": {
        "supabase": {
            "command": "npx",
            "args": [
                "-y",
                "@supabase/mcp-server-supabase@latest"
            ],
            "env": {
                "SUPABASE_ACCESS_TOKEN": "ここに取得したPersonal Access Tokenを貼り付け"
            }
        }
    }
}
```

## 重要なポイント

1. **カンマ（`,`）を忘れずに**: `"window.commandCenter": true`の後にカンマを追加
2. **JSON形式を保つ**: すべての文字列はダブルクォートで囲む
3. **トークンを置き換える**: `SUPABASE_ACCESS_TOKEN`の値を実際のトークンに置き換える

## 完全な例（方法1: Supabase公式MCPサーバー）

```json
{
    "window.commandCenter": true,
    "mcpServers": {
        "supabase": {
            "command": "npx",
            "args": [
                "-y",
                "@supabase/mcp-server-supabase@latest"
            ],
            "env": {
                "SUPABASE_ACCESS_TOKEN": "sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            }
        }
    }
}
```

## 完全な例（方法2: PostgreSQL MCPサーバー）

もし方法2を使う場合：

```json
{
    "window.commandCenter": true,
    "mcpServers": {
        "supabase-postgres": {
            "command": "npx",
            "args": [
                "-y",
                "@modelcontextprotocol/server-postgres",
                "postgresql://postgres.ebhdownigaslrtoxoigaq:your-password@db.ebhdownigaslrtoxoigaq.supabase.co:5432/postgres?sslmode=require"
            ]
        }
    }
}
```

**注意**: `postgresql://`の接続文字列内の`your-password`を実際のデータベースパスワードに置き換えてください。

## 手順

1. Cursorで `Ctrl+Shift+P` → 「Preferences: Open User Settings (JSON)」
2. または直接開く: `%APPDATA%\Cursor\User\settings.json`
3. 上記の形式で`mcpServers`を追加
4. ファイルを保存（`Ctrl+S`）
5. Cursorを再起動

## JSONの構文エラーを避けるために

- カンマは最後のプロパティには付けない
- すべての文字列はダブルクォートで囲む
- 中括弧`{}`と角括弧`[]`のバランスを取る

## 確認方法

設定ファイルを保存した後、Cursorを再起動して、以下を試してください：

```
Supabaseデータベースに接続できているか確認してください
```


