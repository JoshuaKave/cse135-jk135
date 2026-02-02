<?php
header("Content-Type: text/html; charset=UTF-8");
?>
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <title>State Demo (PHP) - Set</title>
        <link rel="stylesheet" href="../styles.css">
    </head>
    <body>
        <h1>State Demo (PHP) - Set</h1>

        <form method="post" action="/cgi-bin/state-php-save.php">
            <label>
            Favorite color:
            <input name="favorite_color" required>
            </label>
            <label>
            Favorite food:
            <input name="favorite_food" required>
            </label>
            <button type="submit">Save</button>
        </form>

        <p><a href="/cgi-bin/state-php-view.php">View saved state</a></p>
    </body>
 </html>
