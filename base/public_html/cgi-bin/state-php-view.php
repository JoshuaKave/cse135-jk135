<?php
header("Content-Type: text/html; charset=UTF-8");

$color = isset($_COOKIE["favorite_color"]) ? $_COOKIE["favorite_color"] : "";
$food  = isset($_COOKIE["favorite_food"])  ? $_COOKIE["favorite_food"]  : "";

// Escape for HTML output
function h($s) { return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8"); }
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>State Demo (PHP) - View</title>
</head>
<body>
  <h1>State Demo (PHP) - View</h1>

  <?php if ($color === "" && $food === ""): ?>
    <p><em>No state saved yet.</em></p>
  <?php else: ?>
    <p><strong>Favorite color:</strong> <?= h($color) ?></p>
    <p><strong>Favorite food:</strong> <?= h($food) ?></p>
  <?php endif; ?>

  <form method="post" action="/cgi-bin/state-php-clear.php">
    <button type="submit">Clear saved state</button>
  </form>

  <p><a href="/cgi-bin/state-php-set.php">Back to set page</a></p>
</body>
</html>
