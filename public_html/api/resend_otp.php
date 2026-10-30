<?php
/**
 * resend_otp.php
 * Handles OTP resend with 60-second cooldown enforcement and Renflair SMS dispatch.
 * Place in public_html/api/
 */

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, ['success' => false, 'error' => 'Method not allowed. Use POST.']);
}

$input = readJsonInput();
$phone = trim($input['phone'] ?? '');

$phone = preg_replace('/^\+91|^91|^0/', '', $phone);
$phone = preg_replace('/\D/', '', $phone);

if (!isValidIndianMobile($phone)) {
    jsonResponse(400, [
        'success' => false,
        'error'   => 'Please enter a valid 10-digit Indian mobile number.'
    ]);
}

$pdo = getDbConnection();
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

try {
    // 1. Enforce 60-second Cooldown
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
            'error'                => "Please wait {$cooldownRow['wait_sec']} seconds before resending OTP.",
            'retry_after_seconds'  => (int) $cooldownRow['wait_sec'],
        ]);
    }

    // 2. Generate New 4-digit OTP
    $otp = sprintf('%04d', random_int(1000, 9999));
    $otpHash = password_hash($otp, PASSWORD_BCRYPT);

    // 3. Invalidate previous pending OTPs
    $stmtInvalidate = $pdo->prepare("UPDATE otps SET is_verified = 0, expires_at = NOW() WHERE phone = :phone AND is_verified = 0");
    $stmtInvalidate->execute([':phone' => $phone]);

    // 4. Insert New OTP
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

    // 5. Dispatch via Renflair SMS Gateway
    $smsResult = sendRenflairSMS($phone, $otp);

    if (!$smsResult['success']) {
        jsonResponse(502, [
            'success' => false,
            'error'   => 'Failed to resend SMS: ' . $smsResult['message']
        ]);
    }

    $response = [
        'success'              => true,
        'message'              => 'A new OTP has been sent to your phone via SMS.',
        'phone'                => $phone,
        'resend_after_seconds' => OTP_RESEND_COOLDOWN_SECONDS,
        'expires_in_seconds'   => OTP_EXPIRY_SECONDS,
    ];

    if (isset($_GET['debug']) && $_GET['debug'] === '1') {
        $response['dev_otp'] = $otp;
    }

    jsonResponse(200, $response);

} catch (Exception $e) {
    error_log("resend_otp.php Error: " . $e->getMessage());
    jsonResponse(500, [
        'success' => false,
        'error'   => 'An unexpected server error occurred. Please try again.'
    ]);
}
