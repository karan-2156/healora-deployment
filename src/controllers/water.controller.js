const waterService = require("../services/water.service");

class WaterController {

    // Get today's water intake
    async getTodayWater(req, res, next) {
        try {

            const water = await waterService.getTodayWater(req.user._id);

            res.status(200).json({
                success: true,
                data: water
            });

        } catch (error) {
            next(error);
        }
    }

    // Add one glass
    async addGlass(req, res, next) {
        try {

            const water = await waterService.addGlass(req.user._id);

            res.status(200).json({
                success: true,
                message: "Glass added successfully.",
                data: water
            });

        } catch (error) {
            next(error);
        }
    }

    // Remove one glass
    async removeGlass(req, res, next) {
        try {

            const water = await waterService.removeGlass(req.user._id);

            res.status(200).json({
                success: true,
                message: "Glass removed successfully.",
                data: water
            });

        } catch (error) {
            next(error);
        }
    }
}

module.exports = new WaterController();