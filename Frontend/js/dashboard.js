/* ==========================================
   HEALORA DASHBOARD
========================================== */
const API_BASE_URL = "http://localhost:5000/api";

/* Updates BOTH the number and the visual ring around it.
   Without this, the ring stays stuck at the CSS-hardcoded 94%
   even when a real score comes back from the API. */
function updateHealthScore(score, statusText) {

    if (typeof score !== "number" || isNaN(score)) return;

    const clamped = Math.max(0, Math.min(100, Math.round(score)));

    const valueEl = document.querySelector(".value");
    if (valueEl) valueEl.textContent = clamped + "%";

    const circleEl = document.querySelector(".circle");
    if (circleEl) {
        circleEl.style.background =
            `conic-gradient(var(--secondary) 0%, var(--secondary) ${clamped}%, #E5E7EB ${clamped}%)`;
    }

    const statusEl = document.querySelector(".health-score p");
    if (statusEl) {
        statusEl.textContent = statusText || (
            clamped >= 90 ? "Excellent" :
            clamped >= 75 ? "Good" :
            clamped >= 50 ? "Fair" :
            "Needs Attention"
        );
    }
}

let backendHealthScore = null;

const token = localStorage.getItem("token");

if (!token) {

    window.location.href = "login.html";

}

let storedUser = JSON.parse(localStorage.getItem("user"));

