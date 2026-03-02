# ============================================================
#  EDHIGO PANI - Full API Test Script (PowerShell)
#  Senior QA | Tests every endpoint step by step
#  Usage: powershell -ExecutionPolicy Bypass -File .\test-api.ps1
# ============================================================

$BASE = "http://localhost:5000/api"
$PASS = 0
$FAIL = 0
$TOKEN = ""; $REFRESH = ""; $USER_ID = ""
$WORKER_TOKEN = ""; $WORKER_ID = ""
$LEADER_TOKEN = ""
$JOB_ID = ""; $DEL_JOB_ID = ""; $GROUP_ID = ""; $PAYMENT_ID = ""
$FARMER_PHONE = "9000000091"; $WORKER_PHONE = "9000000092"; $LEADER_PHONE = "9000000093"

function Hdr {
    param([string]$t)
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  $t" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
}

function Call-API {
    param([string]$Method, [string]$Url, $Body = $null, [hashtable]$Auth = @{})
    $h = @{ "Content-Type" = "application/json" } + $Auth
    try {
        $p = @{ Uri = $Url; Method = $Method; Headers = $h; ErrorAction = "Stop" }
        if ($Body) { $p["Body"] = ($Body | ConvertTo-Json -Depth 5) }
        $r = Invoke-WebRequest @p
        return @{ ok = $true; status = $r.StatusCode; json = ($r.Content | ConvertFrom-Json) }
    }
    catch {
        $code = $_.Exception.Response.StatusCode.value__
        $msg = ""
        try { $msg = ($_.ErrorDetails.Message | ConvertFrom-Json).error } catch {}
        return @{ ok = $false; status = $code; json = $null; err = $msg }
    }
}

function A { return @{ Authorization = "Bearer $args" } }

function Check {
    param([string]$name, $result, [int]$expect, [string]$key = "")
    $s = $result.status
    $ok = ($s -eq $expect)
    if ($ok -and $key) { $ok = ($result.json -and ($result.json | Get-Member -Name $key -EA SilentlyContinue)) }
    if ($ok) {
        Write-Host "  [PASS] [$s] $name" -ForegroundColor Green
        $script:PASS++
    }
    else {
        Write-Host "  [FAIL] [$s vs $expect] $name" -ForegroundColor Red
        $script:FAIL++
    }
}

# ════════════════════════════════════════════════
Hdr "SECTION 1 — AUTH"
# ════════════════════════════════════════════════

# A01 Send OTP farmer
$r = Call-API POST "$BASE/auth/send-otp" @{ phone = $FARMER_PHONE }
Check "A01 Send OTP — farmer" $r 200 "otp"
$FARMER_OTP = if ($r.json) { $r.json.otp } else { "" }

# A02 Send OTP — no phone
$r = Call-API POST "$BASE/auth/send-otp" @{ phone = "" }
Check "A02 Send OTP — empty phone (400)" $r 400

# A03 Send OTP worker
$r = Call-API POST "$BASE/auth/send-otp" @{ phone = $WORKER_PHONE }
Check "A03 Send OTP — worker" $r 200 "otp"
$WORKER_OTP = if ($r.json) { $r.json.otp } else { "" }

# A04 Send OTP leader
$r = Call-API POST "$BASE/auth/send-otp" @{ phone = $LEADER_PHONE }
Check "A04 Send OTP — leader" $r 200 "otp"
$LEADER_OTP = if ($r.json) { $r.json.otp } else { "" }

# A05 Verify OTP — wrong OTP
$r = Call-API POST "$BASE/auth/verify-otp" @{ phone = $FARMER_PHONE; otp = "0000" }
Check "A05 Verify OTP — wrong OTP (401)" $r 401

# A06 Verify OTP — missing otp field
$r = Call-API POST "$BASE/auth/verify-otp" @{ phone = $FARMER_PHONE }
Check "A06 Verify OTP — missing field (400)" $r 400

