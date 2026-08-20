const express = require("express");
const { getUsers } = require("../controller/users.controller");
const router = express.Router();

router.get("/users", getUsers);

module.exports = router;
