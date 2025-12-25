# クイックスタート: Supabase MCP設定

## 最短手順（方法1: Supabase公式MCPサーバー）

### 1. Personal Access Tokenを取得（5分）

1. https://app.supabase.com/ にログイン
2. 右上のプロフィールアイコン → 「Account Settings」
3. 左メニュー「Access Tokens」→ 「Generate New Token」
4. トークンをコピー

### 2. Cursor設定を更新（2分）

1. Cursorで `Ctrl+Shift+P` → 「Preferences: Open User Settings (JSON)」
2. または直接開く: `%APPDATA%\Cursor\User\settings.json`
   （実際のパス: `C:\Users\konno\AppData\Roaming\Cursor\User\settings.json`）

3. 既存の設定（`window.commandCenter`など）がある場合は、**カンマを追加**して`mcpServers`を追加：

**既存の設定がある場合:**
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
                "SUPABASE_ACCESS_TOKEN": "ここに取得したトークンを貼り付け"
            }
        }
    }
}
```

**重要**: `"window.commandCenter": true`の後の**カンマ（`,`）**を忘れずに！

詳細は `HOW_TO_ADD_MCP.md` を参照してください。

### 3. Cursorを再起動

### 4. テーブル作成を試す

Cursor内で以下を入力：

```
frontend/supabase/schema.sqlの内容を使って、Supabaseデータベースにテーブルを作成してください
```

---

## うまくいかない場合（方法2: PostgreSQL直接接続）

詳細は `MCP_SETUP.md` の「方法2」を参照してください。

