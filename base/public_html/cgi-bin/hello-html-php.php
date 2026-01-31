<?php
echo "<!DOCTYPE html>";
echo "<html lang=\"en\">";
echo "<head>";
echo "  <meta charset=\"UTF-8\">";
echo "  <title>PHP Hello</title>";
echo "</head>";
echo "<body>";
echo "  <h1>Hello, this is Josh, and welcome to my PHP World!</h1>";
echo "  <p>This is an example of a PHP generated page.</p>";

echo "  <p><strong>Language:</strong> PHP</p>";
echo "  <p><strong>Generated at:</strong> " . date('Y-m-d H:i:s') . "</p>";
echo "  <p><strong>Your IP:</strong> " . htmlspecialchars($_SERVER['REMOTE_ADDR'] ?? 'Unknown') . "</p>";

echo "</body>";
echo "</html>";
?>