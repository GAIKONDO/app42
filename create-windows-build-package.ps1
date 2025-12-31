# Windows環境でのビルド用パッケージ作成スクリプト
# 使用方法: .\create-windows-build-package.ps1

param(
    [string]$ProjectPath = "."
)

Set-Location $ProjectPath

# バージョン情報の取得
$version = "unknown"
if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $version = $packageJson.version
}

$date = Get-Date -Format "yyyyMMdd"
$zipName = "Network-Windows-Build-v${version}-${date}.zip"

Write-Host "=========================================="
Write-Host "Windowsビルド用パッケージ作成"
Write-Host "=========================================="
Write-Host "プロジェクトパス: $(Get-Location)"
Write-Host "バージョン: $version"
Write-Host "日付: $date"
Write-Host "ZIPファイル名: $zipName"
Write-Host ""

# クリーンアップ
Write-Host "1. ビルド成果物のクリーンアップ..."
if (Test-Path "node_modules") {
    Write-Host "   - node_modules/ を削除中..."
    Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path ".next") {
    Write-Host "   - .next/ を削除中..."
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "out") {
    Write-Host "   - out/ を削除中..."
    Remove-Item -Path "out" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "src-tauri\target") {
    Write-Host "   - src-tauri\target/ を削除中..."
    Remove-Item -Path "src-tauri\target" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "src-tauri\Cargo.lock") {
    Write-Host "   - src-tauri\Cargo.lock を削除中..."
    Remove-Item -Path "src-tauri\Cargo.lock" -Force -ErrorAction SilentlyContinue
}

# Mac固有ファイルの削除
Write-Host "   - Mac固有ファイルを削除中..."
Get-ChildItem -Path . -Recurse -Force -ErrorAction SilentlyContinue | Where-Object { 
    $_.Name -eq ".DS_Store" -or $_.Name -like "._*" 
} | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "✓ クリーンアップ完了"
Write-Host ""

# 一時的なZIPファイル作成用ディレクトリ
$tempDir = Join-Path $env:TEMP "network-build-package-$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    Write-Host "2. ファイルのコピー中..."
    
    # ディレクトリのコピー
    $directories = @(
        "app",
        "components",
        "lib",
        "types",
        "scripts",
        "data",
        "docs",
        "src-tauri\src",
        "src-tauri\icons",
        "src-tauri\resources",
        "src-tauri\capabilities"
    )
    
    foreach ($dir in $directories) {
        if (Test-Path $dir) {
            $destDir = Join-Path $tempDir $dir
            $parentDir = Split-Path $destDir -Parent
            if (-not (Test-Path $parentDir)) {
                New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
            }
            Copy-Item -Path $dir -Destination $destDir -Recurse -Force
            Write-Host "   ✓ $dir/"
        }
    }
    
    # ファイルのコピー
    $files = @(
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "next.config.js",
        "next-env.d.ts",
        ".gitignore",
        "README_INSTALL.md",
        "DISTRIBUTION_README.md",
        "src-tauri\Cargo.toml",
        "src-tauri\build.rs",
        "src-tauri\tauri.conf.json",
        "src-tauri\tauri.conf.dev.json",
        "src-tauri\template-data.json"
    )
    
    foreach ($file in $files) {
        if (Test-Path $file) {
            $destFile = Join-Path $tempDir $file
            $parentDir = Split-Path $destFile -Parent
            if (-not (Test-Path $parentDir)) {
                New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
            }
            Copy-Item -Path $file -Destination $destFile -Force
            Write-Host "   ✓ $file"
        }
    }
    
    # Windowsビルドスクリプトのコピー
    if (Test-Path "build-windows-clean.ps1") {
        Copy-Item -Path "build-windows-clean.ps1" -Destination (Join-Path $tempDir "build-windows-clean.ps1") -Force
        Write-Host "   ✓ build-windows-clean.ps1"
    }
    
    Write-Host "✓ ファイルコピー完了"
    Write-Host ""
    
    # ZIPファイルの作成
    Write-Host "3. ZIPファイルの作成中..."
    Write-Host "   これには数分かかる場合があります..."
    
    $zipPath = Join-Path (Get-Location) $zipName
    if (Test-Path $zipPath) {
        Remove-Item -Path $zipPath -Force
    }
    
    Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force
    
    if (Test-Path $zipPath) {
        Write-Host "✓ ZIPファイル作成完了"
    } else {
        Write-Host "✗ ZIPファイル作成に失敗しました"
        exit 1
    }
    Write-Host ""
    
    # ファイルサイズの確認
    $fileInfo = Get-Item $zipPath
    $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
    
    Write-Host "4. ファイル情報:"
    Write-Host "   ファイル名: $zipName"
    Write-Host "   サイズ: $sizeMB MB"
    Write-Host "   場所: $zipPath"
    Write-Host ""
    
} finally {
    # 一時ディレクトリの削除
    if (Test-Path $tempDir) {
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "=========================================="
Write-Host "✓ パッケージ作成完了"
Write-Host "=========================================="
Write-Host ""
Write-Host "次のステップ:"
Write-Host "1. ZIPファイルをWindows環境に転送"
Write-Host "   ファイル: $zipName"
Write-Host ""
Write-Host "2. Windows環境でZIPファイルを展開"
Write-Host "   PowerShell: Expand-Archive -Path `"$zipName`" -DestinationPath `"C:\Projects\Network`""
Write-Host ""
Write-Host "3. Windows環境で依存関係をインストール"
Write-Host "   PowerShell: cd C:\Projects\Network && npm install"
Write-Host ""
Write-Host "4. Windows環境でビルド"
Write-Host "   PowerShell: .\build-windows-clean.ps1"
Write-Host ""
Write-Host "または個別に実行:"
Write-Host "   PowerShell: npm run build"
Write-Host "   PowerShell: npm run tauri:build"
Write-Host ""

