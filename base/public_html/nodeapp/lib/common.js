const os = require("os");

function nowIso() {
return new Date().toLocaleString("sv-SE", {
    timeZone: "America/Los_Angeles"
});

}

function common(req) {
  return {
    hostname: os.hostname(),
    time: nowIso(),
    ip: req.ip,
    userAgent: req.get("user-agent") || ""
  };
}

function escapeHTML(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

module.exports = { common, nowIso, escapeHTML };
