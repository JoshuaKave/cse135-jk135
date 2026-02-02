const express = require("express");
const cookieParser = require("cookie-parser");

const helloRoutes = require("./routes/hello");
const envRoutes = require("./routes/env");
const stateRoutes = require("./routes/state");

const app = express();
app.set("trust proxy", true);

app.use(express.json({ type: ["application/json", "application/*+json"] }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get("/ping", (req, res) => res.json({ ok: true }));

app.use(helloRoutes);
app.use(envRoutes);
app.use(stateRoutes);

app.listen(3000, "127.0.0.1", () => {
  console.log("Express listening on http://127.0.0.1:3000");
});