# A07 Verify OTP — farmer valid
$r = Call-API POST "$BASE/auth/verify-otp" @{ phone = $FARMER_PHONE; otp = $FARMER_OTP; name = "QA Farmer"; role = "farmer" }
Check "A07 Verify OTP — farmer (200)" $r 200 "accessToken"
if ($r.json) { $TOKEN = $r.json.accessToken; $REFRESH = $r.json.refreshToken; $USER_ID = $r.json.user.id }
Write-Host "       userId=$USER_ID" -ForegroundColor DarkGray

# A08 Verify OTP — worker valid
$r = Call-API POST "$BASE/auth/verify-otp" @{ phone = $WORKER_PHONE; otp = $WORKER_OTP; name = "QA Worker"; role = "worker"; village = "Test Village" }
Check "A08 Verify OTP — worker (200)" $r 200 "accessToken"
if ($r.json) { $WORKER_TOKEN = $r.json.accessToken; $WORKER_ID = $r.json.user.id }
Write-Host "       workerId=$WORKER_ID" -ForegroundColor DarkGray

# A09 Verify OTP — leader valid
$r = Call-API POST "$BASE/auth/verify-otp" @{ phone = $LEADER_PHONE; otp = $LEADER_OTP; name = "QA Leader"; role = "leader" }
Check "A09 Verify OTP — leader (200)" $r 200 "accessToken"
if ($r.json) { $LEADER_TOKEN = $r.json.accessToken }

# A10 GET /me — authenticated
$r = Call-API GET "$BASE/auth/me" -Auth (A $TOKEN)
Check "A10 GET /me — with valid JWT (200)" $r 200 "user"

# A11 GET /me — no token
$r = Call-API GET "$BASE/auth/me"
Check "A11 GET /me — no token (401)" $r 401

# A12 GET /me — tampered JWT
$r = Call-API GET "$BASE/auth/me" -Auth @{ Authorization = "Bearer FAKE.TOKEN.HERE" }
Check "A12 GET /me — tampered JWT (401)" $r 401

# A13 Set role — valid
$r = Call-API POST "$BASE/auth/set-role" @{ role = "farmer" } -Auth (A $TOKEN)
Check "A13 Set role — farmer (200)" $r 200

# A14 Set role — invalid role
$r = Call-API POST "$BASE/auth/set-role" @{ role = "admin" } -Auth (A $TOKEN)
Check "A14 Set role — invalid (400)" $r 400

# A15 Set language — te
$r = Call-API PUT "$BASE/auth/language" @{ language = "te" } -Auth (A $TOKEN)
Check "A15 Set language te (200)" $r 200

# A16 Set language — invalid
$r = Call-API PUT "$BASE/auth/language" @{ language = "fr" } -Auth (A $TOKEN)
Check "A16 Set language invalid (400)" $r 400

# A17 Update profile
$r = Call-API PUT "$BASE/auth/profile" @{ name = "QA Farmer Updated"; village = "Guntur"; landAcres = 5.5 } -Auth (A $TOKEN)
Check "A17 Update profile (200)" $r 200 "user"

# A18 Refresh token — valid
$r = Call-API POST "$BASE/auth/refresh" @{ refreshToken = $REFRESH }
Check "A18 Refresh token — valid (200)" $r 200 "accessToken"
if ($r.json) { $TOKEN = $r.json.accessToken }

# A19 Refresh token — bad
$r = Call-API POST "$BASE/auth/refresh" @{ refreshToken = "badtoken" }
Check "A19 Refresh token — invalid (401)" $r 401

# ════════════════════════════════════════════════
Hdr "SECTION 2 — JOBS"
# ════════════════════════════════════════════════

