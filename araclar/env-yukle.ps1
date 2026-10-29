# .env dosyasındaki dolu anahtarları kullanıcı ortam değişkeni yapar.
# .mcp.json token'ı ${PLAYWRIGHT_MCP_EXTENSION_TOKEN} olarak ORTAMDAN okur; .env'i kendisi okumaz.
# Kullanım (repo klasöründe):  . .\araclar\env-yukle.ps1
$envDosya = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
if (-not (Test-Path $envDosya)) { Write-Host "  .env yok (.env.example'ı kopyalayıp doldurun)" -ForegroundColor Yellow; return }
$sayi = 0
foreach ($satir in Get-Content $envDosya -Encoding UTF8) {
  if ($satir -match '^\s*([A-Z0-9_]+)\s*=\s*([^\s#]*)') {
    $ad = $Matches[1]; $deger = $Matches[2]
    if ($deger) {
      [Environment]::SetEnvironmentVariable($ad, $deger, "User")
      Set-Item -Path "Env:$ad" -Value $deger
      $sayi++
    }
  }
}
Write-Host "  .env: $sayi anahtar ortam değişkeni yapıldı" -ForegroundColor DarkGray
if (-not $env:PLAYWRIGHT_MCP_EXTENSION_TOKEN) { Write-Host "  UYARI: PLAYWRIGHT_MCP_EXTENSION_TOKEN boş — Claude tarayıcıyı kullanamaz (KURULUM.md 4. adım)" -ForegroundColor Yellow }
