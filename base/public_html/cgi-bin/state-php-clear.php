<?php
// Clear cookies by expiring them
setcookie("favorite_color", "", time() - 3600, "/");
setcookie("favorite_food",  "", time() - 3600, "/");

// Redirect back to view
header("Location: /cgi-bin/state-php-view.php");
exit;
?>