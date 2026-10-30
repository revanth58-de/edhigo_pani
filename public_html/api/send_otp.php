<?php
/**
 * send_otp.php
 * Generates secure 4-digit OTP and dispatches via Renflair SMS Gateway API.
 * Place in public_html/api/
 */

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, ['success' => false, 'error' => 'Method not allowed. Use POST.']);
}

$input = readJsonInput();
$phone = trim($input['phone'] ?? '');

// Clean phone (strip any non-numeric or country code like +91 or 0)
$phone = preg_replace('/^\+91|^91|^0/', '', $phone);
$phone = preg_replace('/\D/', '', $phone);

// 1. Validate 10-digit Indian Mobile Number
if (!isValidIndianMobile($phone)) {
    jsonResponse(400, [
        'success' => false,
        'error'   => 'Please enter a valid 10-digit Indian mobile number.'
    ]);
}

$pdo = getDbConnection();
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

try {
    // 2. Check Resend Cooldown (60 seconds)
    $stmtCooldown = $pdo->prepare(
        "SELECT id, resend_available_at, TIMESTAMPDIFF(SECOND, NOW(), resend_available_at) AS wait_sec
         FROM otps
         WHERE phone = :phone AND resend_available_at > NOW()
         ORDER BY id DESC LIMIT 1"
    );
    $stmtCooldown->execute([':phone' => $phone]);
    $cooldownRow = $stmtCooldown->fetch();

    if ($cooldownRow && ($cooldownRow['wait_sec'] > 0)) {
        jsonResponse(429, [
            'success'              => false,
            'error'                => "Please wait {$cooldownRow['wait_sec']} seconds before requesting a new OTP.",
            'retry_after_seconds'  => (int) $cooldownRow['wait_sec'],
        ]);
    }

    // 3. Hourly Rate Limit Protection
    $stmtRate = $pdo->prepare(
        "SELECT COUNT(*) as request_count
         FROM otps
         WHERE phone = :phone AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)"
    );
    $stmtRate->execute([':phone' => $phone]);
    $rateCount = (int) $stmtRate->fetchColumn();

    if ($rateCount >= OTP_HOURLY_RATE_LIMIT) {
        jsonResponse(429, [
            'success' => false,
            'error'   => 'Too many OTP requests for this number. Please try again after 1 hour.'
        ]);
    }

    // 4. Generate Random 4-digit OTP
    $otp = sprintf('%04d', random_int(1000, 9999));
    $otpHash = password_hash($otp, PASSWORD_BCRYPT);

    // 5. Invalidate any previous unverified OTPs for this phone
    $stmtInvalidate = $pdo->prepare(
        "UPDATE otps SET is_verified = 0, expires_at = NOW() WHERE phone = :phone AND is_verified = 0"
    );
    $stmtInvalidate->execute([':phone' => $phone]);

    // 6. Record New OTP in MySQL
    $stmtInsert = $pdo->prepare(
        "INSERT INTO otps (phone, otp_hash, attempts, max_attempts, is_verified, expires_at, resend_available_at, ip_address, created_at)
         VALUES (:phone, :otp_hash, 0, :max_attempts, 0, DATE_ADD(NOW(), INTERVAL :expiry SECOND), DATE_ADD(NOW(), INTERVAL :cooldown SECOND), :ip, NOW())"
    );
    $stmtInsert->execute([
        ':phone'        => $phone,
        ':otp_hash'     => $otpHash,
        ':max_attempts' => OTP_MAX_ATTEMPTS,
        ':expiry'       => OTP_EXPIRY_SECONDS,
        ':cooldown'     => OTP_RESEND_COOLDOWN_SECONDS,
        ':ip'           => $ip,
    ]);

    // 7. Dispatch via Renflair SMS Gateway
    $smsResult = sendRenflairSMS($phone, $otp);

    // 8. Confirm Renflair API acceptance before reporting success
    if (!$smsResult['success']) {
        jsonResponse(502, [
            'success' => false,
            'error'   => 'SMS delivery failed: ' . $smsResult['message'],
            'details' => $smsResult['raw'] ?? null
        ]);
    }

    // 9. Check if User Already Exists in Database
    $stmtUser = $pdo->prepare("SELECT id, name, role FROM users WHERE phone = :phone LIMIT 1");
    $stmtUser->execute([':phone' => $phone]);
    $existingUser = $stmtUser->fetch();
    $isExistingUser = !empty($existingUser && $existingUser['name'] && $existingUser['role']);

    // 10. Return Clean Success Response
    $response = [
        'success'              => true,
        'message'              => 'OTP sent successfully to your mobile number.',
        'phone'                => $phone,
        'is_existing_user'     => $isExistingUser,
        'resend_after_seconds' => OTP_RESEND_COOLDOWN_SECONDS,
        'expires_in_seconds'   => OTP_EXPIRY_SECONDS,
    ];

    // Optional developer inspection if explicitly requested
    if (isset($_GET['debug']) && $_GET['debug'] === '1') {
        $response['dev_otp'] = $otp;
    }

    jsonResponse(200, $response);

} catch (Exception $e) {
    error_log("send_otp.php Error: " . $e->getMessage());
    jsonResponse(500, [
        'success' => false,
        'error'   => 'An unexpected server error occurred. Please try again.'
    ]);
}
