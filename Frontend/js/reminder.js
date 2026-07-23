/* ==========================================
            HEALORA REMINDERS
========================================== */

const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded",()=>{
const API_BASE_URL = "http://localhost:5000/api";


const form=document.getElementById("reminderForm");
const addReminderBtn = document.querySelector(".add-btn");

let editingReminderId = null;
const medicineGrid=document.querySelector(".medicine-grid");
const scheduleList = document.querySelector(".schedule-list");

const searchInput=document.querySelector(".search-box input");

const filterBtns=document.querySelectorAll(".filter-buttons button");

const statCards=document.querySelectorAll(".stat-card");

const moonBtn=document.querySelector(".fa-moon");

/* ==========================================
        UPDATE STATS
========================================== */

function updateStats(){

const cards=document.querySelectorAll(".medicine-card");

if(statCards.length){

statCards[0].querySelector("h2").textContent=cards.length;

}

}


function loadTodaysSchedule(reminders){

    scheduleList.innerHTML = "";
    let hasReminder = false;

    const today = new Date();

    reminders.forEach(reminder=>{

        if(!reminder.isActive) return;

        const start = new Date(reminder.startDate);

        const end = reminder.endDate
            ? new Date(reminder.endDate)
            : null;

        if(start > today) return;

        if(end && end < today) return;

        reminder.times.forEach(time=>{
            const today = new Date().toISOString().split("T")[0];

const alreadyCompleted = reminder.completedLogs?.some(
    log => log.date === today && log.time === time
);

if (alreadyCompleted) return;
            hasReminder = true;

           scheduleList.innerHTML += `

<div class="schedule-item">
 <input
        type="checkbox"
        class="complete-checkbox"
        data-id="${reminder._id}"
        data-time="${time}"
    >

    <div class="schedule-time">
        🕒 ${time}
    </div>

    <div class="schedule-info">

        <h4>💊 ${reminder.medicineName}</h4>

        <p>${reminder.dosage}</p>

        <span>${reminder.frequency.replaceAll("_"," ")}</span>

    </div>

</div>

`;
        });
        

    });
    if (!hasReminder) {

    scheduleList.innerHTML = `
        <p class="empty-schedule">
            🎉 No medicines scheduled for today.
        </p>
    `;

}

}

/* ==========================================
        ADD NEW REMINDER
========================================== */

