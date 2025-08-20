# PowerShell script to fix import statements in UI components

$uiPath = "src\ui"
$files = Get-ChildItem -Path $uiPath -Filter "*.tsx"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Fix @radix-ui imports with version specifiers
    $content = $content -replace '@radix-ui/([^@]+)@[0-9]+\.[0-9]+\.[0-9]+', '@radix-ui/$1'
    
    # Fix lucide-react imports with version specifiers
    $content = $content -replace 'lucide-react@[0-9]+\.[0-9]+\.[0-9]+', 'lucide-react'
    
    # Fix class-variance-authority imports with version specifiers
    $content = $content -replace 'class-variance-authority@[0-9]+\.[0-9]+\.[0-9]+', 'class-variance-authority'
    
    # Fix other versioned imports
    $content = $content -replace '([a-z-]+)@[0-9]+\.[0-9]+\.[0-9]+', '$1'
    
    # Fix utils imports (from "./utils" or "utils" to "../hooks/utils")
    $content = $content -replace 'import { ([^}]+) } from "\.\/utils"', 'import { $1 } from "../hooks/utils"'
    $content = $content -replace 'import { ([^}]+) } from "utils"', 'import { $1 } from "../hooks/utils"'
    
    Set-Content $file.FullName -Value $content -NoNewline
    Write-Host "Fixed imports in: $($file.Name)"
}

Write-Host "All import fixes completed!"
