# Gamze Eğitmen içerik hattı — Windows kurulumu (sıfırdan)
# Kullanım (PowerShell, repo klasöründe):  powershell -ExecutionPolicy Bypass -File .\kurulum.ps1
# Tekrar çalıştırmak güvenlidir: kurulu olanı atlar.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function PathYenile { $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User") }
function Kur($id, $komut) {
  if (Get-Command $komut -ErrorAction SilentlyContinue) { Write-Host "  [var] $komut" -ForegroundColor DarkGray; return }
  Write-Host "  [kuruluyor] $id" -ForegroundColor Cyan
  winget install --id $id -e --accept-source-agreements --accept-package-agreements --silent
  PathYenile
}
function ChromeVar {
  @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LocalAppData\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
}

Write-Host "1/7 Temel programlar (Git, Node.js, Python, FFmpeg, uv, Chrome)" -ForegroundColor Yellow
Kur "Git.Git" "git"
Kur "OpenJS.NodeJS.LTS" "node"
Kur "Python.Python.3.12" "python"
Kur "Gyan.FFmpeg" "ffmpeg"
Kur "astral-sh.uv" "uv"
if (ChromeVar) { Write-Host "  [var] chrome" -ForegroundColor DarkGray } else { winget install --id Google.Chrome -e --accept-source-agreements --accept-package-agreements --silent }
PathYenile

Write-Host "2/7 Claude Code" -ForegroundColor Yellow
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) { npm install -g @anthropic-ai/claude-code; PathYenile } else { Write-Host "  [var] claude" -ForegroundColor DarkGray }

Write-Host "3/7 Python paketleri (Pillow, NumPy)" -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet
python -m pip install pillow numpy --quiet

Write-Host "4/7 Whisper (faster-whisper, uv önbelleğine)" -ForegroundColor Yellow
uv run --with faster-whisper python -c "import faster_whisper; print('  faster-whisper', faster_whisper.__version__)"

Write-Host "5/7 Kurgu şablonu (Remotion paketleri + render tarayıcısı)" -ForegroundColor Yellow
Push-Location kurgu-sablon
npm install --no-audit --no-fund
npx remotion browser ensure
Pop-Location

Write-Host "6/7 Playwright MCP paketi (Claude'un Chrome'u kullanması için)" -ForegroundColor Yellow
npx -y @playwright/mcp@latest --version   # .mcp.json bunu npx ile çalıştırır; ilk indirme burada olsun

Write-Host "7/7 Ayar dosyası" -ForegroundColor Yellow
if (-not (Test-Path .env)) { Copy-Item .env.example .env; Write-Host "  .env oluşturuldu — KURULUM.md 3-4. adımlara göre doldurun." -ForegroundColor Green }
. .\araclar\env-yukle.ps1

Write-Host ""
Write-Host "Kurulum bitti. PowerShell'i kapatıp yeniden açın, sonra:" -ForegroundColor Green
Write-Host "  1) KURULUM.md 3-4: hesaplar, Chrome uzantısı, .env token'ı, ilk 'claude' açılışı" -ForegroundColor Green
Write-Host "  2) powershell -ExecutionPolicy Bypass -File .\kurulum-dogrula.ps1   (örnekler: FFmpeg, Whisper, Remotion, MCP)" -ForegroundColor Green
Write-Host "  3) STUDYO-AC.bat" -ForegroundColor Green
