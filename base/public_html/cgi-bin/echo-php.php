<?php
header('Content-Type: text/html; charset=UTF-8');

$method = $_SERVER['REQUEST_METHOD'];
$protocol = $_SERVER['SERVER_PROTOCOL'];
$contentType = $_SERVER['CONTENT_TYPE'] ?? 'Not needed';

echo "<!DOCTYPE html>";
echo "<html lang='en'>";
echo "<head>";
echo "  <meta charset='UTF-8'>";
echo "  <title>PHP Echo</title>";
echo "  <link rel='stylesheet' href='../styles.css'>";
echo "</head>";
echo "<body>";
echo "<section>";
echo "  <h1>PHP Echo Response</h1>";
echo "  <h2>Request Information</h2>";
echo "  <p><strong>HTTP Protocol:</strong> " . htmlspecialchars($protocol) . "</p>";
echo "  <p><strong>HTTP Method:</strong> " . htmlspecialchars($method) . "</p>";
echo "  <p><strong>Content-Type:</strong> " . htmlspecialchars($contentType) . "</p>";

if ($method === 'GET') {
    echo "  <h2>Query Parameters</h2>";
    if (!empty($_GET)) {
        echo "  <ul>";
        foreach ($_GET as $key => $value) {
            echo "    <li><strong>" . htmlspecialchars($key) . ":</strong> " . htmlspecialchars($value) . "</li>";
        }
        echo "  </ul>";
    } else {
        echo "  <p>No query parameters received.</p>";
    }
} else {
    // Handle POST, PUT, DELETE
    $data = [];
    
    if (strpos($contentType, 'application/json') !== false) {
        $json = file_get_contents('php://input');
        $data = json_decode($json, true) ?? [];
        echo "  <h2>JSON Body</h2>";
    } else {
        // application/x-www-form-urlencoded
        $data = $_POST;
        echo "  <h2>Form Data</h2>";
    }
    
    if (!empty($data)) {
        echo "  <ul>";
        foreach ($data as $key => $value) {
            echo "    <li><strong>" . htmlspecialchars($key) . ":</strong> " . htmlspecialchars($value) . "</li>";
        }
        echo "  </ul>";
    } else {
        echo "  <p>No data received.</p>";
    }
}

echo "  <p><a href='../forms/echo_form.html'>Back to Form</a></p>";
echo "</section>";
echo "</body>";
echo "</html>";
?>