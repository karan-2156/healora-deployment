const HealthService = require("./health.service");
const AppointmentService = require("./appointment.service");
const ReminderService = require("./reminder.service");
const ReportService = require("./report.service");
const waterService = require("./water.service");
class DashboardService {

    async getDashboard(userId) {

        // These will run in parallel
        const [
            healthSummary,
            appointments,
            reminders,
            reports
        ] = await Promise.all([
            HealthService.getDashboardSummary(userId),
            AppointmentService.getUserAppointments(userId, { upcoming: true }),
            ReminderService.getUserReminders(userId, true),
            ReportService.getUserReports(userId)
        ]);

        // Next Appointment
const nextAppointment =
    appointments.length > 0 ? appointments[0] : null;

// Today's Medicines
const today = new Date();

today.setHours(0, 0, 0, 0);
console.log("All Reminders:", reminders);
const todayMedicines = [];
const todayWater = await waterService.getTodayWater(userId);
console.log("========== DASHBOARD DEBUG ==========");
console.log("Total reminders:", reminders.length);

reminders.forEach((r, index) => {
    console.log(`Reminder ${index + 1}`, {
        medicineName: r.medicineName,
        isActive: r.isActive,
        startDate: r.startDate,
        endDate: r.endDate,
        times: r.times,
        completedLogs: r.completedLogs
    });
});

console.log("=====================================");
reminders.forEach(reminder => {

    console.log("Today:", today);
    console.log("Reminder Start:", new Date(reminder.startDate));

    if (!reminder.isActive) {
        console.log("Skipped: Inactive");
        return;
    }

    const reminderStart = new Date(reminder.startDate);
reminderStart.setHours(0, 0, 0, 0);

if (reminderStart > today) {
    console.log("Skipped: Start date is after today");
    return;
}

    if (reminder.endDate) {

    const reminderEnd = new Date(reminder.endDate);
    reminderEnd.setHours(0, 0, 0, 0);

    if (reminderEnd < today) {
        console.log("Skipped: End date has passed");
        return;
    }

}

    console.log("Reminder Added");

    reminder.times.forEach(time => {

    const todayString = new Date().toISOString().split("T")[0];

    const taken = reminder.completedLogs?.some(log =>
        log.date === todayString &&
        log.time === time
    );

    todayMedicines.push({
        id: reminder._id,
        medicineName: reminder.medicineName,
        dosage: reminder.dosage,
        time,
        notes: reminder.notes,
        frequency: reminder.frequency,
        status: taken ? "taken" : "pending"
    });

    });

todayMedicines.sort((a, b) =>
    a.time.localeCompare(b.time)
);
 });
// Recent Activity
const recentActivity = [];

// Reports
reports.forEach(report => {
    recentActivity.push({
        type: "report",
        icon: "📄",
        title: `Uploaded ${report.originalFileName}`,
        timestamp: report.createdAt
    });
});

// Medicines
reminders.forEach(reminder => {
    recentActivity.push({
        type: "medicine",
        icon: "💊",
        title: `Added ${reminder.medicineName}`,
        timestamp: reminder.createdAt
    });
});

// Appointments
appointments.forEach(appointment => {
    recentActivity.push({
        type: "appointment",
        icon: "📅",
        title: `Appointment with ${appointment.doctorName}`,
        timestamp: appointment.createdAt
    });
});

// Latest first
recentActivity.sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
);

recentActivity.forEach(activity => {

    activity.time = new Date(activity.timestamp).toLocaleString();

});
console.log("Final Today Medicines:", todayMedicines);
return {
    healthSummary,
    nextAppointment,
    todayMedicines,
    recentActivity,
    todayWater
};

    }

}

module.exports = new DashboardService();