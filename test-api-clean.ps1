$BASE = "http://localhost:5000/api"
$PASS = 0
$FAIL = 0
$TOKEN = ""; $WTOKEN = ""; $LTOKEN = ""
$UID = ""; $WID = ""; $JID = ""; $AID = ""; $PVID = ""

function Tst($nm, $m, $url, $b = $null, [hashtable]$a = @{}, [int]$e = 200, $k = "") {
    $res = @{ s = 0; j = $null }
    try {
        $req = [System.Net.HttpWebRequest]::Create($url)
        $req.Method = $m
        $req.ContentType = "application/json"
        $req.Timeout = 10000
        foreach ($key in $a.Keys) { $req.Headers[$key] = $a[$key] }
        if ($b) {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes(($b | ConvertTo-Json -Depth 5))
            $req.ContentLength = $bytes.Length
            $req.GetRequestStream().Write($bytes, 0, $bytes.Length)
        }
        try {
            $resp = $req.GetResponse()
            $res.s = [int]$resp.StatusCode
            $stream = $resp.GetResponseStream()
            $body = (New-Object System.IO.StreamReader $stream).ReadToEnd()
            try { $res.j = ($body | ConvertFrom-Json) } catch {}
        }
        catch [System.Net.WebException] {
            $errResp = $_.Exception.Response
            if ($errResp) {
                $res.s = [int]$errResp.StatusCode
                $stream = $errResp.GetResponseStream()
                $body = (New-Object System.IO.StreamReader $stream).ReadToEnd()
                try { $res.j = ($body | ConvertFrom-Json) } catch {}
            }
            else { $res.s = -1 }
        }
    }
    catch {
        $res.s = -1
        Write-Host "  [NET ERROR] $nm : $($_.Exception.Message)" -ForegroundColor Magenta
    }
    $ok = ($res.s -eq $e)
    if ($ok -and $k) { $ok = ($res.j -and ($res.j | Get-Member $k -EA SilentlyContinue)) }
    if ($ok) { Write-Host (" [PASS] [$($res.s)] $nm") -ForegroundColor Green; $script:PASS++ }
    else { Write-Host (" [FAIL] [$($res.s) vs $e] $nm") -ForegroundColor Red; $script:FAIL++ }
    return $res
}
function B($t) { return @{ Authorization = "Bearer $t" } }

# ─── AUTH ────────────────────────────────────
Write-Host "`n=== AUTH ===" -ForegroundColor Cyan

$r = Tst "A01 Send OTP farmer" POST "$BASE/auth/send-otp" @{ phone = "9111001021" } -e 200 -k "otp"
$otp = if ($r.j) { $r.j.otp } else { "" }

$r = Tst "A02 No phone 400" POST "$BASE/auth/send-otp" @{ } -e 400

$r = Tst "A03 Wrong OTP 401" POST "$BASE/auth/verify-otp" @{ phone = "9111001021"; otp = "0000" } -e 401

$r = Tst "A04 Verify farmer 200" POST "$BASE/auth/verify-otp" @{ phone = "9111001021"; otp = $otp; name = "QAFarmer"; role = "farmer" } -e 200 -k "accessToken"
$TOKEN = if ($r.j) { $r.j.accessToken } else { "" }
$REF = if ($r.j) { $r.j.refreshToken } else { "" }
$UID = if ($r.j) { $r.j.user.id } else { "" }
Write-Host "  farmerUID=$UID" -ForegroundColor DarkGray

$r = Tst "A05 GET /me valid 200" GET "$BASE/auth/me" -a (B $TOKEN) -e 200 -k "user"
$r = Tst "A06 GET /me no token 401" GET "$BASE/auth/me" -e 401
$r = Tst "A07 Tampered JWT 401" GET "$BASE/auth/me" -a @{ Authorization = "Bearer fake.token.bad" } -e 401
$r = Tst "A08 Set role farmer 200" POST "$BASE/auth/set-role" @{ role = "farmer" } -a (B $TOKEN) -e 200
$r = Tst "A09 Set role invalid 400" POST "$BASE/auth/set-role" @{ role = "admin" } -a (B $TOKEN) -e 400
$r = Tst "A10 Language te 200" PUT "$BASE/auth/language" @{ language = "te" } -a (B $TOKEN) -e 200
$r = Tst "A11 Language invalid 400" PUT "$BASE/auth/language" @{ language = "fr" } -a (B $TOKEN) -e 400
$r = Tst "A12 Update profile 200" PUT "$BASE/auth/profile" @{ name = "QAFarmer2"; village = "Guntur"; landAcres = 5 } -a (B $TOKEN) -e 200 -k "user"
$r = Tst "A13 Refresh valid 200" POST "$BASE/auth/refresh" @{ refreshToken = $REF } -e 200 -k "accessToken"
if ($r.j) { $TOKEN = $r.j.accessToken }
$r = Tst "A14 Refresh bad token 401" POST "$BASE/auth/refresh" @{ refreshToken = "badtoken" } -e 401
$r = Tst "A15 Refresh empty body 400" POST "$BASE/auth/refresh" @{ } -e 400