document.addEventListener("DOMContentLoaded", () => {
 storedUser = JSON.parse(localStorage.getItem("user"));


    /* ======================================
       AUTO GREETING
    ====================================== */

    const greeting =
        document.querySelector(".topbar h1");

    if (greeting) {

        const hour = new Date().getHours();

        let message = "Good Evening";

        if (hour < 12) {

            message = "Good Morning";

        }

        else if (hour < 17) {

            message = "Good Afternoon";

        }

        const userName = storedUser?.name || "User";

        greeting.innerHTML =
        `${message}, <span>${userName} 👋</span>`;


        const profileImage = document.querySelector(".profile img");
        const profileAvatar = document.getElementById("profileAvatar");

        
        if (profileImage && storedUser) {

            profileImage.src =
                `https://ui-avatars.com/api/?name=${encodeURIComponent(storedUser.name)}&background=0B4F6C&color=fff`;

        }

        if (profileAvatar) {

            profileAvatar.style.cursor = "pointer";

            profileAvatar.addEventListener("click", () => {

            window.location.href = "profile.html";

        });

}

        async function loadDashboard() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/dashboard`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const result = await response.json();

        console.log("Dashboard Response:", result);

        const dashboard = result.data;

        // ===============================
// Load Logged In User
// ===============================

/*const storedUser = JSON.parse(localStorage.getItem("user"));

if (storedUser) {

    document.getElementById("welcomeUser").textContent =
        `${storedUser.name} 👋`;

}*/

        const summary = dashboard.healthSummary;
        const nextAppointment = dashboard.nextAppointment;
        console.log("Next Appointment:", nextAppointment);
        const recentActivity = dashboard.recentActivity;
        const todayMedicines = dashboard.todayMedicines;
        const todayWater = dashboard.todayWater;
        renderWater(todayWater);
        console.log("Frontend Today Medicines:", todayMedicines);
        renderMedicines(todayMedicines);
// ======================================
// TODAY'S GOAL
// ======================================

const water = dashboard.todayWater || { glasses: 0, goal: 8 };
const waterProgress = Math.min((water.glasses / water.goal) * 25, 25);

const currentSteps =
    parseInt(localStorage.getItem("healora_steps")) || 0;

const stepProgress =
    Math.min((currentSteps / 8000) * 25, 25);

let medicineProgress = 25;

if (todayMedicines && todayMedicines.length > 0) {

    const taken =
        todayMedicines.filter(m => m.status === "taken").length;

    medicineProgress =
        (taken / todayMedicines.length) * 25;
}

const sleepHours =
    parseFloat(localStorage.getItem("healora_sleep")) || 0;

renderSleep(sleepHours);
const sleepProgress =
    Math.min((sleepHours / 8) * 25, 25);

const goalScore = Math.round(
    waterProgress +
    stepProgress +
    medicineProgress +
    sleepProgress
);

document.getElementById("healthScoreValue").textContent =
    `${goalScore}%`;

document.getElementById("healthStatus").textContent =
    goalScore >= 80
        ? "Excellent 🎉"
        : goalScore >= 60
        ? "Great 👍"
        : goalScore >= 40
        ? "Keep Going 💪"
        : "Let's Start 🚀";

const circle = document.getElementById("healthScoreCircle");

circle.style.background = `conic-gradient(
    #14B8A6 0%,
    #14B8A6 ${goalScore}%,
    #E5E7EB ${goalScore}%,
    #E5E7EB 100%
)`;


// Update Percentage
document.getElementById("healthScoreValue").textContent =
    `${goalScore}%`;

document.getElementById("healthStatus").textContent =
    goalScore >= 80
        ? "Excellent 🎉"
        : goalScore >= 60
        ? "Great 👍"
        : goalScore >= 40
        ? "Keep Going 💪"
        : "Let's Start 🚀";


// ===============================
// TODAY'S GOAL DETAILS
// ===============================

// Water
document.getElementById("goalWater").textContent =
    `${water.glasses} / ${water.goal}`;

// Steps
document.getElementById("goalSteps").textContent =
    `${currentSteps.toLocaleString()} / 8000`;

// Medicines
const takenMedicines =
    todayMedicines
        ? todayMedicines.filter(m => m.status === "taken").length
        : 0;

document.getElementById("goalMedicines").textContent =
    `${takenMedicines} / ${todayMedicines ? todayMedicines.length : 0}`;

// Sleep
document.getElementById("goalSleep").textContent =
    `${sleepHours} / 8 hrs`;

        // ===========================
        // RECENT ACTIVITY
        // ===========================

        renderRecentActivity(recentActivity);

        // ===========================
        // TODAY MEDICINES
        // (We'll integrate this next)
        // ===========================

        console.log("Today's Medicines:", todayMedicines);
        renderMedicines(todayMedicines);
        renderRecentActivity(recentActivity);
        renderAppointment(nextAppointment);
        renderNotifications(todayMedicines, nextAppointment);
        renderWeeklyAnalytics(summary.weeklyHealth);

    } catch (err) {

        console.error("Dashboard Error:", err);

    
    }
}

// Refresh dashboard whenever user returns to this tab/page
document.addEventListener("visibilitychange", () => {

    if (!document.hidden) {

        loadDashboard();

    }

});

function renderMedicines(medicines) {
    console.log("renderMedicines() called with:", medicines);

    const container = document.getElementById("medicineList");
    console.log("Medicine Container:", container);
    console.log("Medicines Received:", medicines);


    if (!medicines || medicines.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-pills"></i>
                No medicines scheduled for today.
            </div>
        `;

        return;
    }

    container.innerHTML = medicines.map(medicine => {

        const time = medicine.time || "--";

        const name = medicine.medicineName || medicine.title || "Medicine";

        const note = medicine.instructions || "";

        const taken = medicine.status === "taken";

        return `

        <div class="medicine-item">

            <div class="medicine-time">

                ${time}

            </div>

            <div class="medicine-info">

                <h4>${name}</h4>

                <p>${note}</p>

            </div>

            <div class="status ${taken ? "done" : "pending"}"
     data-id="${medicine.id}"
     data-time="${time}">

    ${
        taken
            ? '<i class="fa-solid fa-check"></i>'
            : '<button class="markTakenBtn">✓ Mark Taken</button>'
    }

</div>

        </div>

        `;

    }).join("");

container.querySelectorAll(".markTakenBtn").forEach(button => {

    button.addEventListener("click", async (e) => {

        e.stopPropagation();

        const reminderId =
    button.parentElement.dataset.id;

const reminderTime =
    button.parentElement.dataset.time;

        console.log("Reminder ID:", reminderId);
console.log("Reminder Time:", button.parentElement.dataset.time);

        try {

            const response = await fetch(
                `${API_BASE_URL}/reminders/${reminderId}/complete`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
    time: reminderTime
})
                }
            );

            const result = await response.json();

            if (result.success) {

    window.location.reload();

} else {

    alert(result.message);

}

        } catch (err) {

            console.error(err);
            alert("Unable to update medicine.");

        }

    });

});
    
    console.log("Medicine HTML:", container.innerHTML);
}

