const express = require("express");
const { rzorder } = require("../controller/payment.controller");
const router = express.Router();

router.post("/order", rzorder);

module.exports = router;