# ─── WORKER SETUP ────────────────────────────
Write-Host "`n=== WORKER SETUP ===" -ForegroundColor Cyan

$r = Tst "W0 Send OTP worker" POST "$BASE/auth/send-otp" @{ phone = "9111001022" } -e 200
$wotp = if ($r.j) { $r.j.otp } else { "" }
$r = Tst "W1 Verify worker 200" POST "$BASE/auth/verify-otp" @{ phone = "9111001022"; otp = $wotp; name = "QAWorker"; role = "worker"; village = "Town" } -e 200
$WTOKEN = if ($r.j) { $r.j.accessToken } else { "" }
$WID = if ($r.j) { $r.j.user.id } else { "" }
Write-Host "  workerUID=$WID" -ForegroundColor DarkGray

# ─── LEADER SETUP ────────────────────────────
$r = Tst "L0 Send OTP leader" POST "$BASE/auth/send-otp" @{ phone = "9111001023" } -e 200
$lotp = if ($r.j) { $r.j.otp } else { "" }
$r = Tst "L1 Verify leader 200" POST "$BASE/auth/verify-otp" @{ phone = "9111001023"; otp = $lotp; name = "QALeader"; role = "leader" } -e 200
$LTOKEN = if ($r.j) { $r.j.accessToken } else { "" }

# ─── JOBS ────────────────────────────────────
Write-Host "`n=== JOBS ===" -ForegroundColor Cyan

$r = Tst "J01 Create job 201" POST "$BASE/jobs" @{ workType = "Harvesting"; workerType = "individual"; workersNeeded = 2; payPerDay = 500; farmLatitude = 16.5; farmLongitude = 80.6; farmAddress = "Guntur" } -a (B $TOKEN) -e 201 -k "data"
$JID = if ($r.j) { $r.j.data.id } else { "" }
Write-Host "  jobId=$JID" -ForegroundColor DarkGray

$r = Tst "J02 Create job no auth 401" POST "$BASE/jobs" @{ workType = "x"; payPerDay = 100 } -e 401
$r = Tst "J03 GET all jobs 200" GET "$BASE/jobs" -e 200 -k "data"
$r = Tst "J04 My jobs 200" GET "$BASE/jobs/my-jobs" -a (B $TOKEN) -e 200 -k "data"
$r = Tst "J05 My jobs no auth 401" GET "$BASE/jobs/my-jobs" -e 401

$nearUrl = "$BASE/jobs/nearby-workers?lat=16.5" + "&lng=80.6"
$r = Tst "J06 Nearby workers 200" GET $nearUrl -a (B $TOKEN) -e 200 -k "data"

if ($JID) { $r = Tst "J07 Job by ID 200" GET "$BASE/jobs/$JID" -a (B $TOKEN) -e 200 -k "data" }

$r = Tst "J08 Job bad ID 404" GET "$BASE/jobs/nonexistent9999" -a (B $TOKEN) -e 404
if ($JID -and $WID) { $r = Tst "J09 Worker accept job 200" POST "$BASE/jobs/$JID/accept" @{ workerId = $WID } -a (B $WTOKEN) -e 200 }
if ($JID -and $WID) { $r = Tst "J10 Re-accept fails 400" POST "$BASE/jobs/$JID/accept" @{ workerId = $WID } -a (B $WTOKEN) -e 400 }
if ($JID) { $r = Tst "J11 Owner updates status 200" PUT "$BASE/jobs/$JID/status" @{ status = "completed" } -a (B $TOKEN) -e 200 }
if ($JID) { $r = Tst "J12 Wrong user update 403" PUT "$BASE/jobs/$JID/status" @{ status = "cancelled" } -a (B $WTOKEN) -e 403 }

$r = Tst "J13 Create job to delete 201" POST "$BASE/jobs" @{ workType = "Weeding"; workerType = "individual"; workersNeeded = 1; payPerDay = 200; farmAddress = "x" } -a (B $TOKEN) -e 201
$DJ = if ($r.j) { $r.j.data.id } else { "" }
if ($DJ) { $r = Tst "J14 Delete job 200" DELETE "$BASE/jobs/$DJ" -a (B $TOKEN) -e 200 }

# ─── ATTENDANCE ──────────────────────────────
Write-Host "`n=== ATTENDANCE ===" -ForegroundColor Cyan

$r = Tst "AT0 Create attend job 201" POST "$BASE/jobs" @{ workType = "Planting"; workerType = "individual"; workersNeeded = 1; payPerDay = 300; farmAddress = "att" } -a (B $TOKEN) -e 201
$AID = if ($r.j) { $r.j.data.id } else { $JID }

