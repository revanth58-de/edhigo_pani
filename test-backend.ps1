# Quick Backend API Test Script
# Run this to verify all backend endpoints are working

Write-Host "Starting Backend API Tests..." -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000"
$apiUrl = "$baseUrl/api"

# Test 1: Health Check
Write-Host "1. Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "   ✅ Health check passed: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Send OTP
Write-Host "2. Testing Send OTP Endpoint..." -ForegroundColor Yellow
try {
    $otpResponse = Invoke-RestMethod -Uri "$apiUrl/auth/send-otp" `
        -Method POST `
        -Body (@{phone="+919876543210"} | ConvertTo-Json) `
        -ContentType "application/json"
    
    Write-Host "   ✅ OTP endpoint working" -ForegroundColor Green
    Write-Host "   OTP Code: $($otpResponse.otp)" -ForegroundColor Cyan
    $testOtp = $otpResponse.otp
} catch {
    Write-Host "   ❌ Send OTP failed: $($_.Exception.Message)" -ForegroundColor Red
    $testOtp = $null
}
Write-Host ""

# Test 3: Verify OTP
if ($testOtp) {
    Write-Host "3. Testing Verify OTP Endpoint..." -ForegroundColor Yellow
    try {
        $authResponse = Invoke-RestMethod -Uri "$apiUrl/auth/verify-otp" `
            -Method POST `
            -Body (@{phone="+919876543210"; otp=$testOtp} | ConvertTo-Json) `
            -ContentType "application/json"
        
        Write-Host "   ✅ Verify OTP working" -ForegroundColor Green
        Write-Host "   Access Token received: $($authResponse.accessToken.Substring(0,20))..." -ForegroundColor Cyan
        $token = $authResponse.accessToken
    } catch {
        Write-Host "   ❌ Verify OTP failed: $($_.Exception.Message)" -ForegroundColor Red
        $token = $null
    }
} else {
    Write-Host "3. ⏭️  Skipping Verify OTP (no OTP to test)" -ForegroundColor Gray
    $token = $null
}
Write-Host ""

# Test 4: Set Role (requires auth)
if ($token) {
    Write-Host "4. Testing Set Role Endpoint..." -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
        
        $roleResponse = Invoke-RestMethod -Uri "$apiUrl/auth/set-role" `
            -Method POST `
            -Headers $headers `
            -Body (@{role="farmer"} | ConvertTo-Json)
        
        Write-Host "   ✅ Set Role working" -ForegroundColor Green
        Write-Host "   User role set to: $($roleResponse.user.role)" -ForegroundColor Cyan
    } catch {
        Write-Host "   ❌ Set Role failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "4. ⏭️  Skipping Set Role (no auth token)" -ForegroundColor Gray
}
Write-Host ""

# Test 5: Get Jobs (requires auth)
if ($token) {
    Write-Host "5. Testing Get Jobs Endpoint..." -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $token"
        }
        
        $jobs = Invoke-RestMethod -Uri "$apiUrl/jobs" `
            -Method GET `
            -Headers $headers
        
        Write-Host "   ✅ Get Jobs working" -ForegroundColor Green
        Write-Host "   Jobs found: $($jobs.Count)" -ForegroundColor Cyan
    } catch {
        Write-Host "   ❌ Get Jobs failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "5. ⏭️  Skipping Get Jobs (no auth token)" -ForegroundColor Gray
}
Write-Host ""

# Summary
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host "Backend URL: $baseUrl" -ForegroundColor White
Write-Host "API URL: $apiUrl" -ForegroundColor White
Write-Host ""
Write-Host "✅ = Test Passed" -ForegroundColor Green
Write-Host "❌ = Test Failed" -ForegroundColor Red
Write-Host "⏭️  = Test Skipped" -ForegroundColor Gray
Write-Host ""
