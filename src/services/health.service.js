/**
 * Health Service
 *
 * Business logic for health readings (blood pressure, weight, blood sugar).
 * Also provides an aggregated dashboard summary.
 *
 * DESIGN DECISIONS:
 *
 * 1. DASHBOARD SUMMARY via parallel queries:
 *    getDashboardSummary() fetches:
 *      - Latest reading of each type (3 queries)
 *      - Total reading count per type (1 aggregation)
 *    We use Promise.all() to run them concurrently, not sequentially.
 *    This reduces response time from ~3× to ~1× query latency.
 *
 *    ALTERNATIVE: A single MongoDB aggregation pipeline with $group and $sort.
 *    Pros: One network round-trip.
 *    Cons: More complex, harder to read, marginal gain at this scale.
 *    IMPROVEMENT: Switch to aggregation if reading collection grows large.
 *
 * 2. POLYMORPHIC TYPE FILTERING:
 *    getUserReadings accepts an optional `type` filter.
 *    No type = return all (useful for a timeline of all health events).
 *    With type = return only that metric (useful for a trend chart).
 *
 * 3. DATE RANGE FILTERING:
 *    Accepts startDate / endDate for chart queries (e.g., last 30 days).
 *    If not provided, returns all records up to the limit.
 *
 * 4. READING LIMIT:
 *    Default limit of 50 records per request.
 *    Charts typically show the last 7, 14, or 30 days — 50 is generous.
 *    Prevents accidentally returning thousands of readings.
 *
 * 5. EXTRACTING TYPE-SPECIFIC DATA for the summary:
 *    Since readings are polymorphic, each document has only one populated
 *    sub-object. We extract the relevant value for display in the summary
 *    (e.g., "120/80 mmHg" for BP, "70 kg" for weight).
 */

const { HealthReading } = require('../models');
const AppError           = require('../utils/AppError');

const DEFAULT_LIMIT = 50;

// ─────────────────────────────────────────────────────────────
// HEALTH SCORE CALCULATION
// ─────────────────────────────────────────────────────────────
const evaluateBloodPressureScore = (bp) => {
  if (!bp || bp.systolic == null || bp.diastolic == null) return null;
  const { systolic, diastolic } = bp;

  if (systolic >= 180 || diastolic >= 120) return 15;  // Hypertensive crisis
  if (systolic >= 140 || diastolic >= 90)  return 40;  // Stage 2
  if (systolic >= 130 || diastolic >= 80)  return 65;  // Stage 1
  if (systolic >= 120)                     return 85;  // Elevated
  return 100;                                          // Normal
};

const evaluateBloodSugarScore = (sugar) => {
  if (!sugar || sugar.value == null) return null;
  // Normalize mmol/L to mg/dL so thresholds are consistent
  const mgdl = sugar.unit === 'mmol/L' ? sugar.value * 18 : sugar.value;

  if (mgdl < 70) return 55; // Low / hypoglycemia risk

  if (sugar.mealContext === 'fasting') {
    if (mgdl <= 99)  return 100;
    if (mgdl <= 125) return 70;
    return 40;
  }

  // post_meal, random, before_bed
  if (mgdl < 140) return 100;
  if (mgdl < 200) return 70;
  return 40;
};

const evaluateWeightScore = (weight) => {
  // No height on this model, so we can't judge BMI/healthy-range here —
  // logging a weight reading just earns neutral credit for tracking it.
  if (!weight || weight.value == null) return null;
  return 100;
};

const buildHealthScore = ({ latestBP, latestWeight, latestSugar }) => {
  const scores = [];

  const bpScore = evaluateBloodPressureScore(latestBP?.bloodPressure);
  if (bpScore != null) scores.push(bpScore);

  const sugarScore = evaluateBloodSugarScore(latestSugar?.bloodSugar);
  if (sugarScore != null) scores.push(sugarScore);

  const weightScore = evaluateWeightScore(latestWeight?.weight);
  if (weightScore != null) scores.push(weightScore);

  if (scores.length === 0) {
    return { healthScore: null, healthStatus: 'No data yet' };
  }

  const healthScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const healthStatus =
    healthScore >= 90 ? 'Excellent' :
    healthScore >= 75 ? 'Good' :
    healthScore >= 50 ? 'Fair' :
    'Needs Attention';

  return { healthScore, healthStatus };
};

// ─────────────────────────────────────────────────────────────
// LOG A READING
// ─────────────────────────────────────────────────────────────
/**
 * Creates a new health reading document.
 * The Mongoose pre-save hook validates the correct sub-object is present.
 *
 * @param {string} userId
 * @param {object} data   - Validated body including type + type-specific sub-object
 * @returns {Promise<HealthReading>}
 */
const logReading = async (userId, data) => {
  return HealthReading.create({ userId, ...data });
};

