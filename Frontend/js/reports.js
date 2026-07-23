/* ==========================================
   HEALORA REPORTS
========================================== */
const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
// ================= Apply Saved Theme =================

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
    document.documentElement.classList.add("dark-mode");
    document.body.classList.add("dark-mode");
}
const API_BASE_URL = "http://localhost:5000/api";
const storedUser = JSON.parse(localStorage.getItem("user"));

const profileImage = document.getElementById("profileImage");

if (profileImage && storedUser) {

    profileImage.src =
        `https://ui-avatars.com/api/?name=${encodeURIComponent(storedUser.name)}&background=0B4F6C&color=fff`;

}

const uploadInput = document.getElementById("uploadInput");
const uploadBox = document.getElementById("uploadBox");
const selectedFile = document.getElementById("selectedFile");

const uploadBtn = document.querySelector(".upload-btn");

if (uploadBtn) {

    uploadBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadInput.click();
});

}

const chooseFileBtn = document.getElementById("chooseFileBtn");

if (chooseFileBtn) {

    chooseFileBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadInput.click();
});

}
uploadBox.addEventListener("click", () => {
    uploadInput.click();
});

uploadBox.addEventListener("dragover", (e) => {

    e.preventDefault();

    uploadBox.classList.add("dragging");

    uploadBox.querySelector("h2").textContent =
    "📂 Drop your report here";

});

uploadBox.addEventListener("dragleave", () => {

    uploadBox.classList.remove("dragging");

    uploadBox.querySelector("h2").textContent =
    "📄 Drag & Drop Medical Report";

});

uploadBox.addEventListener("drop", (e) => {

    e.preventDefault();

    uploadBox.classList.remove("dragging");

    uploadBox.querySelector("h2").textContent =
    "📄 Drag & Drop Medical Report";

    uploadInput.files = e.dataTransfer.files;

    selectedFile.textContent =
    e.dataTransfer.files[0].name;

    uploadInput.dispatchEvent(new Event("change"));

});

const reportsGrid = document.querySelector(".reports-grid");
const timeline = document.getElementById("timeline");

const searchInput = document.querySelector(".search-box input");

const statCards = document.querySelectorAll(".stat-card");

const themeBtn = document.getElementById("themeBtn");

// Sync theme button icon with current theme
if (themeBtn) {
    const icon = themeBtn.querySelector("i");

    const settings =
        JSON.parse(localStorage.getItem("healoraSettings")) || {};

    const isDark =
        settings.darkMode ??
        (localStorage.getItem("theme") === "dark");

    if (icon) {
        if (isDark) {
            icon.classList.replace("fa-moon", "fa-sun");
        } else {
            icon.classList.replace("fa-sun", "fa-moon");
        }
    }
}
/* ==========================================
   REPORT COUNTER
========================================== */

function updateStats(reports) {

    statCards[0].querySelector("h2").textContent = reports.length;

    statCards[1].querySelector("h2").textContent = reports.length;

    statCards[2].querySelector("h2").textContent = "0";

    let totalBytes = 0;

    reports.forEach(report => {
        totalBytes += report.fileSizeBytes || 0;
    });

    let storageMB = (totalBytes / (1024 * 1024)).toFixed(2);

    statCards[3].querySelector("h2").textContent = `${storageMB} MB`;

}
/* ==========================================
   FILE UPLOAD
========================================== */
console.log("UPLOAD EVENT FIRED");
uploadInput.addEventListener("change", async (e) => {

    const file = e.target.files[0];

console.log("File object:", file);

if (!file) {
    console.log("NO FILE FOUND");
    return;
}

console.log("FILE NAME:", file.name);
    console.log(file);

    // No file selected
    if (!file) {
        return;
    }

    console.log("FILE SELECTED:", file.name);

    selectedFile.textContent = file.name;

    // Disable upload button while processing
    chooseFileBtn.innerText = "Uploading...";
    chooseFileBtn.disabled = true;

    const formData = new FormData();

    formData.append("report", file);

    try {

        // ================= UPLOAD REPORT =================

        const response = await fetch(
            `${API_BASE_URL}/reports/upload`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            }
        );

        console.log(
            "UPLOAD RESPONSE STATUS:",
            response.status
        );

        const result = await response.json();

        console.log(
            "UPLOAD RESPONSE:",
            result
        );


        // ================= ERROR RESPONSE =================

        if (!response.ok || !result.success) {

            throw new Error(
                result.message ||
                "Report upload failed."
            );

        }


        // ================= GET UPLOADED REPORT =================

        const uploadedReport =
            result.data?.report;

        if (!uploadedReport) {

            throw new Error(
                "Upload succeeded, but report data was not returned."
            );

        }


        // ================= IMMEDIATE AI RENDER =================
console.log("SUCCESS BLOCK REACHED");
        alert(
`✅ Report uploaded successfully!

🤖 AI analysis has started.

Please wait about 15–20 seconds.

The page will refresh automatically.`
);

selectedFile.textContent = "No file selected";
uploadInput.value = "";

setTimeout(async () => {

    await loadReportsFromBackend();

    window.location.reload();

}, 15000);
selectedFile.textContent = "No file selected";
uploadInput.value = "";


    } catch (err) {

        console.error(
            "Report upload error:",
            err
        );

        alert(
            err.message ||
            "Upload failed."
        );

        selectedFile.textContent =
            "No file selected";

        uploadInput.value = "";

    } finally {

        // Always restore button
        chooseFileBtn.innerText =
            "Choose File";

        chooseFileBtn.disabled =
            false;

    }

});



