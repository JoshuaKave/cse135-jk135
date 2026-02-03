<?php
header('Content-Type: text/html; charset=UTF-8');

$method = $_SERVER['REQUEST_METHOD'];
$protocol = $_SERVER['SERVER_PROTOCOL'];
$contentType = $_SERVER['CONTENT_TYPE'] ?? 'Not needed';
$hostname = $_SERVER['SERVER_NAME'] ?? 'Unknown';
$dateTime = date('c');
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
$ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';

$intendedMethod = $method;
if ($method === 'GET' && isset($_GET['_method'])) {
    $intendedMethod = $_GET['_method'];
} elseif ($method === 'POST' && isset($_POST['_method'])) {
    $intendedMethod = $_POST['_method'];
}

echo "<!DOCTYPE html>";
echo "<html lang='en'>";
echo "<head>";
echo "  <meta charset='UTF-8'>";
echo "  <title>PHP Echo</title>";
echo "  <link rel='stylesheet' href='../styles.css'>";
echo "  <style>";
echo "    pre { background-color: #f5f5f5; padding: 1rem; border-radius: 0.25rem; overflow-x: auto; }";
echo "  </style>";
echo "</head>";
echo "<body>";
echo "<section>";
echo "  <h1>PHP Echo Response</h1>";
echo "  <h2>Request Information</h2>";
echo "  <p><strong>HTTP Protocol:</strong> " . htmlspecialchars($protocol) . "</p>";
echo "  <p><strong>HTTP Method:</strong> " . htmlspecialchars($intendedMethod) . "</p>";
echo "  <p><strong>Actual HTTP Method:</strong> " . htmlspecialchars($method) . "</p>";
echo "  <p><strong>Content-Type:</strong> " . htmlspecialchars($contentType) . "</p>";
echo "  <p><strong>Hostname:</strong> " . htmlspecialchars($hostname) . "</p>";
echo "  <p><strong>Date/Time:</strong> " . htmlspecialchars($dateTime) . "</p>";
echo "  <p><strong>User-Agent:</strong> " . htmlspecialchars($userAgent) . "</p>";
echo "  <p><strong>IP Address:</strong> " . htmlspecialchars($ipAddress) . "</p>";

if ($method === 'GET') {
    echo "  <h2>Query Parameters</h2>";
    if (!empty($_GET)) {
        echo "  <ul>";
        foreach ($_GET as $key => $value) {
            if ($key !== '_method' && $key !== '_encoding') {
                echo "    <li><strong>" . htmlspecialchars($key) . ":</strong> " . htmlspecialchars($value) . "</li>";
            }
        }
        echo "  </ul>";
    } else {
        echo "  <p>No query parameters received.</p>";
    }
} else {
    $data = [];
    $isJson = false;
    
    if (strpos($contentType, 'application/json') !== false) {
        $json = file_get_contents('php://input');
        $data = json_decode($json, true) ?? [];
        $isJson = true;
        echo "  <h2>JSON Body</h2>";
    } else {
        if ($method === 'POST') {
            $data = $_POST;
        } else {
            $input = file_get_contents('php://input');
            if (!empty($input)) {
                parse_str($input, $data);
            }
        }
        echo "  <h2>Form Data</h2>";
    }
    
    if (!empty($data)) {
        if ($isJson) {
            echo "  <pre>" . htmlspecialchars(json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)) . "</pre>";
        } else {
            echo "  <ul>";
            foreach ($data as $key => $value) {
                if ($key !== '_method' && $key !== '_encoding') {
                    echo "    <li><strong>" . htmlspecialchars($key) . ":</strong> " . htmlspecialchars($value) . "</li>";
                }
            }
            echo "  </ul>";
        }
    } else {
        echo "  <p>No data received.</p>";
    }
}

echo "  <p><a href='/forms/echo_form.html'>Back to Form</a></p>";
echo "</section>";
echo "</body>";
echo "</html>";
?>