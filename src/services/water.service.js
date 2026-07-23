const { WaterIntake } = require("../models");

class WaterService {

    // Get today's water intake
    async getTodayWater(userId) {

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let water = await WaterIntake.findOne({
            userId,
            date: today
        });

        if (!water) {
            water = await WaterIntake.create({
                userId,
                date: today,
                glasses: 0,
                goal: 8
            });
        }

        return water;
    }

    // Add one glass
    async addGlass(userId) {

        const water = await this.getTodayWater(userId);

        if (water.glasses < water.goal) {
            water.glasses += 1;
            await water.save();
        }

        return water;
    }

    // Remove one glass
    async removeGlass(userId) {

        const water = await this.getTodayWater(userId);

        if (water.glasses > 0) {
            water.glasses -= 1;
            await water.save();
        }

        return water;
    }

}

module.exports = new WaterService();