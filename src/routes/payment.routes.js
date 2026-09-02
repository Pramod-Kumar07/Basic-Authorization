const express = require("express");
const { rzorder, rzverifypaymanet } = require("../controller/payment.controller");
const router = express.Router();

router.post("/order", rzorder);
router.post("/verifypayment", rzverifypaymanet);

module.exports = router;
