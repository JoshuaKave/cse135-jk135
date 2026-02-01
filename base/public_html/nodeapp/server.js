const express = require("express");
// const cookieParser = require("cookie-parser");

const helloRoutes = require("./routes/hello");
const envRoutes = require("./routes/env");
// const echoRoutes = require("./routes/echo");
// const stateRoutes = require("./routes/state");

const app = express();
app.set("trust proxy", true);

// body parsing
app.use(express.json({ type: ["application/json", "application/*+json"] }));
app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());

// optional ping for testing
app.get("/ping", (req, res) => res.json({ ok: true }));

// mount routes
app.use(helloRoutes);
app.use(envRoutes);
// app.use(echoRoutes);
// app.use(stateRoutes);

app.listen(3000, "127.0.0.1", () => {
  console.log("Express listening on http://127.0.0.1:3000");
});
