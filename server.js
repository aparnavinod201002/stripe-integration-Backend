const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");

const routes = require('./Routes/paymentRoutes');
require("./Config/db");
app.use(cors({
  credentials: true
}));
app.use(express.json());
app.use(cors())
app.use(cookieParser());

app.use("/routes", routes)

module.exports = app;