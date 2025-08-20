# PowerShell script to fix import paths in pages

$pagesPath = "src\pages"
$files = Get-ChildItem -Path $pagesPath -Filter "*.tsx"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Fix import paths from './ui/' to '../ui/'
    $content = $content -replace "from '\.\/ui\/", "from '../ui/"
    
    Set-Content $file.FullName -Value $content -NoNewline
    Write-Host "Fixed imports in: $($file.Name)"
}

Write-Host "All page import fixes completed!"
