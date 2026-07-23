const express = require("express");

const router = express.Router();

const {

    sendTestEmail

} = require("../controllers/test.controller");

router.get("/email", sendTestEmail);

module.exports = router;