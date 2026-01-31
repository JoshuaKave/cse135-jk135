<?php
header('Content-Type: text/plain; charset=UTF-8');

foreach ($_SERVER as $key => $value) {
    if (is_array($value)) {
        $value = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
    echo $key . "=" . $value . "\n";
}
?>