# J01 Create job
$r = Call-API POST "$BASE/jobs" @{ workType = "Harvesting"; workerType = "individual"; workersNeeded = 2; payPerDay = 500; farmLatitude = 16.5062; farmLongitude = 80.6480; farmAddress = "Guntur AP" } -Auth (A $TOKEN)
Check "J01 Create job (201)" $r 201 "data"
if ($r.json) { $JOB_ID = $r.json.data.id }
Write-Host "       jobId=$JOB_ID" -ForegroundColor DarkGray

# J02 Create job — no auth
$r = Call-API POST "$BASE/jobs" @{ workType = "Ploughing"; payPerDay = 300 }
Check "J02 Create job — no auth (401)" $r 401

# J03 GET all jobs
$r = Call-API GET "$BASE/jobs"
Check "J03 GET all jobs (200)" $r 200 "data"

# J04 GET /my-jobs
$r = Call-API GET "$BASE/jobs/my-jobs" -Auth (A $TOKEN)
Check "J04 GET my-jobs (200)" $r 200 "data"

# J05 GET /my-jobs — no auth
$r = Call-API GET "$BASE/jobs/my-jobs"
Check "J05 GET my-jobs — no auth (401)" $r 401

# J06 GET nearby-workers
$nearbyUrl = "$BASE/jobs/nearby-workers?lat=16.5062" + "`&lng=80.6480"
$r = Call-API GET $nearbyUrl -Auth (A $TOKEN)
Check "J06 GET nearby-workers (200)" $r 200 "data"

# J07 GET job by ID
if ($JOB_ID) {
    $r = Call-API GET "$BASE/jobs/$JOB_ID" -Auth (A $TOKEN)
    Check "J07 GET job by ID (200)" $r 200 "data"
}

# J08 GET job — bad ID
$r = Call-API GET "$BASE/jobs/nonexistent-id-9999" -Auth (A $TOKEN)
Check "J08 GET job — bad ID (404)" $r 404

# J09 Worker accepts job
if ($JOB_ID -and $WORKER_ID) {
    $r = Call-API POST "$BASE/jobs/$JOB_ID/accept" @{ workerId = $WORKER_ID } -Auth (A $WORKER_TOKEN)
    Check "J09 Worker accepts job (200)" $r 200
}

# J10 Accept already-matched job (should fail)
if ($JOB_ID -and $WORKER_ID) {
    $r = Call-API POST "$BASE/jobs/$JOB_ID/accept" @{ workerId = $WORKER_ID } -Auth (A $WORKER_TOKEN)
    Check "J10 Accept already-matched job (400)" $r 400
}

# J11 Update job status — owner
if ($JOB_ID) {
    $r = Call-API PUT "$BASE/jobs/$JOB_ID/status" @{ status = "completed" } -Auth (A $TOKEN)
    Check "J11 Update job status — owner (200)" $r 200
}

# J12 Update job status — wrong user (403)
if ($JOB_ID) {
    $r = Call-API PUT "$BASE/jobs/$JOB_ID/status" @{ status = "cancelled" } -Auth (A $WORKER_TOKEN)
    Check "J12 Update job status — wrong user (403)" $r 403
}

# J13 Create + delete a job
$r = Call-API POST "$BASE/jobs" @{ workType = "Weeding"; workerType = "individual"; workersNeeded = 1; payPerDay = 300; farmAddress = "Test" } -Auth (A $TOKEN)
Check "J13 Create job for delete test (201)" $r 201
if ($r.json) { $DEL_JOB_ID = $r.json.data.id }

if ($DEL_JOB_ID) {
    $r = Call-API DELETE "$BASE/jobs/$DEL_JOB_ID" -Auth (A $TOKEN)
    Check "J14 DELETE job (200)" $r 200
}

# ════════════════════════════════════════════════
Hdr "SECTION 3 — ATTENDANCE"
# ════════════════════════════════════════════════

# Create a fresh job for attendance tests
$r = Call-API POST "$BASE/jobs" @{ workType = "Planting"; workerType = "individual"; workersNeeded = 1; payPerDay = 400; farmAddress = "Attend Test" } -Auth (A $TOKEN)
$ATT_JOB = if ($r.json) { $r.json.data.id } else { $JOB_ID }

