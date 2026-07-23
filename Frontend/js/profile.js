document.addEventListener("DOMContentLoaded", async () => {

    const token = localStorage.getItem("token");

    if (!token) {
        window.location.replace("login.html");
        return;
    }
    
    const API_BASE_URL = "http://localhost:5000/api";

    let redirecting = false;

    function redirectToLogin() {
        if (redirecting) return;
    
        redirecting = true;
        localStorage.removeItem("token");
        window.location.replace("login.html");
    }
    const cameraBtn = document.querySelector(".edit-photo");
    const profileUpload = document.getElementById("profileUpload");
    const notificationBtn = document.getElementById("notificationBtn");
    const themeBtn = document.getElementById("themeBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    const editProfileBtn = document.querySelector(".edit-profile-btn");

    const fullName = document.getElementById("fullName");
    const dateOfBirth = document.getElementById("dateOfBirth");
    const gender = document.getElementById("gender");
    const bloodGroup = document.getElementById("bloodGroup");

    // Personal
    const phoneNumber = document.getElementById("phoneNumber");

    // Medical
    const height = document.getElementById("height");
    const weight = document.getElementById("weight");
    const allergies = document.getElementById("allergies");
    const chronicDisease = document.getElementById("chronicDisease");
    const currentMedications = document.getElementById("currentMedications");

    // Emergency
    const contactName = document.getElementById("contactName");
    const relationship = document.getElementById("relationship");
    const contactPhone = document.getElementById("contactPhone");
    const contactEmail = document.getElementById("contactEmail");

    const profileName = document.getElementById("profileName");
    const profileSubtitle = document.getElementById("profileSubtitle");
    const profileImage = document.getElementById("profileImage");
    const topProfileImage = document.getElementById("topProfileImage");
    const email = document.getElementById("email");
    const reportsCount = document.getElementById("reportsCount");
    const appointmentCount = document.getElementById("appointmentCount");
    const medicineCount = document.getElementById("medicineCount");

    let editing = false;
    let emergencyContactId = null;
    const editableFields = [
        // Personal
        fullName,
        phoneNumber,
        dateOfBirth,
        gender,
        bloodGroup,

        // Medical
        height,
        weight,
        allergies,
        chronicDisease,
        currentMedications,

        // Emergency
        contactName,
        relationship,
        contactPhone,
        contactEmail
    ];

    await loadProfile();

    await Promise.all([
        loadReportCount(),
        loadMedicineCount(),
        loadAppointmentCount(),
        loadEmergencyContact(),
        loadHealthScore()
    ]).catch(err => {
        console.error("Initialization failed:", err);
    });

    async function loadProfile() {

        try {

            const response = await fetch(
                `${API_BASE_URL}/auth/me`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.status === 401 || response.status === 403) {
                redirectToLogin();
                return;
            }

            if (!response.ok) {
                throw new Error("Failed to load profile.");
            }
            
            const result = await response.json();

            const user = result.data.user;

            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user.name
            )}&background=0B4F6C&color=fff`;

            profileName.textContent = user.name;
            
            const subtitle = [];

            if (user.gender) {
                subtitle.push(
                    user.gender
                        .replaceAll("_", " ")
                        .replace(/\b\w/g, c => c.toUpperCase())
                );
            }

            if (user.bloodGroup) {
                subtitle.push(user.bloodGroup);
            }

            profileSubtitle.textContent =
                subtitle.length
                    ? subtitle.join(" • ")
                    : "Welcome to Healora";

            const savedImage = localStorage.getItem("profileImage");

            if (savedImage) {
                profileImage.src = savedImage;
                topProfileImage.src = savedImage;
            } else {
                profileImage.src = avatarUrl;
                topProfileImage.src = avatarUrl;
            }

            fullName.value = user.name || "";
            email.value = user.email || "";
            dateOfBirth.value =
                user.dateOfBirth ? user.dateOfBirth.substring(0, 10) : "";
            gender.value = user.gender || "";
            bloodGroup.value = user.bloodGroup || "";
            phoneNumber.value = user.phone || "";
            height.value = user.height || "";

            allergies.value =
                user.allergies?.join(", ") || "";

            chronicDisease.value =
                user.chronicDiseases?.join(", ") || "";

            currentMedications.value =
                user.currentMedications?.join(", ") || "";
            await loadHealthInformation();
            phoneNumber.value = user.phone || "";

            // ================= AI Badge =================

            const settings = JSON.parse(localStorage.getItem("healoraSettings")) || {};

            const aiBadge = document.getElementById("aiBadge");

            if (aiBadge) {
            
                const aiEnabled = settings.aiSuggestions || settings.aiMemory;
            
                if (aiEnabled) {
                    aiBadge.textContent = "🤖 AI Enabled";
                    aiBadge.style.background = "#D1FAE5";
                    aiBadge.style.color = "#065F46";
                } else {
                    aiBadge.textContent = "🤖 AI Disabled";
                    aiBadge.style.background = "#FEE2E2";
                    aiBadge.style.color = "#991B1B";
                }
            
            }

            }

        catch (err) {
            console.error("Failed to load profile:", err);
            alert("Unable to connect to the server.");
        }

    }

async function loadEmergencyContact() {

    try {

        const response = await fetch(`${API_BASE_URL}/emergency`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) return;

        const result = await response.json();

        if (!result.success || result.data.count === 0) return;

        const contacts = result.data.contacts;

        const contact =
            contacts.find(c => c.isPrimary) || contacts[0];
        emergencyContactId = contact._id;

        contactName.value = contact.name || "";
        relationship.value = contact.relationship || "";
        contactPhone.value = contact.phone || "";
        contactEmail.value = contact.email || "";

    } catch (err) {
        console.error(err);
    }

}

async function loadReportCount() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/reports`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        // Token expired or invalid
        if (response.status === 401 || response.status === 403) {
            redirectToLogin();
            return;
        }

        if (!response.ok) {
            return;
        }

        const result = await response.json();

        if (!result.success) {
            console.error(result.message);
            return;
        }

        reportsCount.textContent = result.data.count;

    } catch (err) {

        console.error("Failed to load reports:", err);

    }

}

async function loadMedicineCount() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/reminders?active=true`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (response.status === 401 || response.status === 403) {
            redirectToLogin();
            return;
        }

        if (!response.ok) {
            return;
        }

        const result = await response.json();

        if (!result.success) {
            console.error(result.message);
            return;
        }

        medicineCount.textContent = result.data.count;

    } catch (err) {

        console.error("Failed to load medicine count:", err);

    }

}

async function loadAppointmentCount() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/appointments?upcoming=true`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (response.status === 401 || response.status === 403) {
            redirectToLogin();
            return;
        }

        if (!response.ok) {
            return;
        }

        const result = await response.json();

        if (!result.success) {
            console.error(result.message);
            return;
        }

        appointmentCount.textContent = result.data.count;

    } catch (err) {

        console.error("Failed to load appointments:", err);

    }

}

