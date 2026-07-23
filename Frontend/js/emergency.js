/* ==========================================
        HEALORA EMERGENCY MODULE
========================================== */
const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}
document.addEventListener("DOMContentLoaded",()=>{

const sosBtn = document.querySelector(".sos-btn");

const themeBtn = document.getElementById("themeBtn");

const profileBtn = document.getElementById("profileBtn");

const notificationBtn = document.getElementById("notificationBtn");
const notificationPopup = document.getElementById("notificationPopup");
const notificationList = document.getElementById("notificationList");

const quickButtons = document.querySelectorAll(".quick-card button");

const hospitalButtons = document.querySelectorAll(".hospital-btn");

/* ==========================
        PROFILE
========================== */

const storedUser = JSON.parse(localStorage.getItem("user"));
if (profileBtn) {

    profileBtn.innerHTML = "";

    const avatar = document.createElement("div");
    avatar.className = "profile-avatar";

    const initials = storedUser?.name
        ? storedUser.name.substring(0, 2).toUpperCase()
        : "U";

    avatar.textContent = initials;

    profileBtn.appendChild(avatar);

    profileBtn.addEventListener("click", () => {
        window.location.href = "profile.html";
    });

}

/* ==========================
      NOTIFICATIONS
========================== */

if(notificationBtn){

    notificationBtn.addEventListener("click",()=>{

    notificationList.innerHTML = `
        <p>🚑 Emergency services are available.</p>
        <p>📍 Share your location for nearby hospitals.</p>
        <p>☎ SOS will call 108 immediately.</p>
    `;

    notificationPopup.classList.toggle("show");

});

}

document.addEventListener("click",(e)=>{

    if(
        !notificationPopup.contains(e.target) &&
        !notificationBtn.contains(e.target)
    ){

        notificationPopup.classList.remove("show");

    }

});





/* ==========================
        SOS BUTTON
========================== */

if(sosBtn){

sosBtn.addEventListener("click",()=>{

showToast("🚨 Emergency SOS Activated!");

setTimeout(()=>{

alert("Emergency alert sent successfully! (Demo)");

},600);

});

}

/* ==========================
      QUICK ACTION BUTTONS
========================== */

quickButtons.forEach(btn=>{

btn.addEventListener("click",()=>{

const text=btn.innerText;

switch(text){

case "Call 108":

window.location.href="tel:108";

break;

case "Call 100":

window.location.href="tel:100";

break;

case "Call 101":

window.location.href="tel:101";

break;

case "Share":

shareLocation();

break;

default:

showToast("Action unavailable.");

}

});

});

/* ==========================
     SHARE LOCATION
========================== */

function shareLocation(){

if(!navigator.geolocation){

showToast("Geolocation not supported.");

return;

}

navigator.geolocation.getCurrentPosition(

(position)=>{

const lat = position.coords.latitude;
const lng = position.coords.longitude;

// Save location
localStorage.setItem("userLatitude", lat);
localStorage.setItem("userLongitude", lng);

showToast("📍 Live location captured!");

console.log("Latitude:", lat);
console.log("Longitude:", lng);

},

()=>{

showToast("Location permission denied.");

}

);

}

/* ==========================
      HOSPITAL BUTTONS
========================== */

hospitalButtons.forEach(btn=>{

btn.addEventListener("click",()=>{

showToast("Opening map...");

setTimeout(()=>{

window.open(

"https://www.google.com/maps",

"_blank"

);

},500);

});

});

/* ==========================
        DARK MODE
========================== */

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {

    document.body.classList.add("dark");

    themeBtn.innerHTML = `<i class="fa-solid fa-sun"></i>`;

}

themeBtn.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {

        localStorage.setItem("theme", "dark");

        themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    } else {

        localStorage.setItem("theme", "light");

        themeBtn.innerHTML = `<i class="fa-solid fa-moon"></i>`;

    }

});

/* ==========================
        TOAST
========================== */

function showToast(message){

const toast=document.createElement("div");

toast.className="toast";

toast.innerText=message;

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

"%c🚑 Healora Emergency Module Loaded",

"color:#DC2626;font-size:18px;font-weight:bold;"

);

});