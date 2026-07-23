const mongoose = require("mongoose");

const WaterIntakeSchema = new mongoose.Schema(
{
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    date: {
        type: Date,
        required: true
    },

    glasses: {
        type: Number,
        default: 0,
        min: 0,
        max: 20
    },

    goal: {
        type: Number,
        default: 8,
        min: 1,
        max: 20
    }

},
{
    timestamps: true
}
);

// One record per user per day
WaterIntakeSchema.index(
    {
        userId: 1,
        date: 1
    },
    {
        unique: true
    }
);

module.exports = mongoose.model(
    "WaterIntake",
    WaterIntakeSchema
);