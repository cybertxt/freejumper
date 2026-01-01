# FreeJumper Extension Build Script (PowerShell)
# Used to create Chrome Web Store release package

# Get version number
$manifestContent = Get-Content -Path "manifest.json" -Raw | ConvertFrom-Json
$VERSION = $manifestContent.version
$ZIP_NAME = "freejumper-v${VERSION}.zip"

Write-Host "Building FreeJumper v${VERSION}..." -ForegroundColor Cyan

# Clean up old build files
if (Test-Path $ZIP_NAME) {
    Write-Host "Removing old build file: $ZIP_NAME" -ForegroundColor Yellow
    Remove-Item $ZIP_NAME -Force
}

# Save current directory path
$ORIGINAL_DIR = (Get-Location).Path

# Create temporary directory
$TEMP_DIR = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
Write-Host "Created temporary directory: $TEMP_DIR" -ForegroundColor Gray

# Copy files (excluding unnecessary files)
Write-Host 'Copying files...' -ForegroundColor Gray

# Files and directories to exclude
$excludeFiles = @('README.md', 'PUBLISHING.md', '.zipignore', 'build.sh', 'build.ps1', '.gitignore', '.DS_Store')
$excludeDirs = @('.git', 'node_modules')
$excludePatterns = @('*.log', '*.tmp')
$excludePaths = @('icons/generate-icons.html', 'icons/README.md')

Get-ChildItem -Path $ORIGINAL_DIR -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Substring($ORIGINAL_DIR.Length + 1)
    $relativePathNormalized = $relativePath.Replace('\', '/')
    $fileName = Split-Path $relativePath -Leaf
    
    $shouldExclude = $false
    
    # Check filename
    if ($excludeFiles -contains $fileName) {
        $shouldExclude = $true
    }
    
    # Check full path
    if ($excludePaths -contains $relativePathNormalized) {
        $shouldExclude = $true
    }
    
    # Check parent directory
    foreach ($excludeDir in $excludeDirs) {
        if ($relativePathNormalized -like "$excludeDir/*" -or $relativePathNormalized -eq $excludeDir) {
            $shouldExclude = $true
            break
        }
    }
    
    # Check file extension patterns
    foreach ($pattern in $excludePatterns) {
        if ($fileName -like $pattern) {
            $shouldExclude = $true
            break
        }
    }
    
    if (-not $shouldExclude) {
        $destPath = Join-Path $TEMP_DIR $relativePath
        $destDir = Split-Path $destPath -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item $_.FullName -Destination $destPath -Force
    }
}

# Create ZIP file
Write-Host "Creating ZIP file: $ZIP_NAME" -ForegroundColor Gray
$zipPath = Join-Path $ORIGINAL_DIR $ZIP_NAME
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# Use Compress-Archive to create ZIP
Compress-Archive -Path "$TEMP_DIR\*" -DestinationPath $zipPath -Force

# Clean up temporary directory
Remove-Item $TEMP_DIR -Recurse -Force

# Display file information
$fileInfo = Get-Item $zipPath
$fileSize = [math]::Round($fileInfo.Length / 1KB, 2)
$fileSizeFormatted = if ($fileSize -lt 1024) { "$fileSize KB" } else { "$([math]::Round($fileSize / 1KB, 2)) MB" }

Write-Host 'Build completed!' -ForegroundColor Green
Write-Host "File: $ZIP_NAME" -ForegroundColor Cyan
Write-Host "Size: $fileSizeFormatted" -ForegroundColor Cyan

# Check file size (Chrome Web Store limit is 10MB)
$MAX_SIZE = 10 * 1024 * 1024 # 10MB
$FILE_SIZE_BYTES = $fileInfo.Length

if ($FILE_SIZE_BYTES -gt $MAX_SIZE) {
    Write-Host 'Warning: File size exceeds 10MB, may need optimization' -ForegroundColor Yellow
} else {
    Write-Host 'File size is within limits (< 10MB)' -ForegroundColor Green
}

Write-Host ""
Write-Host 'Next steps:' -ForegroundColor Cyan
Write-Host '1. Verify ZIP file contents are correct'
Write-Host '2. Test extension in developer mode'
Write-Host '3. Upload to Chrome Web Store Developer Console'
Write-Host ""
Write-Host 'Upload URL: https://chrome.google.com/webstore/devconsole' -ForegroundColor Cyan