# AT01 Check-in
if ($ATT_JOB -and $WORKER_ID) {
    $r = Call-API POST "$BASE/attendance/check-in" @{ jobId = $ATT_JOB; workerId = $WORKER_ID; qrData = '{"jobId":"' + $ATT_JOB + '","type":"in"}'; checkInLatitude = 16.5062; checkInLongitude = 80.6480 }
    Check "AT01 Check-in (200)" $r 200
}

# AT02 Check-in — missing fields
$r = Call-API POST "$BASE/attendance/check-in" @{ jobId = "x" }
Check "AT02 Check-in — missing workerId (400)" $r 400

# AT03 Check-out
if ($ATT_JOB -and $WORKER_ID) {
    $r = Call-API POST "$BASE/attendance/check-out" @{ jobId = $ATT_JOB; workerId = $WORKER_ID; qrData = '{"jobId":"' + $ATT_JOB + '","type":"out"}'; checkOutLatitude = 16.5062; checkOutLongitude = 80.6480 }
    Check "AT03 Check-out (200)" $r 200
}

# AT04 Get attendance records
if ($ATT_JOB) {
    $r = Call-API GET "$BASE/attendance/$ATT_JOB"
    Check "AT04 GET attendance records (200)" $r 200
}

# ════════════════════════════════════════════════
Hdr "SECTION 4 — PAYMENTS"
# ════════════════════════════════════════════════

# P01 Make payment
if ($JOB_ID -and $WORKER_ID) {
    $r = Call-API POST "$BASE/payments" @{ jobId = $JOB_ID; workerId = $WORKER_ID; amount = 500; method = "cash" } -Auth (A $TOKEN)
    Check "P01 Make payment (201)" $r 201
    if ($r.json -and $r.json.data) { $PAYMENT_ID = $r.json.data.id }
}

# P02 Payment — no auth
$r = Call-API POST "$BASE/payments" @{ jobId = "x"; workerId = "y"; amount = 100 }
Check "P02 Payment — no auth (401)" $r 401

# P03 Payment history
$r = Call-API GET "$BASE/payments/history/$USER_ID" -Auth (A $TOKEN)
Check "P03 GET payment history (200)" $r 200

# P04 Payment details
if ($PAYMENT_ID) {
    $r = Call-API GET "$BASE/payments/$PAYMENT_ID" -Auth (A $TOKEN)
    Check "P04 GET payment details (200)" $r 200
}

# ════════════════════════════════════════════════
Hdr "SECTION 5 — RATINGS"
# ════════════════════════════════════════════════

# R01 Rate worker
if ($WORKER_ID -and $JOB_ID) {
    $r = Call-API POST "$BASE/ratings/worker" @{ rateeId = $WORKER_ID; jobId = $JOB_ID; rating = 4; comment = "Good job" } -Auth (A $TOKEN)
    Check "R01 Rate worker (200/201)" $r 201
}

# R02 Rate farmer
if ($USER_ID -and $JOB_ID) {
    $r = Call-API POST "$BASE/ratings/farmer" @{ rateeId = $USER_ID; jobId = $JOB_ID; rating = 5; comment = "Fair pay" } -Auth (A $WORKER_TOKEN)
    Check "R02 Rate farmer (200/201)" $r 201
}

# R03 Ratings — no auth
$r = Call-API POST "$BASE/ratings" @{ rateeId = "x"; rating = 3 }
Check "R03 Ratings — no auth (401)" $r 401

# R04 Get user ratings
if ($WORKER_ID) {
    $r = Call-API GET "$BASE/ratings/user/$WORKER_ID" -Auth (A $TOKEN)
    Check "R04 GET user ratings (200)" $r 200
}

# ════════════════════════════════════════════════
Hdr "SECTION 6 — GROUPS"
# ════════════════════════════════════════════════

