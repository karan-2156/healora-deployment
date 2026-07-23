const DashboardService = require("../services/dashboard.service");

/**
 * GET /api/dashboard
 * Returns all dashboard data for the authenticated user.
 */
const getDashboard = async (req, res, next) => {
    try {

        const dashboard = await DashboardService.getDashboard(req.user.id);

        res.status(200).json({
            success: true,
            message: "Dashboard data fetched successfully.",
            data: dashboard
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboard
};