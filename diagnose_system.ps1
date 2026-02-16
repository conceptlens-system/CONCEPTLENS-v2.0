Write-Host "=== CONCEPTLENS DIAGNOSTIC ===" -ForegroundColor Cyan

# 1. Check if Backend Port 8000 is listening
$backend = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($backend) {
    Write-Host "[OK] Backend is listening on port 8000 (PID: $($backend.OwningProcess))" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Nothing listening on port 8000. Backend is NOT RUNNING." -ForegroundColor Red
}

# 2. Check if Frontend Port 3000 is listening
$frontend = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($frontend) {
    Write-Host "[OK] Frontend is listening on port 3000" -ForegroundColor Green
} else {
    Write-Host "[WARN] Nothing listening on port 3000. Frontend might not be running." -ForegroundColor Yellow
}

# 3. Test Backend Health Endpoint
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Method Get -TimeoutSec 5
    Write-Host "[OK] Backend Check: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Backend Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test MongoDB Connectivity (via Backend)
# We can't check Mongo directly easily without drivers, but if Backend is up, it implies Mongo is ok-ish.

Write-Host "===============================" -ForegroundColor Cyan