function renderAppointment(appointment) {

    const doctor = document.getElementById("app-doctor-name");
    const specialty = document.getElementById("app-doctor-specialty");
    const date = document.getElementById("app-date");
    const time = document.getElementById("app-time");
    const button = document.getElementById("view-details-btn");

    if (!appointment) {

        doctor.textContent = "No Upcoming Appointment";
        specialty.textContent = "Book your first appointment";
        date.textContent = "--";
        time.textContent = "--";

        button.style.display = "none";

        return;
    }

    doctor.textContent =
        appointment.doctorName || "Doctor";

    specialty.textContent =
        appointment.specialty || "";

    date.textContent =
    appointment.appointmentDate
        ? new Date(appointment.appointmentDate).toLocaleDateString("en-GB")
        : "--";

    time.textContent =
        appointment.appointmentTime || "--";

    button.dataset.id = appointment._id;
    button.style.display = "inline-block";
}
function renderNotifications(medicines, appointment) {

    const container =
        document.getElementById("notificationList");

    let html = "";

    if (appointment) {

        html += `

        <div class="notification-item">

            📅 Appointment with
            ${appointment.doctorName || "Doctor"}

        </div>

        `;

    }

    if (medicines && medicines.length > 0) {

        medicines.forEach(medicine => {

            html += `

            <div class="notification-item">

                💊 ${medicine.medicineName}
                at ${medicine.time}

            </div>

            `;

        });

    }

    if (html === "") {

        html = `

        <div class="empty-state">

            No notifications.

        </div>

        `;

    }

    container.innerHTML = html;

}
    loadDashboard();

  // === HANDLE VIEW DETAILS CLICK ===
  const viewDetailsBtn = document.getElementById('view-details-btn');
  if (viewDetailsBtn) {
    viewDetailsBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const appointmentId = viewDetailsBtn.getAttribute('data-id');
      if (!appointmentId) {
        alert("No appointment details found to display.");
        return;
      }
      
      try {
        const res = await fetch(`${API_BASE_URL}/appointments/${appointmentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const result = await res.json();
          const appointment = result.data.appointment;
          
          // Display the backend appointment details cleanly in a popup
          alert(`
🩺 Appointment Details

------------------------

Doctor: ${appointment.doctorName}
Specialty: ${appointment.specialty}
Date: ${new Date(appointment.appointmentDate).toLocaleDateString("en-GB")}
Time: ${appointment.appointmentTime}
Status: ${appointment.status}
Notes: ${appointment.notes || "No custom notes."}
`);
        } else {
          alert("Failed to retrieve appointment details from server.");
        }
      } catch (error) {
        console.error("Error loading appointment details:", error);
        alert("Could not connect to server. Please try again.");
      }
    });
  }

    }


    /* ======================================
       HEALTH SCORE ANIMATION
    ====================================== */

    /*const score =
        document.querySelector(".value");

    if (score) {

        let count = 0;

        const target = 94;

        const interval = setInterval(() => {

            count++;

            score.textContent = count + "%";

            if (count >= target) {

                clearInterval(interval);

            }

        }, 20);

    }*/


    /* ======================================
       DARK MODE
    ====================================== */

   const darkButton =
        document.querySelector(".fa-moon");

    if (localStorage.getItem("theme") === "dark") {

        document.body.classList.add("dark");

    }

    if (darkButton) {

        darkButton.parentElement.addEventListener("click", () => {

            document.body.classList.toggle("dark");

            localStorage.setItem(
                "theme",
                document.body.classList.contains("dark") ? "dark" : "light"
            );

        });

    }


    /* ======================================
       BUTTON RIPPLE
    ====================================== */

    document.querySelectorAll("button").forEach(btn => {

        btn.addEventListener("click", function (e) {

            const ripple =
                document.createElement("span");

            ripple.classList.add("ripple");

            const size =
                Math.max(this.clientWidth, this.clientHeight);

            ripple.style.width = size + "px";
            ripple.style.height = size + "px";

            ripple.style.left =
                e.offsetX - size / 2 + "px";

            ripple.style.top =
                e.offsetY - size / 2 + "px";

            this.appendChild(ripple);

            setTimeout(() => {

                ripple.remove();

            }, 600);

        });

    });


    /* ======================================
       GLASS CARD HOVER
    ====================================== */

    

});

function renderWater(water) {

    if (!water) return;

    const waterText = document.querySelector(".water-card p");

    if (waterText) {
        waterText.textContent =
            `${water.glasses} / ${water.goal} Glasses`;
    }

    const glasses = document.querySelectorAll(".glass");

    glasses.forEach((glass, index) => {

        if (index < water.glasses) {

            glass.classList.add("active");

        } else {

            glass.classList.remove("active");

        }

    });


localStorage.setItem(
    "healora_water",
    JSON.stringify(water)
);

updateTodayGoal();}

async function addWaterGlass() {

    try {

        const response = await fetch(`${API_BASE_URL}/water/add`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (result.success) {

            renderWater(result.data);

        }

    } catch (err) {

        console.error(err);

    }

}

async function removeWaterGlass() {

    try {

        const response = await fetch(`${API_BASE_URL}/water/remove`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (result.success) {

            renderWater(result.data);

        }

    } catch (err) {

        console.error(err);

    }

}

/* ==========================================
   DASHBOARD AI → CHATBOT
========================================== */

const aiInput = document.getElementById("dashboardAIInput");
const aiButton = document.getElementById("dashboardAISendBtn");

if (aiButton && aiInput) {

    aiButton.addEventListener("click", () => {

        const message = aiInput.value.trim();

        if (!message) {

            alert("Please enter your symptoms.");

            return;

        }

        // Save message for chatbot
        localStorage.setItem("dashboardAIMessage", message);

        // Open chatbot
        window.location.href = "chatbot.html";

    });

}

/* ==========================================
   WATER TRACKER
========================================== */

const glasses = document.querySelectorAll(".glass");

glasses.forEach((glass, index) => {

    glass.addEventListener("click", async () => {

        const activeCount =
            document.querySelectorAll(".glass.active").length;

        if (index + 1 > activeCount) {

            await addWaterGlass();

        } else {

            await removeWaterGlass();

        }

    });

});

/* ==========================================
   MEDICINE CHECKMARK TOGGLE
========================================== */

document.querySelectorAll(".medicine-item .status").forEach((status) => {

    status.addEventListener("click", () => {

        status.classList.toggle("done");
        status.classList.toggle("pending");

        status.innerHTML = status.classList.contains("done")
            ? '<i class="fa-solid fa-check"></i>'
            : "";

    });

});




/* ==========================================
   NOTIFICATION
========================================== */

/*const bell = document.querySelector(".fa-bell");

if (bell) {

    bell.parentElement.addEventListener("click", () => {

        alert("🔔 You have 2 medicine reminders today.");

    });

}*/


/* ==========================================
   SIDEBAR ACTIVE
========================================== */

document.querySelectorAll(".sidebar nav a").forEach(item => {

    item.addEventListener("click", () => {

        document
        .querySelectorAll(".sidebar nav a")
        .forEach(link => link.classList.remove("active"));

        item.classList.add("active");

    });

});


/* ==========================================
   LOGOUT
========================================== */

const logout = document.querySelector(".logout");

if (logout) {

    logout.addEventListener("click", () => {

        if (confirm("Do you want to logout?")) {

            localStorage.removeItem("token");
            localStorage.removeItem("user");

            window.location.href = "login.html";

        }

    });

}


/* ==========================================
   CARD FADE-IN
========================================== */

const cards = document.querySelectorAll(".glass-card,.stat-card");

cards.forEach((card, index) => {

    card.style.opacity = "0";

    card.style.transform = "translateY(40px)";

    setTimeout(() => {

        card.style.transition = ".6s";

        card.style.opacity = "1";

        card.style.transform = "translateY(0)";

    }, index * 120);

});


/* ==========================================
   LIVE CLOCK
========================================== */

const topbar = document.querySelector(".topbar p");

if (topbar) {

    setInterval(() => {

        const now = new Date();

        topbar.innerHTML =
            "Your AI Healthcare Companion • " +
            now.toLocaleTimeString();

    }, 1000);

}


console.log("%c❤️ Healora Dashboard Loaded",
"color:#14B8A6;font-size:18px;font-weight:bold;");


/* ==========================================
   TOP ACTIONS
========================================== */

const notificationBtn = document.getElementById("notificationBtn");
const notificationDropdown = document.getElementById("notificationDropdown");

if (notificationBtn && notificationDropdown) {

    notificationBtn.addEventListener("click", (e) => {

        e.stopPropagation();

        notificationDropdown.classList.toggle("show");

    });

    document.addEventListener("click", (e) => {

        if (
            !notificationDropdown.contains(e.target) &&
            !notificationBtn.contains(e.target)
        ) {

            notificationDropdown.classList.remove("show");

        }

    });

}


/* ==========================================
   DASHBOARD AI QUICK ACTIONS
========================================== */

const dashboardAIInput = document.getElementById("dashboardAIInput");

const quickButtons = document.querySelectorAll(".quick-actions button");

if (dashboardAIInput && quickButtons.length > 0) {

    quickButtons.forEach((button) => {

        button.addEventListener("click", () => {

            const text = button.innerText.trim();

            switch (text) {

                case "🤒 Fever":
                    dashboardAIInput.value = "I have fever.";
                    break;

                case "🤧 Cold":
                    dashboardAIInput.value = "I have cold.";
                    break;

                case "💊 Medicine":
                    dashboardAIInput.value = "Tell me about my medicines.";
                    break;

                case "🩺 Reports":
                    dashboardAIInput.value = "Explain my medical reports.";
                    break;

            }

            dashboardAIInput.focus();

        });

    });

}

/* ==========================================
   PROFILE DROPDOWN
========================================== */

const profileAvatar = document.getElementById("profileAvatar");
const profileDropdown = document.getElementById("profileDropdown");

const dropdownUserName = document.getElementById("dropdownUserName");
const dropdownUserEmail = document.getElementById("dropdownUserEmail");

const profileMenuBtn = document.getElementById("profileMenuBtn");
const settingsMenuBtn = document.getElementById("settingsMenuBtn");
const logoutMenuBtn = document.getElementById("logoutMenuBtn");

if (storedUser) {

    if (dropdownUserName) {

        dropdownUserName.textContent = storedUser.name;

    }

    if (dropdownUserEmail) {

        dropdownUserEmail.textContent = storedUser.email;

    }

}

if (profileAvatar && profileDropdown) {

    profileAvatar.addEventListener("click", (e) => {

        e.stopPropagation();

        profileDropdown.classList.toggle("show");

    });

}

document.addEventListener("click", () => {

    profileDropdown?.classList.remove("show");

});

profileMenuBtn?.addEventListener("click", () => {

    window.location.href = "profile.html";

});

settingsMenuBtn?.addEventListener("click", () => {

    window.location.href = "settings.html";

});

logoutMenuBtn?.addEventListener("click", () => {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "login.html";

});

/* ==========================================
   BMI & CALORIE GOAL (from profile)
========================================== */

async function getVitalsData() {

    try {

        const [profileRes, healthRes] = await Promise.all([

            fetch(`${API_BASE_URL}/auth/me`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }),

            fetch(`${API_BASE_URL}/health/summary`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

        ]);

        const profileResult = await profileRes.json();
        const healthResult = await healthRes.json();

        const user = profileResult.data.user;

        const latestWeight =
            healthResult.data.latestReadings.weight;

        return {

            heightCm: user.height,

            weightKg:
                latestWeight?.weight?.value ?? null,

            dob: user.dateOfBirth,

            gender: user.gender

        };

    }

    catch (err) {

        console.error("Unable to load vitals:", err);

        return null;

    }

}

function calcAge(dob) {
    const birth = new Date(dob);
    const diff = new Date() - birth;
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function bmiToHealthScore(bmi) {
    if (bmi < 18.5) return 65;       // Underweight
    if (bmi < 25)   return 100;      // Normal
    if (bmi < 30)   return 75;       // Overweight
    if (bmi < 35)   return 50;       // Obese I
    return 30;                       // Obese II+
}


getVitalsData().then(data => {
    const bmiEl = document.getElementById("statBMI");
    const bmiCatEl = document.getElementById("statBMICategory");
    const calEl = document.getElementById("statCalories");

    if (!data) {
        if (bmiEl) bmiEl.textContent = "--";
        if (bmiCatEl) bmiCatEl.textContent = "Add height/weight in Profile";
        if (calEl) calEl.textContent = "--";
        return;
    }

    const heightM = data.heightCm / 100;
    const bmi = data.weightKg / (heightM * heightM);

    if (bmiEl) bmiEl.textContent = bmi.toFixed(1);
    if (bmiCatEl) {
        let category = "Normal";
        if (bmi < 18.5) category = "Underweight";
        else if (bmi >= 25 && bmi < 30) category = "Overweight";
        else if (bmi >= 30) category = "Obese";
        bmiCatEl.textContent = category;
    }
    if (bmiCatEl) {
        let category = "Normal";
        if (bmi < 18.5) category = "Underweight";
        else if (bmi >= 25 && bmi < 30) category = "Overweight";
        else if (bmi >= 30) category = "Obese";
        bmiCatEl.textContent = category;
    }

    // Only use the BMI-based estimate if the backend has no real
    // reading-based score yet (i.e., user hasn't logged readings)
    if (backendHealthScore === null) {
        updateHealthScore(bmiToHealthScore(bmi));
    }

    console.log("Vitals Data:", data);
    if (calEl && data.dob && data.gender) {
        const age = calcAge(data.dob);
        let bmr = 10 * data.weightKg + 6.25 * data.heightCm - 5 * age;
        bmr += data.gender.toLowerCase() === "male" ? 5 : -161;
        const tdee = Math.round(bmr * 1.375); // light activity assumption
        calEl.textContent = tdee.toLocaleString() + " kcal";
    } else if (calEl) {
        calEl.textContent = "--";
    }
});

/* ==========================================
   STEPS STEPPER (+ / -)
========================================== */

const STEPS_INCREMENT = 50;
const stepsEl = document.getElementById("statSteps");
const stepsMinusBtn = document.getElementById("stepsMinusBtn");
const stepsPlusBtn = document.getElementById("stepsPlusBtn");

function getSavedSteps() {
    const saved = localStorage.getItem("healora_steps");
    return saved !== null ? parseInt(saved, 10) : 0; // default when nothing saved yet
}

function renderSteps(value) {
    if (stepsEl) stepsEl.textContent = value.toLocaleString();
}

let currentSteps = getSavedSteps();
renderSteps(currentSteps);

if (stepsPlusBtn) {
    stepsPlusBtn.addEventListener("click", () => {
        currentSteps += STEPS_INCREMENT;
        localStorage.setItem("healora_steps", currentSteps);
        renderSteps(currentSteps);
    });
}

if (stepsMinusBtn) {
    stepsMinusBtn.addEventListener("click", () => {
        currentSteps = Math.max(0, currentSteps - STEPS_INCREMENT);
        localStorage.setItem("healora_steps", currentSteps);
        renderSteps(currentSteps);
    });
}

const SLEEP_INCREMENT = 0.5;

const sleepEl =
document.getElementById("statSleep");

const sleepMinusBtn =
document.getElementById("sleepMinusBtn");

const sleepPlusBtn =
document.getElementById("sleepPlusBtn");

function getSavedSleep() {

    const saved =
        localStorage.getItem("healora_sleep");

    return saved
        ? parseFloat(saved)
        : 0;

}

function renderSleep(value) {

    if (sleepEl) {

        sleepEl.textContent =
            value + "h";

    }

}

let currentSleep =
    getSavedSleep();

renderSleep(currentSleep);

sleepPlusBtn?.addEventListener("click", () => {

    currentSleep =
        Math.min(24, currentSleep + SLEEP_INCREMENT);

    localStorage.setItem(
        "healora_sleep",
        currentSleep
    );

    renderSleep(currentSleep);

    updateTodayGoal();

});
sleepMinusBtn?.addEventListener("click", () => {

    currentSleep =
        Math.max(0, currentSleep - SLEEP_INCREMENT);

    localStorage.setItem(
        "healora_sleep",
        currentSleep
    );

    renderSleep(currentSleep);

    updateTodayGoal();

});

const connectDeviceBtn =
document.getElementById("connectDeviceBtn");

connectDeviceBtn?.addEventListener("click", () => {

    alert(
`Wearable integration is coming soon.

Future support includes:

• Apple Health
• Google Fit
• Fitbit
• Garmin

This feature will allow live heart rate monitoring and health synchronization.`
    );

});
function updateTodayGoal() {

    const water =
        JSON.parse(localStorage.getItem("healora_water")) ||
        { glasses: 0, goal: 8 };

    const sleep =
        parseFloat(localStorage.getItem("healora_sleep")) || 0;

    const steps =
        parseInt(localStorage.getItem("healora_steps")) || 0;

    const medicines =
        document.querySelectorAll(".status.done").length;

    const totalMedicines =
        document.querySelectorAll(".medicine-item").length;

    const waterProgress =
        Math.min((water.glasses / water.goal) * 25, 25);

    const stepProgress =
        Math.min((steps / 8000) * 25, 25);

    const sleepProgress =
        Math.min((sleep / 8) * 25, 25);

    const medicineProgress =
        totalMedicines === 0
            ? 25
            : (medicines / totalMedicines) * 25;

    const score = Math.round(
        waterProgress +
        stepProgress +
        sleepProgress +
        medicineProgress
    );

    document.getElementById("healthScoreValue").textContent =
        score + "%";

    document.getElementById("healthStatus").textContent =
        score >= 80
            ? "Excellent 🎉"
            : score >= 60
            ? "Great 👍"
            : score >= 40
            ? "Keep Going 💪"
            : "Let's Start 🚀";

    document.getElementById("goalWater").textContent =
        `${water.glasses} / ${water.goal}`;

    document.getElementById("goalSteps").textContent =
        `${steps.toLocaleString()} / 8000`;

    document.getElementById("goalSleep").textContent =
        `${sleep} / 8 hrs`;

    document.getElementById("goalMedicines").textContent =
        `${medicines} / ${totalMedicines}`;

    const circle =
        document.getElementById("healthScoreCircle");

    if (circle) {

        circle.style.background = `conic-gradient(
            #14B8A6 0%,
            #14B8A6 ${score}%,
            #E5E7EB ${score}%,
            #E5E7EB 100%
        )`;

    }

}

function renderRecentActivity(activities) {

    const activityList = document.getElementById("activityList");

    if (!activityList) return;

    activityList.innerHTML = "";

    if (!activities || activities.length === 0) {

        activityList.innerHTML = `
            <div class="activity">
                <div class="activity-icon">📭</div>

                <div>
                    <h4>No Recent Activity</h4>
                    <p>Your recent actions will appear here.</p>
                </div>
            </div>
        `;

        return;
    }

    activities.forEach(activity => {

        activityList.innerHTML += `

        <div class="activity">

            <div class="activity-icon">
                ${activity.icon}
            </div>

            <div>

                <h4>${activity.title}</h4>

                <p>${activity.time}</p>

            </div>

        </div>

        `;

    });

}

function renderWeeklyAnalytics(weeklyHealth) {

    const container = document.getElementById("weeklyChartBars");

    if (!container) return;

    container.innerHTML = "";

    const hasData =
        weeklyHealth &&
        weeklyHealth.some(item => item.score > 0);

    if (!hasData) {

        container.innerHTML = `
            <div class="empty-state analytics-empty">
                <div style="font-size:40px;">📈</div>
                <h3>No Weekly Progress Yet</h3>
                <p>Start tracking water, medicines and daily goals to see your weekly progress.</p>
            </div>
        `;

        return;
    }

    weeklyHealth.forEach(item => {

        const bar = document.createElement("div");

        bar.className = "bar";

        bar.style.height = `${Math.max(item.score,10)}%`;

        bar.innerHTML = `
            <span class="bar-value">${item.score}%</span>
        `;

        bar.title = `${item.day}: ${item.score}%`;

        container.appendChild(bar);

    });

}