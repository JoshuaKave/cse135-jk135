const express = require("express");
const { common } = require("../lib/common");

const router = express.Router();

router.get("/environment-nodejs", (req, res) => {
  res.json({
    ...common(req),
    env: process.env
  });
});

module.exports = router;
