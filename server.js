const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const allowedOrigins = [   // local frontend
  "https://stripe-integration-frontend-rouge.vercel.app"  ,
  "http://localhost:5173" // deployed frontend
];
const routes = require('./Routes/paymentRoutes');
require("./Config/db");
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use("/routes", routes)

module.exports = app;