# G01 Create group
if ($LEADER_TOKEN) {
    $r = Call-API POST "$BASE/groups" @{ name = "QA Test Group"; description = "Automated Test"; maxMembers = 5 } -Auth (A $LEADER_TOKEN)
    Check "G01 Create group (201)" $r 201
    if ($r.json -and $r.json.data) { $GROUP_ID = $r.json.data.id }
    Write-Host "       groupId=$GROUP_ID" -ForegroundColor DarkGray
}

# G02 Create group — no auth
$r = Call-API POST "$BASE/groups" @{ name = "No Auth Group" }
Check "G02 Create group — no auth (401)" $r 401

# G03 Get group details
if ($GROUP_ID -and $LEADER_TOKEN) {
    $r = Call-API GET "$BASE/groups/$GROUP_ID" -Auth (A $LEADER_TOKEN)
    Check "G03 GET group details (200)" $r 200
}

# G04 Get group jobs
if ($GROUP_ID -and $LEADER_TOKEN) {
    $r = Call-API GET "$BASE/groups/$GROUP_ID/jobs" -Auth (A $LEADER_TOKEN)
    Check "G04 GET group jobs (200)" $r 200
}

# G05 Add member
if ($GROUP_ID -and $LEADER_TOKEN -and $WORKER_ID) {
    $r = Call-API POST "$BASE/groups/$GROUP_ID/members" @{ workerId = $WORKER_ID } -Auth (A $LEADER_TOKEN)
    Check "G05 Add member to group (200)" $r 200
}

# G06 Accept group job
if ($GROUP_ID -and $LEADER_TOKEN -and $JOB_ID) {
    $r = Call-API POST "$BASE/groups/accept-job" @{ groupId = $GROUP_ID; jobId = $JOB_ID } -Auth (A $LEADER_TOKEN)
    Check "G06 Accept group job (200)" $r 200
}

# ════════════════════════════════════════════════
Hdr "SECTION 7 — SECURITY EDGE CASES"
# ════════════════════════════════════════════════

# S01 Tampered JWT
$r = Call-API GET "$BASE/auth/me" -Auth @{ Authorization = "Bearer eyJhbGciOiJIUzI1NiJ9.fake.signature" }
Check "S01 Tampered JWT (401)" $r 401

# S02 SQL injection attempt
$r = Call-API POST "$BASE/auth/send-otp" @{ phone = "'; DROP TABLE users; --" }
Check "S02 SQL injection — no crash (400 or 200)" $r 400

# S03 Wrong user updates job (already tested, confirm 403)
if ($JOB_ID) {
    $r = Call-API PUT "$BASE/jobs/$JOB_ID/status" @{ status = "cancelled" } -Auth (A $WORKER_TOKEN)
    Check "S03 Unauthorized job update (403)" $r 403
}

# S04 Missing Authorization prefix
$r = Call-API GET "$BASE/auth/me" -Auth @{ Authorization = "$TOKEN" }
Check "S04 Missing Bearer prefix (401)" $r 401

# S05 Empty refresh token body
$r = Call-API POST "$BASE/auth/refresh" @{}
Check "S05 Refresh — missing token (400)" $r 400

# ════════════════════════════════════════════════
Hdr "FINAL RESULTS"
# ════════════════════════════════════════════════
$TOTAL = $PASS + $FAIL
Write-Host ""
Write-Host "  Total  : $TOTAL" -ForegroundColor White
Write-Host "  PASS   : $PASS"  -ForegroundColor Green
Write-Host "  FAIL   : $FAIL"  -ForegroundColor Red
Write-Host ""
if ($FAIL -eq 0) {
    Write-Host "  ALL TESTS PASSED! Great work." -ForegroundColor Green
}
else {
    Write-Host "  $FAIL test(s) FAILED. Fix those endpoints!" -ForegroundColor Yellow
}
Write-Host ""
