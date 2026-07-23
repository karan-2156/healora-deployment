const express = require("express");
const WaterController = require("../controllers/water.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

// All water routes require authentication
router.use(protect);

// Get today's water intake
router.get("/", WaterController.getTodayWater);

// Add one glass
router.patch("/add", WaterController.addGlass);

// Remove one glass
router.patch("/remove", WaterController.removeGlass);

module.exports = router;