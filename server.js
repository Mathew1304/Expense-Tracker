"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var body_parser_1 = require("body-parser");
var cors_1 = require("cors");
var invite_1 = require("./src/api/invite"); // your invite route
var dotenv_1 = require("dotenv");
dotenv_1.default.config(); // loads .env file
var app = (0, express_1.default)();
var PORT = process.env.PORT || 5000;
// ---- Middleware ----
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
// ---- Routes ----
app.use("/api/invite", invite_1.default);
// ---- Root Test Route ----
app.get("/", function (req, res) {
    res.send("Server is running!");
});
// ---- Start Server ----
app.listen(PORT, function () {
    console.log("Server running on http://localhost:".concat(PORT));
});