if (editProfileBtn) {

    editProfileBtn.addEventListener("click", async () => {

        if (!editing) {

            editableFields.forEach(field => {
                field.disabled = false;
            });

            editProfileBtn.innerHTML =
                '<i class="fa-solid fa-floppy-disk"></i> Save Profile';

            editing = true;

        } else {
        
            const saved = await updateProfile();
        
            if (saved) {
            
                editableFields.forEach(field => {
                    field.disabled = true;
                });
            
                editProfileBtn.innerHTML =
                    '<i class="fa-solid fa-pen"></i> Edit Profile';
            
                editing = false;
            }
        
        }

    });

}

async function saveEmergencyContact() {

    const payload = {
        name: contactName.value.trim(),
        relationship: relationship.value.trim(),
        phone: contactPhone.value.trim(),
        email: contactEmail.value.trim() || null
    };

    try {

        let response;

        if (emergencyContactId) {

            response = await fetch(
                `${API_BASE_URL}/emergency/${emergencyContactId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                }
            );

        } else {

            payload.isPrimary = true;

            response = await fetch(
                `${API_BASE_URL}/emergency`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                }
            );

        }

        if (!response.ok) {
            throw new Error("Failed to save emergency contact.");
        }

        await loadEmergencyContact();

        return true;

    } catch (err) {

        console.error(err);
        alert("Failed to save emergency contact.");

        return false;

    }

}

async function saveWeight() {

    const weightValue = parseFloat(weight.value);

    if (isNaN(weightValue)) {
        return true;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/health/readings`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: "weight",
                    weight: {
                        value: weightValue,
                        unit: "kg"
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error("Failed to save weight.");
        }

        return true;

    } catch (err) {

        console.error(err);
        alert("Failed to save weight.");

        return false;
    }

}

async function updateProfile() {

    try {

        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                        
                name: fullName.value.trim(),
                        
                phone: phoneNumber.value.trim(),
                        
                height: height.value
                    ? Number(height.value)
                    : null,
                        
                dateOfBirth: dateOfBirth.value || null,
                        
                gender: gender.value || null,
                        
                bloodGroup: bloodGroup.value || null,
                        
                allergies: allergies.value
                    .split(",")
                    .map(item => item.trim())
                    .filter(Boolean),
                        
                chronicDiseases: chronicDisease.value
                    .split(",")
                    .map(item => item.trim())
                    .filter(Boolean),
                        
                currentMedications: currentMedications.value
                    .split(",")
                    .map(item => item.trim())
                    .filter(Boolean)
                        
            })
        });

        if (response.status === 401 || response.status === 403) {
            redirectToLogin();
            return false;
        }

        const result = await response.json();

        if (!response.ok || !result.success) {
            alert(result.message || "Failed to update profile.");
            return false;
        }
            
        const emergencySaved = await saveEmergencyContact();
            
        if (!emergencySaved) {
            return false;
        }
        const weightSaved = await saveWeight();

        if (!weightSaved) {
            return false;
        }

        alert("✅ Profile updated successfully!");
        
        await loadProfile();
        await loadEmergencyContact();
        
        return true;

    } catch (err) {

        console.error(err);
        alert("Failed to update profile.");

        return false;
    }

}


