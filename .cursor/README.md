# Cursor MCP設定

このディレクトリには、CursorのModel Context Protocol (MCP)設定に関するファイルが含まれています。

## 📁 ファイル構成

- `mcp-config-supabase.json` - Supabase公式MCPサーバーの設定テンプレート（方法1）
- `mcp-config-postgres.json` - PostgreSQL MCPサーバーの設定テンプレート（方法2）
- `example-settings-complete.json` - 完全な設定ファイルの例（既存設定あり）
- `HOW_TO_ADD_MCP.md` - 既存設定にMCP設定を追加する方法（**重要**）
- `MCP_SETUP.md` - 詳細なセットアップガイド
- `QUICK_START.md` - クイックスタートガイド（最短手順）
- `SETUP_INSTRUCTIONS.md` - ステップバイステップの手順
- `add-mcp-config.ps1` - 自動設定スクリプト（PowerShell）

## 🚀 クイックスタート

**最も簡単な方法:**

1. `QUICK_START.md` を開いて最短手順を確認
2. SupabaseのPersonal Access Tokenを取得
3. Cursorの設定ファイルにMCP設定を追加
4. Cursorを再起動
5. テーブル作成を試す

詳細は `MCP_SETUP.md` を参照してください。

## ⚙️ 設定ファイルの場所

Windows: `%APPDATA%\Cursor\User\settings.json`
（実際のパス: `C:\Users\konno\AppData\Roaming\Cursor\User\settings.json`）

## 🔧 自動設定スクリプト

PowerShellスクリプト `add-mcp-config.ps1` を使用すると、対話形式でMCP設定を追加できます：

```powershell
cd frontend/.cursor
powershell -ExecutionPolicy Bypass -File add-mcp-config.ps1
```

## 📝 注意事項

- Personal Access Tokenやデータベースパスワードは機密情報です。安全に管理してください。
- 設定を変更した後は、Cursorを再起動してください。
- バックアップは自動的に作成されます（`.backup`拡張子）。