/* ==========================================
   LIVE SEARCH
========================================== */

searchInput.addEventListener("input", () => {

    const value = searchInput.value.toLowerCase();

    document.querySelectorAll(".report-card").forEach(card => {

        const fileName = card.dataset.name;

        card.style.display =
            fileName.includes(value)
                ? ""
                : "none";

    });

});


/* ==========================================
   FILTER BUTTONS
========================================== */

document.querySelectorAll(".filter-buttons button").forEach(btn => {

    btn.addEventListener("click", () => {

        document
            .querySelectorAll(".filter-buttons button")
            .forEach(b => b.classList.remove("active"));

        btn.classList.add("active");

        const filter =
            btn.innerText.toLowerCase();

        document.querySelectorAll(".report-card").forEach(card => {

            const fileName =
                card.dataset.name;

            if (filter === "all") {

                card.style.display = "";

                return;

            }

            if (fileName.includes(filter)) {

                card.style.display = "";

            } else {

                card.style.display = "none";

            }

        });

    });

});
/* ==========================================
   DELETE REPORT
========================================== */

reportsGrid.addEventListener("click", async (e) => {

    if (!e.target.classList.contains("delete-btn")) return;

    const reportId = e.target.dataset.id;

    if (!confirm("Delete this report?")) return;

    try {

        const response = await fetch(
            `${API_BASE_URL}/reports/${reportId}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const result = await response.json();

        if (result.success) {

            alert("Report deleted successfully!");

            await loadReportsFromBackend();

        } else {

            alert(result.message);

        }

    } catch (err) {

        console.error(err);

        alert("Failed to delete report.");

    }

});


/* ==========================================
   VIEW REPORT
========================================== */

reportsGrid.addEventListener("click", (e) => {

    const button = e.target.closest(".view-btn");

    if (!button) return;

    const file = button.dataset.file;

    if (!file) {
        alert("File not found.");
        return;
    }

    window.open(
        `http://localhost:5000${file}`,
        "_blank"
    );

});





if (themeBtn) {

    themeBtn.addEventListener("click", () => {

        const settings =
            JSON.parse(localStorage.getItem("healoraSettings")) || {};

        const isDark =
            !document.body.classList.contains("dark-mode");

        document.body.classList.toggle("dark-mode", isDark);
        document.documentElement.classList.toggle("dark-mode", isDark);

        settings.darkMode = isDark;

        localStorage.setItem(
            "healoraSettings",
            JSON.stringify(settings)
        );

        localStorage.setItem(
            "theme",
            isDark ? "dark" : "light"
        );

        const icon = themeBtn.querySelector("i");

        if (icon) {
            if (isDark) {
                icon.classList.replace("fa-moon", "fa-sun");
            } else {
                icon.classList.replace("fa-sun", "fa-moon");
            }
        }
    });

}
/* ==========================================
   SAVE REPORTS
========================================== */

/*function saveReports(){

localStorage.setItem(

"healoraReports",

reportsGrid.innerHTML

);

}

function loadReports(){

const saved=

localStorage.getItem("healoraReports");

if(saved){

reportsGrid.innerHTML=saved;

}

}
*/
loadReportsFromBackend();
/* ==========================================
   AI ANALYSIS BUTTON
========================================== */

document.querySelectorAll(".report-card").forEach(card=>{

card.addEventListener("dblclick",()=>{

card.style.opacity=".6";

setTimeout(()=>{

card.style.opacity="1";

alert("🤖 AI analysis completed successfully.");

},1500);

});

});


function renderAIAnalysis(report) {

    if (!report) return;

    // Summary
    const aiSummaryText =
        document.getElementById("aiSummaryText");

    aiSummaryText.textContent =
        report.aiSummary ||
        "No AI summary available.";


    // Urgency Level
    const urgencyBadge =
        document.getElementById("urgencyBadge");

    const urgencyLevel =
        report.urgencyLevel || "low";

    urgencyBadge.textContent = urgencyLevel;

    urgencyBadge.className =
        `priority ${urgencyLevel}`;


    // Urgency Reason
    const urgencyReason =
        document.getElementById("urgencyReason");

    urgencyReason.textContent =
        report.urgencyReason ||
        "No urgency information available.";


    // Key Findings
    const keyFindingsList =
        document.getElementById("keyFindingsList");

    keyFindingsList.innerHTML = "";

    if (
        Array.isArray(report.keyFindings) &&
        report.keyFindings.length > 0
    ) {

        report.keyFindings.forEach(finding => {

            const li =
                document.createElement("li");

            li.textContent = finding;

            keyFindingsList.appendChild(li);

        });

    } else {

        keyFindingsList.innerHTML =
            "<li>No findings available.</li>";

    }


    // Recommendations
    const recommendationList =
        document.getElementById("recommendationList");

    recommendationList.innerHTML = "";

    if (
        Array.isArray(report.recommendations) &&
        report.recommendations.length > 0
    ) {

        report.recommendations.forEach(recommendation => {

            const li =
                document.createElement("li");

            li.textContent = recommendation;

            recommendationList.appendChild(li);

        });

    } else {

        recommendationList.innerHTML =
            "<li>No recommendations available.</li>";

    }
}
async function loadReportsFromBackend() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/reports`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const result = await response.json();

        // Check whether backend request succeeded
        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Failed to load reports."
            );
        }

        // Safely get reports array
        const reports = result.data?.reports || [];

        // Clear existing UI
        reportsGrid.innerHTML = "";
        timeline.innerHTML = "";

        // ================= REPORT CARDS =================

        reports.forEach(report => {

            reportsGrid.innerHTML += `

                <div
                    class="report-card"
                    data-name="${report.originalFileName.toLowerCase()}"
                >

                    <div class="report-header">

                        <div class="report-icon">
                            <i class="fa-solid fa-file-pdf"></i>
                        </div>

                        <div class="report-info">

                            <h3>${report.originalFileName}</h3>

                            <span class="report-date">
                                <i class="fa-solid fa-calendar-days"></i>
                                ${new Date(report.createdAt).toLocaleDateString()}
                            </span>

                        </div>

                    </div>

                    <div class="report-meta">

                        <div>
                            <strong>Size</strong><br>
                            ${((report.fileSizeBytes || 0) / 1024).toFixed(1)} KB
                        </div>

                        <div>
                            <strong>Pages</strong><br>
                            ${report.pageCount || 0}
                        </div>

                        <div>
                            <strong>Priority</strong><br>

                            <span class="priority ${report.urgencyLevel || "low"}">
                                ${report.urgencyLevel || "low"}
                            </span>

                        </div>

                    </div>

                    <div class="report-actions">

                        <button
                            class="view-btn"
                            data-id="${report._id}"
                            data-file="${report.filePath || ""}"
                        >
                            <i class="fa-solid fa-eye"></i>
                            View
                        </button>

                        <button
                            class="delete-btn"
                            data-id="${report._id}"
                        >
                            <i class="fa-solid fa-trash"></i>
                            Delete
                        </button>

                    </div>

                </div>
            `;


            // ================= TIMELINE =================

            timeline.innerHTML += `

                <div class="timeline-item">

                    <div class="dot"></div>

                    <div>

                        <h4>${report.originalFileName}</h4>

                        <p>
                            ${new Date(report.createdAt).toLocaleDateString()}
                        </p>

                    </div>

                </div>
            `;

        });


        // ================= AI ANALYSIS =================

        if (reports.length > 0) {

            // Backend returns newest report first
            renderAIAnalysis(reports[0]);

        }


        // ================= STATS =================

        updateStats(reports);

    } catch (err) {

        console.error(
            "Failed to load reports:",
            err
        );

    }

}


console.log("%c📄 Healora Reports Ready",
"color:#14B8A6;font-size:18px;font-weight:bold;");

const notificationBtn = document.getElementById("notificationBtn");

if (notificationBtn) {

    notificationBtn.addEventListener("click", () => {

        window.location.href = "notifications.html";

    });

}


/* ==========================================
   PROFILE AVATAR
========================================== */

const profileAvatar = document.getElementById("profileAvatar");

if (profileAvatar) {

    profileAvatar.style.cursor = "pointer";

    profileAvatar.addEventListener("click", () => {

        window.location.href = "profile.html";

    });

}
/* ==========================================
   LOGOUT
========================================== */

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.style.cursor = "pointer";

    logoutBtn.addEventListener("click", () => {

        const confirmLogout = confirm("Are you sure you want to logout?");

        if (!confirmLogout) return;

        // Remove login information
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Go to login page
        window.location.href = "login.html";

    });

}
});

console.log("NEW REPORTS.JS LOADED - TEST");