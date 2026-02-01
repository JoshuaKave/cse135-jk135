const express = require('express');
const {common, escapeHTML} = require('../lib/common');

const router = express.Router();

router.get("/hello-html-nodejs", (req, res) => {
    const c = common(req);
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Hello from Node.js</title>
</head>
<body>
    <h1>Hello, this is Josh from my Node.js world!</h1>
    <p>Language: NodeJS</p>
    <p>Generated at: ${escapeHTML(c.time)}</p>
    <p>Your IP: ${escapeHTML(c.ip)}</p>
</body>
</html>`);
});

router.get("/hello-json-node", (req, res) => {
  const c = common(req);
  res.json({
    message: `Hello from ${TEAM.join(", ")}!`,
    language: "NodeJS (Express)",
    generated_at: c.time,
    your_ip: c.ip
  });
});

module.exports = router;