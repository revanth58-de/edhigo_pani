<?php
/**
 * logout.php
 * Invalidate user authentication session/token.
 * Place in public_html/api/
 */

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, ['success' => false, 'error' => 'Method not allowed. Use POST.']);
}

// 1. Extract Bearer Token from Authorization Header or Request Body
$token = null;
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

if (!empty($authHeader) && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $token = $matches[1];
}

if (!$token) {
    $input = readJsonInput();
    $token = trim($input['token'] ?? '');
}

if (!empty($token)) {
    try {
        $pdo = getDbConnection();
        $stmt = $pdo->prepare("DELETE FROM user_tokens WHERE token = :token");
        $stmt->execute([':token' => $token]);
    } catch (Exception $e) {
        error_log("logout.php Error: " . $e->getMessage());
    }
}

jsonResponse(200, [
    'success' => true,
    'message' => 'Logged out successfully.'
]);
