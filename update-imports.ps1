# 批量更新导入路径脚本

$ErrorActionPreference = "Stop"

$srcPath = "D:\.background\tmdb-helper\src"

# 定义路径映射
$pathMappings = @{
    '@/components/common/' = '@/shared/components/ui/'
    '@/components/layouts/' = '@/shared/components/layouts/'
    '@/components/features/' = '@/features/'
    '@/lib/hooks/' = '@/shared/lib/hooks/'
    '@/lib/utils/' = '@/shared/lib/utils/'
    '@/lib/data/' = '@/shared/lib/data/'
    '@/lib/media/' = '@/features/image-processing/lib/'
    '@/lib/platforms/' = '@/features/streaming-nav/lib/'
}

# 获取所有 TypeScript 和 TSX 文件
$files = Get-ChildItem -Path $srcPath -Recurse -Include *.ts,*.tsx

$totalFiles = $files.Count
$processedFiles = 0
$updatedFiles = 0

Write-Host "开始批量更新导入路径..." -ForegroundColor Green
Write-Host "找到 $totalFiles 个文件需要处理" -ForegroundColor Yellow

foreach ($file in $files) {
    $processedFiles++
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    $fileUpdated = $false

    # 应用所有路径映射
    foreach ($oldPath in $pathMappings.Keys) {
        $newPath = $pathMappings[$oldPath]
        if ($content -match [regex]::Escape($oldPath)) {
            $content = $content -replace [regex]::Escape($oldPath), $newPath
            $fileUpdated = $true
        }
    }

    # 如果文件有更新，保存文件
    if ($fileUpdated) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $updatedFiles++
        Write-Host "[$processedFiles/$totalFiles] 已更新: $($file.Name)" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "批量更新完成！" -ForegroundColor Green
Write-Host "处理文件: $processedFiles" -ForegroundColor Yellow
Write-Host "更新文件: $updatedFiles" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green