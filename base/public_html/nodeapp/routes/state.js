const express = require("express");

const router = express.Router();

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// 1) Set page
router.get("/state-node-set", (req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>State Demo (Node) - Set</title></head>
<body>
  <h1>State Demo (Node/Express) - Set</h1>

  <form method="post" action="/state-node-save">
    <label>Favorite color: <input name="favorite_color" required></label><br><br>
    <label>Favorite food: <input name="favorite_food" required></label><br><br>
    <button type="submit">Save</button>
  </form>

  <p><a href="/state-node-view">View saved state</a></p>
</body>
</html>`);
});

// Save handler (sets cookies, then redirect)
router.post("/state-node-save", (req, res) => {
  const color = String(req.body.favorite_color || "").trim().slice(0, 100);
  const food  = String(req.body.favorite_food || "").trim().slice(0, 100);

  res.cookie("favorite_color", color, { path: "/", sameSite: "Lax" });
  res.cookie("favorite_food", food, { path: "/", sameSite: "Lax" });

  res.redirect("/state-node-view");
});

// 3) View page
router.get("/state-node-view", (req, res) => {
  const color = req.cookies.favorite_color || "";
  const food  = req.cookies.favorite_food || "";

  res.type("html").send(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>State Demo (Node) - View</title></head>
<body>
  <h1>State Demo (Node/Express) - View</h1>

  ${
    (!color && !food)
      ? `<p><em>No state saved yet.</em></p>`
      : `<p><strong>Favorite color:</strong> ${escapeHtml(color)}</p>
         <p><strong>Favorite food:</strong> ${escapeHtml(food)}</p>`
  }

  <form method="post" action="/state-node-clear">
    <button type="submit">Clear saved state</button>
  </form>

  <p><a href="/state-node-set">Back to set page</a></p>
</body>
</html>`);
});

// 4) Clear handler
router.post("/state-node-clear", (req, res) => {
  res.clearCookie("favorite_color", { path: "/" });
  res.clearCookie("favorite_food", { path: "/" });
  res.redirect("/state-node-view");
});

module.exports = router;
