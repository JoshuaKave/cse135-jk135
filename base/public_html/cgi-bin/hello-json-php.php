<?php
header('Content-Type: application/json');

$response = [
    'message' => 'Hello, this is Josh, and welcome to my PHP World!',
    'description' => 'This is an example of a PHP generated page.',
    'language' => 'PHP',
    'generated_at' => date('Y-m-d H:i:s'),
    'your_ip' => htmlspecialchars($_SERVER['REMOTE_ADDR'] ?? 'Unknown')
];

echo json_encode($response);
?>
