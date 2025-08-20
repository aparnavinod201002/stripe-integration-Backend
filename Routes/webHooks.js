const express = require('express');
const router = express.Router();
const bodyParser = require("body-parser");
const controller = require('../Controller/paymentController');

router.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  controller.stripeWebhook
);


module.exports = router