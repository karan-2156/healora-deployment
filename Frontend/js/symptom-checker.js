/* ==========================================
        HEALORA AI SYMPTOM CHECKER
========================================== */
const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}
document.addEventListener("DOMContentLoaded",()=>{

const symptomInput=document.getElementById("symptomInput");
const addBtn=document.querySelector(".add-symptom");
const symptomList=document.getElementById("symptomList");
const analyzeBtn=document.querySelector(".analyze-btn");
const reportBtn=document.querySelector(".report-btn");
const appointmentBtn=document.querySelector(".appointment-btn");

const condition=document.getElementById("condition");
const confidence=document.getElementById("confidence");
const severity=document.getElementById("severity");
const doctor=document.getElementById("doctor");
const remedyList=document.getElementById("remedyList");

const painRange=document.getElementById("painRange");
const painValue=document.getElementById("painValue");

const moonBtn=document.querySelector(".fa-moon");

let symptoms=[];

/* =========================
        PAIN SLIDER
========================= */

painRange.addEventListener("input",()=>{

painValue.innerText=painRange.value+" / 10";

});

/* =========================
      ADD SYMPTOM
========================= */

addBtn.addEventListener("click",()=>{

const value=symptomInput.value.trim();

if(value===""){

showToast("Enter a symptom first.");

return;

}

symptoms.push(value);

renderSymptoms();

symptomInput.value="";

saveSymptoms();

});

/* =========================
     RENDER LIST
========================= */

function renderSymptoms(){

if(symptoms.length===0){

symptomList.innerHTML=

'<div class="empty-state">No symptoms added yet.</div>';

return;

}

symptomList.innerHTML="";

symptoms.forEach((item,index)=>{

const chip=document.createElement("div");

chip.className="symptom-chip";

chip.innerHTML=`

<span>${item}</span>

<button data-index="${index}">

<i class="fa-solid fa-xmark"></i>

</button>

`;

symptomList.appendChild(chip);

});

document.querySelectorAll(".symptom-chip button")

.forEach(btn=>{

btn.addEventListener("click",()=>{

symptoms.splice(btn.dataset.index,1);

renderSymptoms();

saveSymptoms();

});

});

}

/* =========================
      AI ANALYSIS
========================= */

analyzeBtn.addEventListener("click",()=>{

if(symptoms.length===0){

showToast("Please add symptoms.");

return;

}

let result={

condition:"Common Cold",

confidence:"88%",

severity:"Low",

doctor:"General Physician",

remedies:[

"Drink plenty of water",

"Take proper rest",

"Eat nutritious food"

]

};

const text=symptoms.join(" ").toLowerCase();

if(text.includes("fever")){

result.condition="Viral Fever";

result.confidence="93%";

result.severity="Moderate";

result.doctor="General Physician";

result.remedies=[

"Stay hydrated",

"Take rest",

"Monitor body temperature"

];

}

if(text.includes("chest")){

result.condition="Chest Infection";

result.confidence="91%";

result.severity="High";

result.doctor="Pulmonologist";

result.remedies=[

"Seek medical attention",

"Drink warm fluids",

"Avoid smoking"

];

}

if(text.includes("headache")){

result.condition="Migraine";

result.confidence="89%";

result.severity="Moderate";

result.doctor="Neurologist";

result.remedies=[

"Rest in a dark room",

"Stay hydrated",

"Reduce screen time"

];

}

condition.innerText=result.condition;

confidence.innerText=result.confidence;

doctor.innerText=result.doctor;

severity.innerText=result.severity;

severity.className="severity";

severity.classList.add(result.severity.toLowerCase());

remedyList.innerHTML="";

result.remedies.forEach(item=>{

const li=document.createElement("li");

li.innerText=item;

remedyList.appendChild(li);

});

showToast("AI Analysis Completed");

});

/* =========================
       REPORT
========================= */

reportBtn.addEventListener("click",()=>{

const report={

symptoms,

condition:condition.innerText,

confidence:confidence.innerText,

doctor:doctor.innerText,

pain:painRange.value,

date:new Date().toLocaleString()

};

localStorage.setItem(

"healoraLastReport",

JSON.stringify(report)

);

showToast("Report Saved");

});

/* =========================
    APPOINTMENT
========================= */

appointmentBtn.addEventListener("click",()=>{

window.location.href="appointments.html";

});

/* =========================
      LOCAL STORAGE
========================= */

function saveSymptoms(){

localStorage.setItem(

"healoraSymptoms",

JSON.stringify(symptoms)

);

}

const saved=

JSON.parse(

localStorage.getItem("healoraSymptoms")

);

if(saved){

symptoms=saved;

renderSymptoms();

}

/* =========================
      DARK MODE
========================= */

if(localStorage.getItem("symptomDark")==="true"){

document.body.classList.add("dark");

}

if(moonBtn){

moonBtn.parentElement.addEventListener("click",()=>{

document.body.classList.toggle("dark");

localStorage.setItem(

"symptomDark",

document.body.classList.contains("dark")

);

});

}

/* =========================
      TOAST
========================= */

function showToast(msg){

const toast=document.createElement("div");

toast.className="toast";

toast.innerText=msg;

document.body.appendChild(toast);

setTimeout(()=>{

toast.classList.add("show");

},100);

setTimeout(()=>{

toast.classList.remove("show");

setTimeout(()=>toast.remove(),300);

},2500);

}

});