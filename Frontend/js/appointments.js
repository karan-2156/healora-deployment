/* ==========================================
            HEALORA APPOINTMENTS
========================================== */

console.log("appointments.js loaded");

const token = localStorage.getItem("token");
if (!token) {
    window.location.href = "login.html";
}
const storedUser = JSON.parse(localStorage.getItem("user"));
const API_BASE_URL = "http://localhost:5000/api";

document.addEventListener("DOMContentLoaded",()=>{

const profileImage = document.querySelector(".profile-small img");

if (profileImage && storedUser) {

    profileImage.src =
        `https://ui-avatars.com/api/?name=${encodeURIComponent(storedUser.name)}&background=0B4F6C&color=fff`;

    profileImage.style.cursor = "pointer";

    profileImage.addEventListener("click", () => {

    window.location.href = "profile.html";
    });

    const bell = document.querySelector(".fa-bell");

    if (bell) {

        bell.parentElement.addEventListener("click", () => {loadNotifications();

        notificationPanel.classList.toggle("show");



            console.log("Bell clicked");

            alert("🔔 You have upcoming appointments.");

            window.location.href = "notifications.html";

        });

    }

    const moon = document.querySelector(".fa-moon");

    

    loadAppointments();
    

};



const searchInput=document.querySelector(".search-box input");
const filter=document.querySelector(".filter-group select");
const doctorCards=document.querySelectorAll(".doctor-card");
const bookButtons=document.querySelectorAll(".book-now");
console.log("Buttons found:", bookButtons.length);
const cancelButtons=document.querySelectorAll(".cancel-btn");
const rescheduleButtons=document.querySelectorAll(".reschedule-btn");
const moonBtn=document.querySelector(".fa-moon");

/* ================= SEARCH ================= */

if(searchInput){

searchInput.addEventListener("keyup",()=>{

const value=searchInput.value.toLowerCase();

doctorCards.forEach(card=>{

card.style.display=

card.innerText.toLowerCase().includes(value)

?"block":"none";

});

});

}

/* ================= FILTER ================= */

if(filter){

filter.addEventListener("change",()=>{

const value=filter.value.toLowerCase();

doctorCards.forEach(card=>{

if(value==="all specializations"){

card.style.display="block";

return;

}

card.style.display=

card.innerText.toLowerCase().includes(value)

?"block":"none";

});

});

}

/* ================= BOOK ================= */

bookButtons.forEach(btn => {

    btn.addEventListener("click", async () => {

        console.log("Book button clicked");

        const card = btn.closest(".doctor-card");

        const doctorName = card.querySelector("h3").innerText;

        const specialty = card.querySelector(".speciality").innerText.trim();

        const location = card.querySelector(".hospital").innerText.trim();

        const appointmentDate = prompt("Enter appointment date (YYYY-MM-DD)");

        if (!appointmentDate) return;

        const appointmentTime = prompt("Enter appointment time (HH:MM)");

        if (!appointmentTime) return;

        try {

            console.log({
                doctorName,
                specialty,
                location,
                appointmentDate,
                appointmentTime,
                token
            });

            const response = await fetch(`${API_BASE_URL}/appointments`, {

                method: "POST",

                headers: {

                    "Content-Type": "application/json",

                    "Authorization": `Bearer ${token}`

                },

                body: JSON.stringify({

                    doctorName,

                    specialty,

                    appointmentDate,

                    appointmentTime,

                    location

                })

            });

            console.log("Status:", response.status);

            const result = await response.json();

            console.log("Validation Errors:", result.errors);

            if (response.ok) {

            loadAppointments();

            showToast("✅ Appointment booked successfully!");
            addNotification("✅ Appointment booked");



            } else {

                alert(result.message || "Unable to book appointment.");

            }

        } catch (err) {

            console.error(err);

            alert("Server connection failed.");

        }

    });

});

/* ================= CANCEL ================= */

cancelButtons.forEach(btn=>{

btn.addEventListener("click",()=>{

if(confirm("Cancel this appointment?")){

btn.closest(".appointment-card").remove();

showToast("❌ Appointment Cancelled");

}

});

});

/* ================= RESCHEDULE ================= */

rescheduleButtons.forEach(btn=>{

btn.addEventListener("click",()=>{

const date=prompt(

"Enter new date (DD/MM/YYYY)"

);

if(date){

showToast("📅 Rescheduled to "+date);

}

});

});

/* ================= SAVE ================= */

function saveAppointment(name){

let appointments=

JSON.parse(

localStorage.getItem("healoraAppointments")

)||[];

appointments.push({

doctor:name,

date:new Date().toLocaleString()

});

localStorage.setItem(

"healoraAppointments",

JSON.stringify(appointments)

);

}

/* ================= DARK MODE ================= */

if(localStorage.getItem("appointmentDark")==="true"){

document.body.classList.add("dark");

}

if(moonBtn){

moonBtn.parentElement.addEventListener("click",()=>{

document.body.classList.toggle("dark");

localStorage.setItem(

"appointmentDark",

document.body.classList.contains("dark")

);

});

}

/* ================= TOAST ================= */

function showToast(message){

const toast=document.createElement("div");

toast.className="appointment-toast";

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

/* ================= AI BUTTON ================= */

const aiBtn=document.querySelector(".ai-btn");

if(aiBtn){

aiBtn.addEventListener("click",()=>{

showToast("🤖 Finding recommended doctors...");

});

}

/* ================= HERO BUTTON ================= */

const heroBtn=document.querySelector(".book-btn");

if(heroBtn){

heroBtn.addEventListener("click",()=>{

window.scrollTo({

top:700,

behavior:"smooth"

});

});

}

console.log(

"%c📅 Healora Appointment Module Loaded",

"color:#14B8A6;font-size:18px;font-weight:bold;"

);

});


/* ================= LOAD APPOINTMENTS ================= */

async function loadAppointments() {

    try {

        console.log("Loading appointments...");

        const response = await fetch(`${API_BASE_URL}/appointments`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log("GET Status:", response.status);

        const result = await response.json();

        console.log("Appointments Data:", result.data);

        const appointments = result.data.appointments;

        const container = document.getElementById("appointmentsContainer");

        container.innerHTML = "";

        if (!appointments || appointments.length === 0) {

            container.innerHTML = "<p>No appointments booked yet.</p>";

            return;

        }

        appointments.forEach((appointment) => {

            const card = document.createElement("div");

            card.className = "appointment-card";

            const date = new Date(appointment.appointmentDate);

            const day = date.getDate();

            const month = date.toLocaleString("default", {
                month: "short"
            });

            card.innerHTML = `

                <div class="appointment-date">

                    <h2>${day}</h2>

                    <span>${month}</span>

                </div>

                <div class="appointment-details">

                    <h3>${appointment.doctorName}</h3>

                    <p>🩺 ${appointment.specialty}</p>

                    <p>🏥 ${appointment.location}</p>

                    <p>🕒 ${appointment.appointmentTime}</p>

                    <p>📌 Status: ${appointment.status}</p>

                    <div class="appointment-actions">

                        <button class="reschedule-btn">
                            Reschedule
                        </button>

                        <button class="cancel-btn">
                            Cancel
                        </button>

                    </div>

                </div>

            `;

            container.appendChild(card);

            // ================= CANCEL =================

            const cancelBtn = card.querySelector(".cancel-btn");

            cancelBtn.addEventListener("click", async () => {

                if (!confirm("Are you sure you want to cancel this appointment?")) return;

                try {

                    const response = await fetch(
                        `${API_BASE_URL}/appointments/${appointment._id}`,
                        {
                            method: "DELETE",
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    );

                    const text = await response.text();

                    console.log(text);

                    let result = {};

                    try {

                        result = JSON.parse(text);

                    } catch {

                    console.log("Response is not JSON");

                    }

                    console.log("Delete Status:", response.status);

                    if (response.ok) {

                        loadAppointments();

                        alert("✅ Appointment cancelled successfully!");
                        addNotification("❌ Appointment cancelled");

                    } else {

                        alert(result.message || "Unable to cancel appointment.");

                    }

                } catch (err) {

                    console.error("FULL ERROR:", err);

                    alert("Server connection failed.");

                }

            });

            // ================= RESCHEDULE =================

            const rescheduleBtn = card.querySelector(".reschedule-btn");

            rescheduleBtn.addEventListener("click", async () => {

                console.log("Reschedule button clicked");

                const newDate = prompt("Enter new appointment date (YYYY-MM-DD)");

                if (!newDate) return;

                const newTime = prompt("Enter new appointment time (HH:MM)");

                if (!newTime) return;

                try {

                    const response = await fetch(
                        `${API_BASE_URL}/appointments/${appointment._id}`,
                        {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({

                                doctorName: appointment.doctorName,
                                specialty: appointment.specialty,
                                location: appointment.location,

                                appointmentDate: newDate,
                                appointmentTime: newTime,

                                notes: appointment.notes || ""

                            })
                        }
                    );

                    const result = await response.json();

                    console.log("Update Status:", response.status);
                    console.log("Update Response:", result);

                    if (response.ok) {

                        loadAppointments();

                        alert("✅ Appointment rescheduled successfully!");
                        addNotification("✏️ Appointment rescheduled");
                    } else {

                        alert(result.message || "Unable to reschedule appointment.");

                    }

                } catch (err) {

                    console.error(err);

                    alert("Server connection failed.");

                }

            });

        });

    } catch (err) {

        console.error(err);

    }

}

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", () => {

        if (!confirm("Are you sure you want to logout?")) return;

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location.href = "login.html";

    });

}

const notificationBtn = document.getElementById("notificationBtn");

const notificationPanel = document.getElementById("notificationPanel");

notificationBtn.addEventListener("click", () => {

    notificationPanel.classList.toggle("show");

});

function addNotification(message){

    let notifications = JSON.parse(
        localStorage.getItem("notifications")
    ) || [];

    notifications.unshift({

        message,

        time:new Date().toLocaleString()

    });

    localStorage.setItem(
        "notifications",
        JSON.stringify(notifications)
    );

}

function loadNotifications(){

    const list=document.getElementById("notificationList");

    const notifications=JSON.parse(
        localStorage.getItem("notifications")
    ) || [];

    if(notifications.length===0){

        list.innerHTML="<p>No notifications yet.</p>";

        return;

    }

    list.innerHTML=notifications.map(n=>`

        <div class="notification-item">

            <strong>${n.message}</strong>

            <br>

            <small>${n.time}</small>

        </div>

    `).join("");

}