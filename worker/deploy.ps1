# とわなにか の同期サーバーを Cloudflare に公開する（最初の1回と、直したとき）
# 使い方: PowerShell でこのフォルダを開いて  .\deploy.ps1
# remitech と同じ Cloudflare アカウントで入っていれば、そのまま公開される。
Set-Location -Path $PSScriptRoot
& npx --yes wrangler deploy
Write-Host ""
Write-Host "公開できたら https://hibiki-sync.jaykim-can.workers.dev を開いて service: hibiki-sync と出れば成功です。"
