<?php
// Read POST fields
$color = isset($_POST["favorite_color"]) ? trim($_POST["favorite_color"]) : "";
$food  = isset($_POST["favorite_food"]) ? trim($_POST["favorite_food"]) : "";

// Set cookies (1 day lifetime)
$oneDay = 86400;

setcookie("favorite_color", $color, time() + $oneDay, "/");
setcookie("favorite_food",  $food,  time() + $oneDay, "/");

header("Location: /cgi-bin/state-php-view.php");
exit;
?>