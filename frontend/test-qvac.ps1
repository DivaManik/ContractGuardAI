# test-qvac.ps1 — Smoke test semua QVAC endpoints
# Usage: .\test-qvac.ps1 [-Model fast|smart|best] [-BaseUrl http://localhost:3000]

param(
    [string]$Model   = "fast",
    [string]$BaseUrl = "http://localhost:3000",
    [string]$Lang    = "id"
)

$ErrorActionPreference = "Stop"

$SAMPLE_CONTRACT = @"
CONTRACT AGREEMENT

This Service Agreement ("Agreement") is entered into as of January 1, 2025,
between PT Maju Bersama ("Service Provider") and CV Digital Nusantara ("Client").

1. SERVICES
   Service Provider agrees to provide software development services for 12 months.

2. PAYMENT
   Client shall pay IDR 50,000,000 per month, due on the 1st of each month.
   Late payment incurs 2% penalty per week.

3. TERMINATION
   Either party may terminate with 30 days written notice.
   Service Provider may terminate immediately if payment is overdue >60 days.

4. LIMITATION OF LIABILITY
   Service Provider's total liability shall not exceed 1 month of fees paid.

5. GOVERNING LAW
   This Agreement is governed by the laws of Indonesia.
"@

function Test-Endpoint {
    param([string]$Name, [string]$Url, [hashtable]$Body)
    Write-Host "`n[$Name]" -ForegroundColor Cyan
    Write-Host "POST $Url" -ForegroundColor Gray
    $start = Get-Date
    try {
        $response = Invoke-RestMethod -Method POST -Uri $Url `
            -ContentType "application/json" `
            -Body ($Body | ConvertTo-Json -Depth 10) `
            -TimeoutSec 300
        $elapsed = [math]::Round(((Get-Date) - $start).TotalSeconds, 1)
        Write-Host "OK ($elapsed s)" -ForegroundColor Green
        return $response
    } catch {
        $elapsed = [math]::Round(((Get-Date) - $start).TotalSeconds, 1)
        Write-Host "FAIL ($elapsed s): $_" -ForegroundColor Red
        return $null
    }
}

Write-Host "=== QVAC Endpoint Tests ===" -ForegroundColor Yellow
Write-Host "Base : $BaseUrl"
Write-Host "Model: $Model"
Write-Host "Lang : $Lang"
Write-Host ""
Write-Host "NOTE: First run downloads model automatically (fast=773MB, smart=2.5GB)."
Write-Host "      Subsequent runs use cached model."

# 1. extract-contract
$r1 = Test-Endpoint -Name "extract-contract" -Url "$BaseUrl/api/extract-contract" -Body @{
    contractText = $SAMPLE_CONTRACT
}
if ($r1) {
    Write-Host "  contractType : $($r1.contractType)"
    Write-Host "  parties      : $($r1.parties -join ', ')"
}

# 2. audit
$r2 = Test-Endpoint -Name "audit" -Url "$BaseUrl/api/audit" -Body @{
    contractText = $SAMPLE_CONTRACT
    model        = $Model
    lang         = $Lang
}
if ($r2) {
    Write-Host "  riskScore    : $($r2.riskScore)"
    Write-Host "  summary      : $($r2.summary -replace "`n"," " | Select-String '(.{0,120})' | ForEach-Object { $_.Matches[0].Value })"
}

# 3. checkpoint
$r3 = Test-Endpoint -Name "checkpoint" -Url "$BaseUrl/api/checkpoint" -Body @{
    contractSpec  = $SAMPLE_CONTRACT
    evidenceText  = "Invoice #001 dated 2025-01-01 for IDR 50,000,000 was paid on 2025-01-15."
    model         = $Model
    lang          = $Lang
}
if ($r3) {
    Write-Host "  status       : $($r3.status)"
    Write-Host "  verdict      : $($r3.verdict)"
}

# 4. chat-contract
$r4 = Test-Endpoint -Name "chat-contract" -Url "$BaseUrl/api/chat-contract" -Body @{
    contractText   = $SAMPLE_CONTRACT
    analysisResult = $r2
    userQuestion   = "Apa risiko terbesar dalam kontrak ini?"
    model          = $Model
    lang           = $Lang
}
if ($r4) {
    Write-Host "  answer (truncated): $(($r4.answer ?? $r4.response ?? $r4 | ConvertTo-Json -Compress) -replace "`n"," " | Select-String '(.{0,200})' | ForEach-Object { $_.Matches[0].Value })"
}

Write-Host "`n=== Done ===" -ForegroundColor Yellow
