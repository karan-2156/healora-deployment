const express = require("express");
const router = express.Router();

const DashboardController = require("../controllers/dashboard.controller");
const { protect } = require("../middleware/auth.middleware");

// GET /api/dashboard
router.get(
    "/",
    protect,
    DashboardController.getDashboard
);

module.exports = router;