if ($AID -and $WID) { $r = Tst "AT1 Check-in 201" POST "$BASE/attendance/check-in" @{ jobId = $AID; workerId = $WID; qrCodeIn = "check-in-qr"; checkInLatitude = 16.5; checkInLongitude = 80.6 } -a (B $WTOKEN) -e 201 }
$r = Tst "AT2 Check-in bad 400" POST "$BASE/attendance/check-in" @{ jobId = "x" } -a (B $WTOKEN) -e 403
if ($AID -and $WID) { $r = Tst "AT3 Check-out 200" POST "$BASE/attendance/check-out" @{ jobId = $AID; workerId = $WID; qrCodeOut = "check-out-qr"; checkOutLatitude = 16.5; checkOutLongitude = 80.6 } -a (B $WTOKEN) -e 200 }
if ($AID) { $r = Tst "AT4 GET records 200" GET "$BASE/attendance/$AID" -e 200 }

# ─── PAYMENTS ────────────────────────────────
Write-Host "`n=== PAYMENTS ===" -ForegroundColor Cyan

if ($JID) {
    $r = Tst "P01 Make payment 200" POST "$BASE/payments" @{ jobId = $JID; amount = 500; method = "cash" } -a (B $TOKEN) -e 200
    $PVID = if ($r.j -and $r.j.payments -and $r.j.payments[0]) { $r.j.payments[0].id } else { "" }
}
$r = Tst "P02 Payment no auth 401" POST "$BASE/payments" @{ } -e 401
if ($UID) { $r = Tst "P03 Payment history 200" GET "$BASE/payments/history/$UID" -a (B $TOKEN) -e 200 }
if ($PVID) { $r = Tst "P04 Payment details 200" GET "$BASE/payments/$PVID" -a (B $TOKEN) -e 200 }

# ─── RATINGS ─────────────────────────────────
Write-Host "`n=== RATINGS ===" -ForegroundColor Cyan

if ($WID -and $JID) { $r = Tst "R01 Rate worker 200" POST "$BASE/ratings/worker" @{ toUserId = $WID; jobId = $JID; emoji = "happy"; stars = 4 } -a (B $TOKEN) -e 200 }
if ($UID -and $JID) { $r = Tst "R02 Rate farmer 200" POST "$BASE/ratings/farmer" @{ toUserId = $UID; jobId = $JID; emoji = "happy"; stars = 5 } -a (B $WTOKEN) -e 200 }
$r = Tst "R03 Ratings no auth 401" POST "$BASE/ratings" @{ } -e 401
if ($WID) { $r = Tst "R04 User ratings 200" GET "$BASE/ratings/user/$WID" -a (B $TOKEN) -e 200 }

# ─── GROUPS ──────────────────────────────────
Write-Host "`n=== GROUPS ===" -ForegroundColor Cyan

if ($LTOKEN) {
    $r = Tst "G01 Create group 201" POST "$BASE/groups" @{ name = "QAGroup"; description = "Test"; maxMembers = 5 } -a (B $LTOKEN) -e 201
    $GID = if ($r.j) { $r.j.data.id } else { "" }
    Write-Host "  groupId=$GID" -ForegroundColor DarkGray
    if ($GID) { $r = Tst "G02 GET group details 200" GET "$BASE/groups/$GID" -a (B $LTOKEN) -e 200 }
    if ($GID) { $r = Tst "G03 GET group jobs 200" GET "$BASE/groups/$GID/jobs" -a (B $LTOKEN) -e 200 }
    if ($GID -and $WID) { $r = Tst "G04 Add member 200" POST "$BASE/groups/$GID/members" @{ workerId = $WID } -a (B $LTOKEN) -e 200 }
}
$r = Tst "G05 Create group no auth 401" POST "$BASE/groups" @{ name = "NoAuth" } -e 401

# ─── SECURITY ────────────────────────────────
Write-Host "`n=== SECURITY ===" -ForegroundColor Cyan

$r = Tst "S01 Tampered JWT 401" GET "$BASE/auth/me" -a @{ Authorization = "Bearer bad.fake.tok" } -e 401
$r = Tst "S02 No Bearer prefix 401" GET "$BASE/auth/me" -a @{ Authorization = $TOKEN } -e 401
$r = Tst "S03 Empty refresh 400" POST "$BASE/auth/refresh" @{ } -e 400
if ($JID) { $r = Tst "S04 Worker updates farmer job 403" PUT "$BASE/jobs/$JID/status" @{ status = "cancelled" } -a (B $WTOKEN) -e 403 }

# ─── SUMMARY ─────────────────────────────────
Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host " RESULTS" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host " PASS : $PASS" -ForegroundColor Green
Write-Host " FAIL : $FAIL" -ForegroundColor Red
Write-Host " TOTAL: $($PASS + $FAIL)"
if ($FAIL -eq 0) { Write-Host " ALL TESTS PASSED!" -ForegroundColor Green }
else { Write-Host " $FAIL test(s) FAILED. Review above." -ForegroundColor Yellow }
Write-Host ""