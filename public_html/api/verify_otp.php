<?php
/**
 * verify_otp.php
 * Verifies submitted 4-digit OTP against MySQL hash, enforces attempt limits,
 * and creates an authenticated user session.
 * Place in public_html/api/
 */

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, ['success' => false, 'error' => 'Method not allowed. Use POST.']);
}

$input = readJsonInput();
$phone = trim($input['phone'] ?? '');
$otp   = trim($input['otp'] ?? '');

// Optional user registration metadata
$name    = trim($input['name'] ?? '');
$village = trim($input['village'] ?? '');
$role    = strtolower(trim($input['role'] ?? ''));
$age     = isset($input['age']) ? (int)$input['age'] : null;
$gender  = trim($input['gender'] ?? '');

// Clean phone number
$phone = preg_replace('/^\+91|^91|^0/', '', $phone);
$phone = preg_replace('/\D/', '', $phone);

// 1. Validate Input Format
if (!isValidIndianMobile($phone)) {
    jsonResponse(400, ['success' => false, 'error' => 'Invalid phone number format.']);
}

if (!preg_match('/^\d{4}$/', $otp)) {
    jsonResponse(400, ['success' => false, 'error' => 'OTP must be exactly 4 digits.']);
}

$pdo = getDbConnection();

try {
    // 2. Fetch Latest Pending OTP Record for this phone
    $stmt = $pdo->prepare(
        "SELECT id, otp_hash, attempts, max_attempts, expires_at,
                (expires_at < NOW()) AS is_expired
         FROM otps
         WHERE phone = :phone AND is_verified = 0
         ORDER BY id DESC LIMIT 1"
    );
    $stmt->execute([':phone' => $phone]);
    $otpRecord = $stmt->fetch();

    if (!$otpRecord) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'No active OTP request found. Please request a new OTP.'
        ]);
    }

    // 3. Check Expiry (5 minutes)
    if ((int)$otpRecord['is_expired'] === 1) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'OTP has expired. Please request a new code.'
        ]);
    }

    // 4. Check Attempt Limit (Max 5 attempts)
    $currentAttempts = (int)$otpRecord['attempts'];
    $maxAttempts     = (int)$otpRecord['max_attempts'];

    if ($currentAttempts >= $maxAttempts) {
        jsonResponse(403, [
            'success' => false,
            'locked'  => true,
            'error'   => 'Maximum verification attempts exceeded. Please request a new OTP.'
        ]);
    }

    // 5. Verify Cryptographic Hash
    $isMatch = password_verify($otp, $otpRecord['otp_hash']);

    if (!$isMatch) {
        $newAttempts = $currentAttempts + 1;
        $stmtUpdateAttempts = $pdo->prepare("UPDATE otps SET attempts = :attempts WHERE id = :id");
        $stmtUpdateAttempts->execute([':attempts' => $newAttempts, ':id' => $otpRecord['id']]);

        $remaining = max(0, $maxAttempts - $newAttempts);

        if ($remaining === 0) {
            jsonResponse(403, [
                'success' => false,
                'locked'  => true,
                'error'   => 'Too many incorrect attempts. Please request a new OTP.'
            ]);
        }

        jsonResponse(401, [
            'success'            => false,
            'attempts_remaining' => $remaining,
            'error'              => "Incorrect OTP. {$remaining} attempt" . ($remaining !== 1 ? 's' : '') . " remaining."
        ]);
    }

    // 6. OTP is Valid! Mark as verified
    $stmtVerify = $pdo->prepare("UPDATE otps SET is_verified = 1 WHERE id = :id");
    $stmtVerify->execute([':id' => $otpRecord['id']]);

    // 7. Upsert User in Users Table
    $stmtCheckUser = $pdo->prepare("SELECT id, phone, name, village, role, age, gender, status FROM users WHERE phone = :phone LIMIT 1");
    $stmtCheckUser->execute([':phone' => $phone]);
    $user = $stmtCheckUser->fetch();

    if ($user) {
        // User exists: update profile if new data is provided
        $userId = (int)$user['id'];
        $updates = [];
        $params  = [':id' => $userId];

        if (!empty($name))    { $updates[] = "name = :name";       $params[':name'] = $name; }
        if (!empty($village)) { $updates[] = "village = :village"; $params[':village'] = $village; }
        if (in_array($role, ['farmer', 'worker', 'leader'])) {
            $updates[] = "role = :role"; $params[':role'] = $role;
        }
        if ($age !== null && $age > 0) { $updates[] = "age = :age"; $params[':age'] = $age; }
        if (!empty($gender))  { $updates[] = "gender = :gender";   $params[':gender'] = $gender; }

        if (!empty($updates)) {
            $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = :id";
            $stmtUpdateUser = $pdo->prepare($sql);
            $stmtUpdateUser->execute($params);
        }
    } else {
        // New user: Insert into users table
        $userRole = in_array($role, ['farmer', 'worker', 'leader']) ? $role : 'farmer';
        $stmtCreateUser = $pdo->prepare(
            "INSERT INTO users (phone, name, village, role, age, gender, status, created_at)
             VALUES (:phone, :name, :village, :role, :age, :gender, 'active', NOW())"
        );
        $stmtCreateUser->execute([
            ':phone'   => $phone,
            ':name'    => $name ?: null,
            ':village' => $village ?: null,
            ':role'    => $userRole,
            ':age'     => $age ?: null,
            ':gender'  => $gender ?: null,
        ]);
        $userId = (int)$pdo->lastInsertId();
    }

    // Refresh user record
    $stmtFresh = $pdo->prepare("SELECT id, phone, name, village, role, age, gender, status FROM users WHERE id = :id");
    $stmtFresh->execute([':id' => $userId]);
    $userData = $stmtFresh->fetch();

    // 8. Generate Authentication Token (30 Days)
    $token = bin2hex(random_bytes(32));
    $stmtToken = $pdo->prepare(
        "INSERT INTO user_tokens (user_id, token, expires_at, created_at)
         VALUES (:user_id, :token, DATE_ADD(NOW(), INTERVAL :days DAY), NOW())"
    );
    $stmtToken->execute([
        ':user_id' => $userId,
        ':token'   => $token,
        ':days'    => TOKEN_EXPIRY_DAYS,
    ]);

    // 9. Return JSON Success Response
    jsonResponse(200, [
        'success'      => true,
        'message'      => 'OTP verified successfully.',
        'token'        => $token,
        'accessToken'  => $token, // backward compatibility with React Native store
        'refreshToken' => $token,
        'user'         => [
            'id'       => (string)$userData['id'],
            'phone'    => $userData['phone'],
            'name'     => $userData['name'] ?: 'Farmer / Worker',
            'village'  => $userData['village'] ?: '',
            'role'     => $userData['role'] ?: 'farmer',
            'age'      => $userData['age'] ? (int)$userData['age'] : null,
            'gender'   => $userData['gender'] ?: '',
            'status'   => $userData['status'],
        ],
    ]);

} catch (Exception $e) {
    error_log("verify_otp.php Error: " . $e->getMessage());
    jsonResponse(500, [
        'success' => false,
        'error'   => 'An unexpected server error occurred during verification.'
    ]);
}
