# Kurulum doğrulaması — repodaki gerçek dosyalarla örnek çalıştırmalar.
# Kullanım:  powershell -ExecutionPolicy Bypass -File .\kurulum-dogrula.ps1 [-Hizli]
#   -Hizli : Whisper'ı "small" modelle dener (asıl hat "medium" kullanır; ilk çalıştırmada ~1,5 GB indirir).
# Çıktılar: ornekler\cikti\  (GitHub'a gitmez)
param([switch]$Hizli)
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot
$C = Join-Path $PSScriptRoot "ornekler\cikti"
New-Item -ItemType Directory -Force $C | Out-Null
$sonuc = [ordered]@{}
function Basari($ad, $ok, $not) { $sonuc[$ad] = @($ok, $not); $renk = if ($ok) { "Green" } else { "Red" }; Write-Host ("  " + $(if ($ok) { "TAMAM" } else { "HATA " }) + "  $ad  $not") -ForegroundColor $renk }

. .\araclar\env-yukle.ps1

Write-Host "`n1/5 Programlar" -ForegroundColor Yellow
foreach ($p in @("git", "node", "npm", "python", "ffmpeg", "ffprobe", "uv", "claude")) {
  $k = Get-Command $p -ErrorAction SilentlyContinue
  Basari $p ([bool]$k) $(if ($k) { $k.Source } else { "bulunamadı — kurulum.ps1'i çalıştırın" })
}

Write-Host "`n2/5 FFmpeg örneği: mekân görselinden 31 sn yakınlaşan dikey video + sessiz ses" -ForegroundColor Yellow
$ffv = Join-Path $C "ffmpeg-ornek.mp4"
& ffmpeg -v error -hide_banner -y -loop 1 -i "mekan-kilidi\M0-ana-mekan.png" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0004,1.15)':d=1:s=1080x1920:fps=30" -t 31 -c:v libx264 -preset veryfast -pix_fmt yuv420p $ffv
& ffmpeg -v error -hide_banner -y -f lavfi -i "anullsrc=r=48000:cl=stereo" -t 31 (Join-Path $C "sessiz.wav")
$sure = & ffprobe -v error -show_entries format=duration -of csv=p=0 $ffv
Basari "FFmpeg" ((Test-Path $ffv) -and [double]$sure -gt 30) "$ffv ($sure sn)"

Write-Host "`n3/5 Whisper örneği: video-03 anlatımının deşifresi" -ForegroundColor Yellow
$model = if ($Hizli) { "small" } else { "medium" }
Write-Host "  model: $model (ilk çalıştırmada indirilir, birkaç dakika sürebilir)" -ForegroundColor DarkGray
$wOut = Join-Path $C "whisper"
& uv run --with faster-whisper python araclar\desifre.py --audio "video-03-hacamat-cekim\ses\anlatim-gamze.mp3" --out $wOut --model $model
$okunur = Join-Path $wOut "okunur.txt"
if (Test-Path $okunur) { $ilk = (Get-Content $okunur -Encoding UTF8 | Select-Object -First 2) -join " | "; Basari "Whisper" $true $ilk } else { Basari "Whisper" $false "okunur.txt oluşmadı" }

Write-Host "`n4/5 Remotion örneği: aynı anlatım + altyazılarla 10 sn'lik Reel" -ForegroundColor Yellow
$K = Join-Path $C "kurgu-ornek"
if (Test-Path "$K\node_modules") { cmd /c rmdir "$K\node_modules" }   # junction; şablon paketleri silinmez
if (Test-Path $K) { Remove-Item -Recurse -Force $K }
New-Item -ItemType Directory -Force "$K\public" | Out-Null
foreach ($f in @("src", "scripts", "package.json", "remotion.config.ts", "tsconfig.json")) { Copy-Item -Recurse "kurgu-sablon\$f" $K }
Copy-Item "video-03-hacamat-cekim\kurgu\src\timeline.json" "$K\src\timeline.json" -Force
Copy-Item $ffv "$K\public\video.mp4"
Copy-Item "video-03-hacamat-cekim\ses\anlatim-gamze.mp3" "$K\public\anlatim.mp3"
Copy-Item (Join-Path $C "sessiz.wav") "$K\public\sessiz.wav"
cmd /c mklink /J "$K\node_modules" "$PSScriptRoot\kurgu-sablon\node_modules" | Out-Null
Push-Location $K
$rv = Join-Path $C "remotion-ornek.mp4"
& npx remotion render src/index.ts Reel $rv --frames=0-299 --concurrency=4 --log=error
Pop-Location
Basari "Remotion" (Test-Path $rv) $rv

Write-Host "`n5/5 MCP sunucuları (Claude'un tarayıcı bağlantısı)" -ForegroundColor Yellow
$mcp = & claude mcp list 2>&1 | Out-String
Write-Host $mcp
Basari "Playwright MCP" ($mcp -match "playwright.*(Connected|✓)") "bağlı değilse: Chrome açık mı, 'Playwright MCP Bridge' uzantısı etkin mi, .env token'ı doğru mu, repo klasöründe bir kez 'claude' açıp projeyi onayladınız mı?"

Write-Host "`nÖzet" -ForegroundColor Yellow
$hatali = @($sonuc.Keys | Where-Object { -not $sonuc[$_][0] })
if ($hatali.Count -eq 0) { Write-Host "Her şey hazır. Örnek çıktılar: $C — sıradaki: STUDYO-AC.bat" -ForegroundColor Green }
else { Write-Host ("Sorunlu: " + ($hatali -join ", ") + "  (KURULUM.md → Sorun giderme)") -ForegroundColor Red }
Start-Process explorer.exe $C