// ─────────────────────────────────────────────────────────────
// READ ALL (with filters)
// ─────────────────────────────────────────────────────────────
/**
 * Returns health readings for a user with optional filters.
 *
 * @param {string}  userId
 * @param {object}  options
 * @param {string}  [options.type]      - Filter by reading type
 * @param {number}  [options.limit]     - Max records to return (default: 50)
 * @param {Date}    [options.startDate] - Filter recordedAt >= startDate
 * @param {Date}    [options.endDate]   - Filter recordedAt <= endDate
 * @returns {Promise<HealthReading[]>}
 */
const getUserReadings = async (userId, { type, limit, startDate, endDate } = {}) => {
  const filter = { userId };

  if (type) filter.type = type;

  if (startDate || endDate) {
    filter.recordedAt = {};
    if (startDate) filter.recordedAt.$gte = new Date(startDate);
    if (endDate)   filter.recordedAt.$lte = new Date(endDate);
  }

  const maxLimit = Math.min(parseInt(limit, 10) || DEFAULT_LIMIT, 100);

  return HealthReading
    .find(filter)
    .sort({ recordedAt: -1 }) // Most recent first
    .limit(maxLimit);
};

// ─────────────────────────────────────────────────────────────
// READ ONE
// ─────────────────────────────────────────────────────────────
/**
 * @param {string} userId
 * @param {string} readingId
 * @returns {Promise<HealthReading>}
 * @throws  {AppError} 404
 */
const getReadingById = async (userId, readingId) => {
  const reading = await HealthReading.findOne({ _id: readingId, userId });

  if (!reading) {
    throw new AppError('Health reading not found or does not belong to your account.', 404);
  }

  return reading;
};

// ─────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────
/**
 * @param {string} userId
 * @param {string} readingId
 * @returns {Promise<void>}
 * @throws  {AppError} 404
 */
const deleteReading = async (userId, readingId) => {
  const reading = await HealthReading.findOneAndDelete({ _id: readingId, userId });

  if (!reading) {
    throw new AppError('Health reading not found or does not belong to your account.', 404);
  }
};

// ─────────────────────────────────────────────────────────────
// DASHBOARD SUMMARY
// ─────────────────────────────────────────────────────────────
/**
 * Builds the health dashboard summary:
 *   - Latest reading of each type
 *   - Total reading count per type
 *
 * Uses Promise.all() for concurrent queries.
 *
 * @param {string} userId
 * @returns {Promise<object>} - Dashboard summary object
 */
const getDashboardSummary = async (userId) => {
  const types = ['blood_pressure', 'weight', 'blood_sugar'];

  // ── Run all queries concurrently ─────────────────────────
  const [
    latestBP,
    latestWeight,
    latestSugar,
    countAggregation,
    weeklyAggregation
] = await Promise.all([
    // Latest reading of each type
    HealthReading.findOne({ userId, type: 'blood_pressure' }).sort({ recordedAt: -1 }),
    HealthReading.findOne({ userId, type: 'weight'         }).sort({ recordedAt: -1 }),
    HealthReading.findOne({ userId, type: 'blood_sugar'    }).sort({ recordedAt: -1 }),

    // Count documents per type in one aggregation
    HealthReading.aggregate([
      { $match: { userId: userId } }, // Must pass userId as-is (aggregation doesn't auto-cast)
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),

    HealthReading.aggregate([

    {
        $match: {

            userId: userId,

            recordedAt: {

                $gte: new Date(
                    Date.now() - 7 * 24 * 60 * 60 * 1000
                )

            }

        }

    },

    {

        $group: {

            _id: {

                day: {

                    $dayOfWeek: "$recordedAt"

                }

            },

            count: {

                $sum: 1

            }

        }

    }

])
  ]);

  // ── Build count map { blood_pressure: 12, weight: 8, ... } ─
  const readingCounts = types.reduce((acc, t) => ({ ...acc, [t]: 0 }), {});
  countAggregation.forEach(({ _id, count }) => {
    readingCounts[_id] = count;
  });

  const totalReadings = Object.values(readingCounts).reduce((sum, c) => sum + c, 0);
  const { healthScore, healthStatus } = buildHealthScore({ latestBP, latestWeight, latestSugar });

  // ── Format latest readings for display ───────────────────
  const formatReading = (reading) => {
    if (!reading) return null;
    return reading.toJSON();
  };

  
// ---------- HEALTH SCORE CALCULATION ----------
const dayNames = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
];

const weeklyHealth = dayNames.map((day, index) => {

    const found = weeklyAggregation.find(

        item => item._id.day === index + 1

    );

    return {

        day,

        score: found ? found.count * 20 : 0

    };

});

return {

    latestReadings: {
        blood_pressure: formatReading(latestBP),
        weight: formatReading(latestWeight),
        blood_sugar: formatReading(latestSugar)
    },

    readingCounts,

    totalReadings,

    healthScore,

    healthStatus,

weeklyHealth

};
};

module.exports = {
  logReading,
  getUserReadings,
  getReadingById,
  deleteReading,
  getDashboardSummary
};