form.addEventListener("submit", async (e) => {
    

    e.preventDefault();

    const inputs = form.querySelectorAll("input,select,textarea");

    const medicine = inputs[0].value;
    const dosage = inputs[1].value;
    const time = inputs[2].value;
    const repeat = inputs[3].value;
    const notes = inputs[4].value;

    try {

       const url = editingReminderId
    ? `${API_BASE_URL}/reminders/${editingReminderId}`
    : `${API_BASE_URL}/reminders`;

const method = editingReminderId ? "PUT" : "POST";

const response = await fetch(url, {

    method,

            headers: {

                "Content-Type": "application/json",

                Authorization: `Bearer ${token}`

            },

            body: JSON.stringify({

                medicineName: medicine,

                dosage: dosage,

                frequency: repeat,

                times: [time],

                notes: notes

            })

        });

        const result = await response.json();
       

        if (result.success) {
                alert(
        editingReminderId
            ? "Reminder updated successfully!"
            : "Reminder created successfully!"
    );

    form.reset();

    editingReminderId = null;

    const saveButton = form.querySelector(".save-btn");

    saveButton.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        Save Reminder
    `;

    await loadRemindersFromBackend();


        

    }

 } catch (err) {

        console.error(err);

    }

});





/* ==========================================
          SEARCH
========================================== */

searchInput.addEventListener("keyup",()=>{

const value=searchInput.value.toLowerCase();

document.querySelectorAll(".medicine-card").forEach(card=>{

card.style.display=

card.innerText.toLowerCase().includes(value)

?"block":"none";

});

});
/* ==========================================
        TAKEN / SKIP BUTTONS
========================================== */

medicineGrid.addEventListener("click",(e)=>{
    if (e.target.classList.contains("edit-btn")) {
        console.log("Edit button clicked");

    const card = e.target.closest(".medicine-card");
    console.log(card);

    const reminderId = card.dataset.id;
    console.log(reminderId);

    editReminder(reminderId);

}
    
    if (e.target.classList.contains("delete-btn")) {
        

    const card = e.target.closest(".medicine-card");
   



    const reminderId = card.dataset.id;
   

    deleteReminder(reminderId);

}

if(e.target.classList.contains("taken-btn")){

e.target.innerHTML="✔ Completed";

e.target.style.background="#16A34A";

e.target.style.color="white";

showToast("✅ Medicine marked as taken");



}

if(e.target.classList.contains("skip-btn")){

e.target.innerHTML="❌ Skipped";

e.target.style.background="#DC2626";

e.target.style.color="white";

showToast("⚠ Medicine skipped");



}

});
scheduleList.addEventListener("change", (e) => {

    if (!e.target.classList.contains("complete-checkbox")) return;

    completeReminder(
        e.target.dataset.id,
        e.target.dataset.time
    );

});
/* ==========================================
          FILTERS
========================================== */


filterBtns.forEach(btn => {

    btn.addEventListener("click", () => {

        filterBtns.forEach(b => b.classList.remove("active"));

        btn.classList.add("active");

        const filter = btn.innerText.toLowerCase();

        document.querySelectorAll(".medicine-card").forEach(card => {

            if (filter === "all") {

                card.style.display = "block";
                return;

            }

            const time = card.querySelector(".fa-regular.fa-clock")
                .parentElement
                .innerText
                .trim();

            const hour = parseInt(time.split(":")[0]);

            if (
                (filter === "morning" && hour < 12) ||
                (filter === "afternoon" && hour >= 12 && hour < 18) ||
                (filter === "night" && hour >= 18)
            ) {

                card.style.display = "block";

            } else {

                card.style.display = "none";

            }

        });

    });

});

/* ==========================================
          DARK MODE
========================================== */

if(moonBtn){

moonBtn.parentElement.addEventListener("click",()=>{

document.body.classList.toggle("dark");

localStorage.setItem(

"reminderDarkMode",

document.body.classList.contains("dark")

);

});

}

if(localStorage.getItem("reminderDarkMode")==="true"){

document.body.classList.add("dark");

}

/* ==========================================
        ADD NEW REMINDER BUTTON
========================================== */

addReminderBtn.addEventListener("click", () => {

    editingReminderId = null;

    form.reset();

    const saveButton = form.querySelector(".save-btn");

    saveButton.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        Save Reminder
    `;

    form.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    form.querySelector("input").focus();

});

/* ==========================================
        LOCAL STORAGE
========================================== */

/*function saveReminders(){

localStorage.setItem(

"healoraReminders",

medicineGrid.innerHTML

);

}
*/

/*function loadReminders(){

const data=localStorage.getItem(

"healoraReminders"

);

if(data){

medicineGrid.innerHTML=data;

}

}
*/

loadRemindersFromBackend();

updateStats();

/* ==========================================
      BROWSER NOTIFICATION
========================================== */

if("Notification" in window){

Notification.requestPermission();

}

function notifyMedicine(title){

if(Notification.permission==="granted"){

new Notification(title,{

body:"Time to take your medicine 💊",

icon:"https://cdn-icons-png.flaticon.com/512/4320/4320337.png"

});

}

}

/* ==========================================
        TOAST MESSAGE
========================================== */

async function loadRemindersFromBackend(){

    try{

        const response = await fetch(
            `${API_BASE_URL}/reminders`,
            {
                headers:{
                    Authorization:`Bearer ${token}`
                }
            }
        );

        const result = await response.json();

        medicineGrid.innerHTML = "";

    result.data.reminders.forEach(reminder => {

    medicineGrid.innerHTML += `

    <div class="medicine-card" data-id="${reminder._id}">

        <div class="card-top">

            <div class="medicine-icon">

                💊

            </div>

            <span class="badge morning">

                ${reminder.frequency.replaceAll("_"," ")}

            </span>

        </div>

        <h3>${reminder.medicineName}</h3>

        <p>${reminder.notes || reminder.dosage}</p>

        <div class="medicine-details">

            <p>

                <i class="fa-regular fa-clock"></i>

                ${reminder.times[0]}

            </p>

            <p>

                <i class="fa-solid fa-repeat"></i>

                ${reminder.frequency.replaceAll("_"," ")}

            </p>

        </div>

        <div class="card-actions">

            
    <button class="edit-btn">
        ✏️ Edit
    </button>
            <button class="delete-btn">
        🗑 Delete
    </button>

        </div>

    </div>

    `;

});

updateStats();
loadTodaysSchedule(result.data.reminders);

    }

    catch(err){

        console.error(err);

    }

}
async function deleteReminder(id) {
    console.log(API_BASE_URL);
console.log(id);

    try {

        const response = await fetch(

            `${API_BASE_URL}/reminders/${id}`,

            {
                method: "DELETE",

                headers: {
                    Authorization: `Bearer ${token}`
                }
            }

        );

        const result = await response.json();

        if (result.success) {

            showToast("🗑 Reminder deleted");

            await loadRemindersFromBackend();

        }

    } catch (err) {

        console.error(err);

    }

}

async function editReminder(id){
try{

       const response = await fetch(
            `${API_BASE_URL}/reminders/${id}`,
            {
                headers:{
                    Authorization:`Bearer ${token}`
                }
            }
        );

        const result = await response.json();
        if(result.success){

            const reminder = result.data.reminder;

            editingReminderId = id;

            const inputs = form.querySelectorAll("input,select,textarea");

            inputs[0].value = reminder.medicineName;
            inputs[1].value = reminder.dosage;
            inputs[2].value = reminder.times[0];
            inputs[3].value = reminder.frequency;
            inputs[4].value = reminder.notes || "";

            form.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            const saveButton = form.querySelector(".save-btn");

            saveButton.innerHTML = `
                <i class="fa-solid fa-pen"></i>
                Update Reminder
            `;
        }

 } catch(err){

        console.error(err);

    }


    }

async function completeReminder(id, time) {

    try {

        const response = await fetch(
            `${API_BASE_URL}/reminders/${id}/complete`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    time
                })
            }
        );

        const result = await response.json();

        if (result.success) {
            showToast("✅ Medicine marked as completed");
            await loadRemindersFromBackend();
        }

    } catch (err) {
        console.error(err);
    }
}


    
        


function showToast(message){

const toast=document.createElement("div");

toast.className="toast";

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

console.log(

"%c💊 Healora Reminder Loaded",

"color:#14B8A6;font-size:18px;font-weight:bold;"

);

});