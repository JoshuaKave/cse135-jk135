const express = require("express");
const os = require("os");

const app = express();

// so req.ip works correctly behind Apache later
app.set("trust proxy", true);

// body parsing for your echo homework later
app.use(express.json({ type: ["application/json", "application/*+json"] }));
app.use(express.urlencoded({ extended: false }));

app.get("/ping", (req, res) => {
  res.json({
    ok: true,
    hostname: os.hostname(),
    time: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get("user-agent") || ""
  });
});

app.listen(3000, "127.0.0.1", () => {
  console.log("Express listening on http://127.0.0.1:3000");
});
