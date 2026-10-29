# Gamze Eğitmen içerik hattı — Windows kurulumu
# Kullanım (PowerShell, repo klasöründe):  powershell -ExecutionPolicy Bypass -File .\kurulum.ps1
$ErrorActionPreference = "Stop"

function Kur($id, $komut) {
  if (Get-Command $komut -ErrorAction SilentlyContinue) { Write-Host "  [var] $komut" -ForegroundColor DarkGray; return }
  Write-Host "  [kuruluyor] $id" -ForegroundColor Cyan
  winget install --id $id -e --accept-source-agreements --accept-package-agreements --silent
}

Write-Host "1/5 Temel programlar" -ForegroundColor Yellow
Kur "Git.Git" "git"
Kur "OpenJS.NodeJS.LTS" "node"
Kur "Python.Python.3.12" "python"
Kur "Gyan.FFmpeg" "ffmpeg"
Kur "astral-sh.uv" "uv"
Kur "Google.Chrome" "chrome"
# Yeni kurulan programların PATH'e girmesi için
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

Write-Host "2/5 Claude Code" -ForegroundColor Yellow
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) { npm install -g @anthropic-ai/claude-code } else { Write-Host "  [var] claude" -ForegroundColor DarkGray }

Write-Host "3/5 Python paketleri (araçlar için)" -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet
python -m pip install pillow numpy --quiet

Write-Host "4/5 Kurgu şablonu paketleri (Remotion)" -ForegroundColor Yellow
Push-Location kurgu-sablon
npm install
Pop-Location

Write-Host "5/5 Ayar dosyası" -ForegroundColor Yellow
if (-not (Test-Path .env)) { Copy-Item .env.example .env; Write-Host "  .env oluşturuldu — KURULUM.md 3. adıma göre doldurun." -ForegroundColor Green }

Write-Host ""
Write-Host "Kurulum bitti. Sıradaki: KURULUM.md 3-5. adımlar (Chrome uzantısı, hesaplar, ilk çalıştırma)." -ForegroundColor Green
