const express = require("express");
const { common } = require("../lib/common");

const router = express.Router();

router.get("/environment-nodejs", (req, res) => {
  res.json({
    ...common(req),
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      headers: req.headers
    },
    env: process.env
  });
});

module.exports = router;
