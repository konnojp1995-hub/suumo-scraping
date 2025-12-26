# Cursor MCP設定を追加するPowerShellスクリプト
# 実行前に、Personal Access Tokenまたはデータベース接続情報を準備してください

$settingsFile = "$env:APPDATA\Cursor\User\settings.json"
$backupFile = "$settingsFile.backup"

Write-Host "Cursor設定ファイル: $settingsFile" -ForegroundColor Cyan

# バックアップを作成
if (Test-Path $settingsFile) {
    Copy-Item $settingsFile $backupFile -Force
    Write-Host "バックアップを作成しました: $backupFile" -ForegroundColor Green
}

# 現在の設定を読み込み
$settings = @{}
if (Test-Path $settingsFile) {
    try {
        $content = Get-Content $settingsFile -Raw | ConvertFrom-Json
        $settings = $content | ConvertTo-Json -Depth 10 | ConvertFrom-Json
    } catch {
        Write-Host "設定ファイルの読み込みエラー、新規作成します" -ForegroundColor Yellow
        $settings = @{}
    }
} else {
    $settings = @{}
}

# MCP設定を追加（方法1: Supabase公式MCPサーバー）
Write-Host "`nどの方法を使用しますか？" -ForegroundColor Yellow
Write-Host "1. Supabase公式MCPサーバー（Personal Access Tokenが必要）" -ForegroundColor White
Write-Host "2. PostgreSQL MCPサーバー（データベース接続情報が必要）" -ForegroundColor White
$choice = Read-Host "選択 (1 or 2)"

if ($choice -eq "1") {
    $token = Read-Host "Supabase Personal Access Tokenを入力してください"
    
    if (-not $settings.PSObject.Properties['mcpServers']) {
        $settings | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value @{}
    }
    
    $mcpServers = $settings.mcpServers
    if ($null -eq $mcpServers) {
        $mcpServers = @{}
        $settings.mcpServers = $mcpServers
    }
    
    $mcpServers | Add-Member -MemberType NoteProperty -Name "supabase" -Value @{
        command = "npx"
        args = @(
            "-y",
            "@supabase/mcp-server-supabase@latest"
        )
        env = @{
            SUPABASE_ACCESS_TOKEN = $token
        }
    } -Force
    
    Write-Host "`nSupabase公式MCPサーバーの設定を追加しました" -ForegroundColor Green
} elseif ($choice -eq "2") {
    $projectRef = Read-Host "Supabase Project Refを入力してください（例: ebhdownigaslrtoxoigaq）"
    $password = Read-Host "データベースパスワードを入力してください" -AsSecureString
    $passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    )
    
    $connectionString = "postgresql://postgres.$projectRef`:$passwordPlain@db.$projectRef.supabase.co:5432/postgres?sslmode=require"
    
    if (-not $settings.PSObject.Properties['mcpServers']) {
        $settings | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value @{}
    }
    
    $mcpServers = $settings.mcpServers
    if ($null -eq $mcpServers) {
        $mcpServers = @{}
        $settings.mcpServers = $mcpServers
    }
    
    $mcpServers | Add-Member -MemberType NoteProperty -Name "supabase-postgres" -Value @{
        command = "npx"
        args = @(
            "-y",
            "@modelcontextprotocol/server-postgres",
            $connectionString
        )
    } -Force
    
    Write-Host "`nPostgreSQL MCPサーバーの設定を追加しました" -ForegroundColor Green
} else {
    Write-Host "無効な選択です" -ForegroundColor Red
    exit 1
}

# 設定を保存
$settings | ConvertTo-Json -Depth 10 | Set-Content $settingsFile -Encoding UTF8

Write-Host "`n設定ファイルを更新しました" -ForegroundColor Green
Write-Host "Cursorを再起動してください" -ForegroundColor Yellow


