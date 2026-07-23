/* ==========================================
            HEALORA SETTINGS
========================================== */
const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}
document.addEventListener("DOMContentLoaded",()=>{

const darkMode=document.getElementById("darkMode");

const saveBtn=document.querySelector(".save-settings");

const logoutBtns = document.querySelectorAll(".logout-btn");

const deleteBtn=document.querySelector(".delete-btn");

const aiSuggestions = document.getElementById("aiSuggestions");
const aiMemory = document.getElementById("aiMemory");

const cloudBackup = document.getElementById("cloudBackup");

const themeBtn = document.getElementById("themeBtn");
const notificationBtn = document.getElementById("notificationBtn");
const topProfileImage = document.getElementById("topProfileImage");
const themeStatus = document.getElementById("themeStatus");
const themeSubStatus = document.getElementById("themeSubStatus");

const API_BASE_URL = "http://localhost:5000/api";

function updateThemeCard(isDark) {

    themeStatus.textContent = isDark ? "Dark" : "Light";

    themeSubStatus.textContent = isDark ? "Enabled" : "Disabled";

    themeSubStatus.classList.toggle("enabled", isDark);
    themeSubStatus.classList.toggle("disabled", !isDark);

}

async function loadProfile() {

    try {

        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) return;

        const result = await response.json();
        const user = result.data.user;

        const avatarUrl =
            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0B4F6C&color=fff`;

        const savedImage = localStorage.getItem("profileImage");

        topProfileImage.src = savedImage || avatarUrl;

    } catch (err) {

        console.error("Failed to load profile:", err);

    }

}

/* ==========================================
        NOTIFICATION PAGE
========================================== */

if (notificationBtn) {

    notificationBtn.addEventListener("click", () => {

        window.location.href = "notifications.html";

    });

}

/* ==========================================
        PROFILE PAGE
========================================== */

if (topProfileImage) {

    topProfileImage.style.cursor = "pointer";

    topProfileImage.addEventListener("click", () => {

        window.location.href = "profile.html";

    });

}

/* ==========================================
        LOAD SETTINGS
========================================== */

loadSettings();
loadProfile();

function loadSettings() {

    const settings = JSON.parse(
        localStorage.getItem("healoraSettings")
    );

    // Load theme (same as Profile page)
    const isDark =
        settings?.darkMode ??
        (localStorage.getItem("theme") === "dark");

    document.body.classList.toggle("dark-mode", isDark);
    updateThemeCard(isDark);

    if (darkMode) {
        darkMode.checked = isDark;
    }

    const icon = themeBtn?.querySelector("i");
    if (icon) {
        if (isDark) {
            icon.classList.replace("fa-moon", "fa-sun");
        } else {
            icon.classList.replace("fa-sun", "fa-moon");
        }
    }

        if (!settings) {
            saveSettings();
            return;
        }

        aiSuggestions.checked = settings.aiSuggestions ?? false;
        aiMemory.checked = settings.aiMemory ?? false;

        cloudBackup.checked = settings.cloudBackup ?? false;

        updateStatusCards();
}

/* ==========================================
        SAVE SETTINGS
========================================== */

function saveSettings() {

    const data = {

        darkMode: darkMode.checked,

        aiSuggestions: aiSuggestions.checked,
        aiMemory: aiMemory.checked,

        cloudBackup: cloudBackup.checked,

    };

    // Save all settings
    localStorage.setItem(
        "healoraSettings",
        JSON.stringify(data)
    );
    updateStatusCards();
    loadSystemInformation();
    // Keep global theme in sync across the app
    localStorage.setItem(
        "theme",
        darkMode.checked ? "dark" : "light"
    );

    showToast("☁️ Settings Synced");
}
function updateStatusCards() {

    // Theme
    themeStatus.textContent = darkMode.checked ? "Dark" : "Light";
    themeSubStatus.textContent = darkMode.checked ? "Enabled" : "Disabled";

    // Backup
    const backupStatus = document.getElementById("backupStatus");
    const backupSubStatus = document.getElementById("backupSubStatus");
    
    backupStatus.textContent =
        cloudBackup.checked ? "ON" : "OFF";
    
    if (cloudBackup.checked) {
        backupSubStatus.textContent = "Synced";
        backupSubStatus.style.color = "#10B981";
    } else {
        backupSubStatus.textContent = "Not Synced";
        backupSubStatus.style.color = "#EF4444";
    }
    // AI
    const aiCount = [
        aiSuggestions,
        aiMemory
    ].filter(item => item.checked).length;
    
    const aiStatus = document.getElementById("aiModeStatus");
    const aiSubStatus = document.getElementById("aiModeSubStatus");
    
    aiStatus.textContent = aiCount ? "Smart" : "OFF";
    aiSubStatus.textContent = `${aiCount}/2 Enabled`;
    
    aiSubStatus.style.color =
        aiCount === 0 ? "#EF4444" : "#10B981";

}

/* ==========================================
        DARK MODE
========================================== */

if (darkMode) {

    darkMode.addEventListener("change", () => {

        document.body.classList.toggle("dark-mode", darkMode.checked);
        updateThemeCard(darkMode.checked);

        localStorage.setItem(
            "theme",
            darkMode.checked ? "dark" : "light"
        );

        const icon = themeBtn.querySelector("i");

        if (darkMode.checked) {
            icon.classList.replace("fa-moon", "fa-sun");
        } else {
            icon.classList.replace("fa-sun", "fa-moon");
        }

        saveSettings();

    });

}

if (themeBtn) {

    themeBtn.addEventListener("click", () => {

        document.body.classList.toggle("dark-mode");

        const isDark = document.body.classList.contains("dark-mode");

        localStorage.setItem("theme", isDark ? "dark" : "light");

        darkMode.checked = isDark;

        const icon = themeBtn.querySelector("i");
        updateThemeCard(isDark);

        if (isDark) {
            icon.classList.replace("fa-moon", "fa-sun");
        } else {
            icon.classList.replace("fa-sun", "fa-moon");
        }

        saveSettings();

    });

}

saveBtn.addEventListener("click",saveSettings);
/* ==========================================
        AUTO SAVE ON CHANGE
========================================== */

[
    aiSuggestions,
    aiMemory,
    cloudBackup,
].forEach(control => {

    control.addEventListener("change", saveSettings);

});

/* ==========================================
        EXPORT DATA
========================================== */

const exportBtn=document.querySelector(".secondary-btn");

if(exportBtn){

exportBtn.addEventListener("click",()=>{

const data={

profile:JSON.parse(localStorage.getItem("healoraProfile"))||{},

settings:JSON.parse(localStorage.getItem("healoraSettings"))||{},

reminders:localStorage.getItem("healoraReminders")||""

};

const blob=new Blob(

[JSON.stringify(data,null
  ,null,2)],

{type:"application/json"}

);

const link=document.createElement("a");

link.href=URL.createObjectURL(blob);

link.download="Healora_Backup.json";

link.click();

URL.revokeObjectURL(link.href);

showToast("📁 Backup exported successfully");

});

}

/* ==========================================
        LOGOUT
========================================== */

logoutBtns.forEach(btn => {

    btn.addEventListener("click", () => {

        const confirmLogout = confirm(
            "Are you sure you want to logout?"
        );

        if (confirmLogout) {

            showToast("👋 Logging out...");

            setTimeout(() => {

                localStorage.removeItem("token");
                window.location.href = "login.html";

            }, 1200);

        }

    });

});

/* ==========================================
        DELETE ACCOUNT
========================================== */

if(deleteBtn){

deleteBtn.addEventListener("click",()=>{

const confirmDelete=confirm(

"This will permanently delete all local Healora data.\n\nContinue?"

);

if(confirmDelete){

localStorage.clear();

showToast("🗑 Account data deleted");

setTimeout(()=>{

window.location.href="signup.html";

},1500);

}

});

}

/* ==========================================
        TOAST MESSAGE
========================================== */

function showToast(message){

const toast=document.createElement("div");

toast.className="settings-toast";

toast.innerHTML=message;

document.body.appendChild(toast);

setTimeout(()=>{

toast.classList.add("show");

},100);

setTimeout(()=>{

toast.classList.remove("show");

setTimeout(()=>{

toast.remove();

},300);

},2500);

}

/* ==========================================
        INITIAL MESSAGE
========================================== */

showToast("⚙ Settings Loaded");

console.log(

"%c⚙ Healora Settings Loaded",

"color:#14B8A6;font-size:18px;font-weight:bold;"

);

});