if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
}

if (notificationBtn) {
    notificationBtn.addEventListener("click", () => {
        window.location.href = "notifications.html";
    });
}

// Load saved theme
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
    document.documentElement.classList.add("dark-mode");
    document.body.classList.add("dark-mode");

    themeBtn?.querySelector("i")?.classList.replace("fa-moon", "fa-sun");
}

if (themeBtn) {

    themeBtn.addEventListener("click", () => {

        const isDark =
            !document.documentElement.classList.contains("dark-mode");

        document.documentElement.classList.toggle("dark-mode", isDark);
        document.body.classList.toggle("dark-mode", isDark);

        // Global theme
        localStorage.setItem(
            "theme",
            isDark ? "dark" : "light"
        );

        // Keep Settings page in sync
        const settings =
            JSON.parse(localStorage.getItem("healoraSettings")) || {};

        settings.darkMode = isDark;

        localStorage.setItem(
            "healoraSettings",
            JSON.stringify(settings)
        );

        const icon = themeBtn.querySelector("i");

        if (isDark) {
            icon.classList.replace("fa-moon", "fa-sun");
        } else {
            icon.classList.replace("fa-sun", "fa-moon");
        }

    });

}

async function loadHealthInformation() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/health/summary`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) return;

        const result = await response.json();

        const latestWeight =
            result.data.latestReadings.weight;

        if (
            latestWeight &&
            latestWeight.weight
        ) {

            weight.value = latestWeight.weight.value;

        } else {

            weight.value = "";

        }

        height.value = user.height || "";

    } catch (err) {

        console.error("Failed to load health information:", err);

    }

}

// ================= PROFILE IMAGE =================

if (cameraBtn && profileUpload) {

    // Load saved profile picture
    const savedImage = localStorage.getItem("profileImage");

    if (savedImage) {
        profileImage.src = savedImage;
        topProfileImage.src = savedImage;
    }

    // Open file picker
    cameraBtn.addEventListener("click", () => {
        profileUpload.click();
    });

    // Change profile picture
    profileUpload.addEventListener("change", (e) => {

        const file = e.target.files[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select an image.");
            return;
        }

        const reader = new FileReader();

        reader.onload = function () {

            profileImage.src = reader.result;
            topProfileImage.src = reader.result;

            localStorage.setItem("profileImage", reader.result);

        };

        reader.readAsDataURL(file);

    });

}
async function loadHealthScore() {

    try {

        const water =
            JSON.parse(localStorage.getItem("healora_water")) ||
            { glasses: 0, goal: 8 };

        const sleep =
            parseFloat(localStorage.getItem("healora_sleep")) || 0;

        const steps =
            parseInt(localStorage.getItem("healora_steps")) || 0;

        const response = await fetch(
            `${API_BASE_URL}/reminders?active=true`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        let medicines = 0;
        let totalMedicines = 0;

        if (response.ok) {

            const result = await response.json();

            if (result.success) {

                totalMedicines = result.data.reminders.length;

                medicines = result.data.reminders.filter(
                    m => m.status === "taken"
                ).length;

            }

        }

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

        document.getElementById("healthScore").textContent =
            score + "%";

        document.getElementById("healthScoreStatus").textContent =
            score >= 80
                ? "Excellent 🎉"
                : score >= 60
                ? "Great 👍"
                : score >= 40
                ? "Keep Going 💪"
                : "Let's Start 🚀";

    } catch (err) {

        console.error(err);

    }

}
async function logout() {

    try {

        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            }

        });

        if (!response.ok) {
            console.warn("Server logout failed.");
        }
    } catch (err) {

        console.error("Logout request failed:", err);

    }

    // Always clear local session
    redirectToLogin();

}

});