<?php
/**
 * db.php
 * Database connection handler & common API helper utilities.
 * Place in public_html/api/
 */

require_once __DIR__ . '/config.php';

// ── Global CORS & JSON Response Headers ────────────────────────────────────
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Respond 200 OK immediately to preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/**
 * Get a Singleton PDO database connection.
 * @return PDO
 */
function getDbConnection(): PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        error_log("Database connection failed: " . $e->getMessage());
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Database connection failed. Please verify database credentials in config.php.'
        ]);
        exit;
    }
}

/**
 * Standardized JSON response helper.
 * @param int $statusCode HTTP Status Code
 * @param array $data Associative array to encode as JSON
 */
function jsonResponse(int $statusCode, array $data): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Parse JSON or POST body payload safely.
 * @return array
 */
function readJsonInput(): array {
    $raw = file_get_contents('php://input');
    if (!empty($raw)) {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }
    return $_POST ?: [];
}

/**
 * Validate 10-digit Indian Mobile Number.
 * @param string $phone
 * @return bool
 */
function isValidIndianMobile(string $phone): bool {
    return (bool) preg_match('/^[6-9]\d{9}$/', $phone);
}

/**
 * Send real OTP SMS via Renflair SMS Gateway API.
 * Endpoint: https://sms.renflair.in/V1.php?API=...&PHONE=...&OTP=...
 *
 * @param string $phone 10-digit mobile number
 * @param string $otp 4-digit OTP
 * @return array ['success' => bool, 'message' => string, 'raw' => string]
 */
function sendRenflairSMS(string $phone, string $otp): array {
    $apiKey = RENFLAIR_API_KEY;
    if (empty($apiKey)) {
        return [
            'success' => false,
            'message' => 'Renflair API key is not configured.'
        ];
    }

    $url = RENFLAIR_ENDPOINT . '?' . http_build_query([
        'API'   => $apiKey,
        'PHONE' => $phone,
        'OTP'   => $otp,
    ]);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 6);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) {
        error_log("Renflair cURL error for $phone: $curlError");
        return [
            'success' => false,
            'message' => 'Failed to reach Renflair SMS Gateway: ' . $curlError
        ];
    }

    $decoded = json_decode($response, true);
    $status = $decoded['status'] ?? null;
    $message = $decoded['message'] ?? 'No message returned';

    // Renflair responds with {"status":"SUCCESS","message":"SMS SENT TO ... AND WHATSAPP"}
    $isSuccess = ($httpCode === 200) && ($status !== null && strtoupper($status) === 'SUCCESS');

    if (!$isSuccess) {
        error_log("Renflair rejected SMS for $phone: HTTP $httpCode - Response: $response");
        return [
            'success' => false,
            'message' => $message ?: 'SMS provider reported failure',
            'raw'     => $response
        ];
    }

    return [
        'success' => true,
        'message' => $message,
        'raw'     => $response
    ];
}
