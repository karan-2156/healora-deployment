/* ==========================================
   HEALORA AI CHATBOT
========================================== */

const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {

    const chatWindow = document.querySelector(".chat-window");
    const input = document.getElementById("messageInput");
    const sendBtn = document.getElementById("sendBtn");
    const API_BASE_URL = "http://localhost:5000/api";
    if(localStorage.getItem("theme")==="dark"){

    document.body.classList.add("dark");

}
    const user = JSON.parse(localStorage.getItem("user"));
    let currentSessionId =
        localStorage.getItem("chatSessionId");
    const settings =
        JSON.parse(localStorage.getItem("healoraSettings")) || {};
if (user) {

    const nameElement = document.getElementById("userName");

    const avatarElement = document.getElementById("userAvatar");

    if (nameElement) {
        nameElement.textContent = user.name;
    }

    if (avatarElement) {
        avatarElement.src =
            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0B4F6C&color=fff`;
    }

}

    function addWelcomeMessage() {

    const welcome = document.createElement("div");

    welcome.className = "message ai";

    welcome.innerHTML = `
        <div class="avatar">🤖</div>

        <div class="bubble">
            Hello 👋 I'm Healora AI.
            Tell me your symptoms and I'll try to help.

            <div class="message-time">

                ${getCurrentTime()}

            </div>
        </div>
    `;

    chatWindow.appendChild(welcome);

}
    /* ======================================
   CURRENT TIME
====================================== */

function getCurrentTime() {
    return new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

function getChatDateLabel(date = new Date()) {

    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString())
        return "Today";

    if (date.toDateString() === yesterday.toDateString())
        return "Yesterday";

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

let lastChatDate = "";

function addDateSeparator() {

    const label = getChatDateLabel();

    if (lastChatDate === label) return;

    lastChatDate = label;

    const separator = document.createElement("div");

    separator.className = "chat-date";

    separator.innerHTML = `<span>${label}</span>`;

    chatWindow.appendChild(separator);

}
    /* ======================================
       SEND MESSAGE
    ====================================== */

    function sendMessage() {

        const message = input.value.trim();

        if (message === "") return;
        if (!settings.aiSuggestions) {

            alert("AI Health Suggestions are disabled.\n\nEnable them in Settings.");
                
            return;

}
        // USER MESSAGE

        addDateSeparator();
        const userMessage = document.createElement("div");

        userMessage.className = "message user";

        userMessage.innerHTML = `
            <div class="bubble">

    ${message}

    <div class="message-time">

        ${getCurrentTime()}

    </div>

</div>
            <div class="avatar user-avatar">
    ${user ? user.name.charAt(0).toUpperCase() : "U"}
</div>
        `;

        chatWindow.appendChild(userMessage);

        input.value = "";

        chatWindow.scrollTo({

    top: chatWindow.scrollHeight,

    behavior: "smooth"

});

        showTyping(message);

    }

    sendBtn.addEventListener("click", sendMessage);

    input.addEventListener("keypress", (e) => {

        if (e.key === "Enter") {

            sendMessage();

        }

    });

    /* ======================================
       TYPING ANIMATION
    ====================================== */

    function showTyping(userText) {

        const typing = document.createElement("div");

        typing.className = "message ai typing-box";

        typing.innerHTML = `

            <div class="avatar">🤖</div>

            <div class="bubble typing">

                <span></span>

                <span></span>

                <span></span>

            </div>

        `;

        chatWindow.appendChild(typing);

        chatWindow.scrollTo({

    top: chatWindow.scrollHeight,

    behavior: "smooth"

});
        sendBtn.disabled = true;
        setTimeout(() => {

            typing.remove();

            botReply(userText);

        }, 1800);

    }

    /* ======================================
       SIMPLE AI RESPONSES
    ====================================== */

    async function botReply(text) {

    try {

        sendBtn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        `;

        if (!settings.aiMemory) {
            currentSessionId = null;
        }
        const requestBody = {
            message: text
        };
        if (settings.aiMemory && currentSessionId) {
            requestBody.sessionId = currentSessionId;
        }
        const response = await fetch(
            `${API_BASE_URL}/symptoms/analyze`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },

                body: JSON.stringify(requestBody)
            }
        );

        const result = await response.json();
        if (
            settings.aiMemory &&
            result.success &&
            result.data.sessionId
        ) {
        
            currentSessionId = result.data.sessionId;
            localStorage.setItem(
                "chatSessionId",
                currentSessionId
);
        }
        console.log(result);

        if (!result.success) {
            sendBtn.innerHTML = `
            <i class="fa-solid fa-paper-plane"></i>
            `;
    
    addDateSeparator();
    const aiMessage = document.createElement("div");

    aiMessage.className = "message ai";

    aiMessage.innerHTML = `
        <div class="avatar">🤖</div>
        <div class="bubble">

    ${result.message}

    <div class="message-time">

        ${getCurrentTime()}

    </div>

</div>
    `;

    chatWindow.appendChild(aiMessage);

    chatWindow.scrollTo({

    top: chatWindow.scrollHeight,

    behavior: "smooth"

});

    sendBtn.disabled = false;
    sendBtn.innerHTML = `
    <i class="fa-solid fa-paper-plane"></i>
`;

    return;
}

        const aiMessage=document.createElement("div");

        aiMessage.className="message ai";

        aiMessage.innerHTML=`

        <div class="avatar">

        🤖

        </div>

        <div class="bubble">

    ${result.data.response}

    <div class="message-time">

        ${getCurrentTime()}

    </div>

</div>
        `;

        chatWindow.appendChild(aiMessage);

        chatWindow.scrollTo({

    top: chatWindow.scrollHeight,

    behavior: "smooth"

});

    // Restore send button
    sendBtn.disabled = false;
    
    sendBtn.innerHTML = `
        <i class="fa-solid fa-paper-plane"></i>
    `;
    

    }

    catch (err) {

    console.error(err);

    const aiMessage = document.createElement("div");

    aiMessage.className = "message ai";

    aiMessage.innerHTML = `
        <div class="avatar">🤖</div>

        <div class="bubble">

        ❌ Unable to connect to Healora AI.

        Please try again later.

        <div class="message-time">

        ${getCurrentTime()}

        </div>

        </div>
    `;

    chatWindow.appendChild(aiMessage);

    chatWindow.scrollTo({

        top: chatWindow.scrollHeight,

        behavior: "smooth"

    });

    sendBtn.disabled = false;

    sendBtn.innerHTML = `
        <i class="fa-solid fa-paper-plane"></i>
    `;

}
}

       

       
/* ==========================================
   SUGGESTION BUTTONS
========================================== */

document.querySelectorAll(".suggestions button").forEach(button => {

    button.addEventListener("click", () => {

        input.value = button.innerText;

        sendMessage();

    });

});


/* ==========================================
   NEW CHAT
========================================== */



const newChat = document.querySelector(".new-chat");

if (newChat) {

    newChat.addEventListener("click", () => {

        if (!confirm("Start a new conversation?")) return;

        // Clear local storage
        localStorage.removeItem("healoraChat");
        localStorage.removeItem("chatSessionId");
        currentSessionId = null;
        chatWindow.innerHTML = "";

        lastChatDate = "";

        addDateSeparator();

        addWelcomeMessage();

        // Clear input
        input.value = "";

        // Scroll to top
        chatWindow.scrollTo({

            top: chatWindow.scrollHeight,

            behavior: "smooth"

});

    });

}
/* ==========================================
   DARK MODE
========================================== */

const moonBtn=document.querySelector(".fa-moon");

if(moonBtn){

    moonBtn.parentElement.addEventListener("click",()=>{

        document.body.classList.toggle("dark");

if(document.body.classList.contains("dark")){

    localStorage.setItem("theme","dark");

}
else{

    localStorage.setItem("theme","light");

}

    });

}


/* ==========================================
   ATTACHMENT BUTTON
========================================== */

const upload = document.getElementById("reportUpload");
const attachBtn = document.getElementById("attachBtn");

if (attachBtn && upload) {

    attachBtn.addEventListener("click", () => {

        upload.click();

    });

}

if (upload) {

    upload.addEventListener("change", async () => {

        const file = upload.files[0];

        if (!file) return;

        // Show selected file in chat
        const fileMessage = document.createElement("div");

        fileMessage.className = "message user";

        addDateSeparator();
        fileMessage.innerHTML = `
            <div class="bubble">

             📄 ${file.name}

            <div class="message-time">

            ${getCurrentTime()}

            </div>

            </div>

            <div class="avatar user-avatar">
                ${user ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
        `;

        chatWindow.appendChild(fileMessage);

        chatWindow.scrollTo({

            top: chatWindow.scrollHeight,

            behavior: "smooth"

        });
        sendBtn.disabled = false;

        sendBtn.innerHTML = `
        <i class="fa-solid fa-paper-plane"></i>
        `;

    });

}
const uploadBox = document.querySelector(".upload-box");

if (uploadBox && upload) {

    uploadBox.addEventListener("click", () => {

        upload.click();

    });

    uploadBox.addEventListener("dragover", (e) => {

        e.preventDefault();

        uploadBox.classList.add("dragging");

    });

    uploadBox.addEventListener("dragleave", () => {

        uploadBox.classList.remove("dragging");

    });

    uploadBox.addEventListener("drop", (e) => {

        e.preventDefault();

        uploadBox.classList.remove("dragging");

        const files = e.dataTransfer.files;

        if (files.length > 0) {

            upload.files = files;

            upload.dispatchEvent(new Event("change"));

        }

    });

}
/* ==========================================
   VOICE INPUT
========================================== */

const micBtn = document.querySelector(".fa-microphone");
const voicePopup = document.getElementById("voicePopup");

if (micBtn) {

    micBtn.parentElement.addEventListener("click", () => {

        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (!SpeechRecognition) {

            alert("Voice recognition is not supported.");

            return;

        }

        const recognition = new SpeechRecognition();

        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        // Show popup
        voicePopup.classList.add("show");

        // Listening animation
        micBtn.classList.add("fa-beat");

        recognition.start();

        // User started speaking
        recognition.onspeechstart = () => {

            voicePopup.querySelector("h3").textContent =
                "Listening...";

            voicePopup.querySelector("p").textContent =
                "We can hear you.";

        };

        // Speech recognized
        recognition.onresult = (event) => {

    const transcript = event.results[0][0].transcript;

    input.value = transcript;

    voicePopup.querySelector("h3").textContent = "Processing...";
    voicePopup.querySelector("p").textContent = "Converting speech to text.";

    setTimeout(() => {
        sendMessage();
    }, 300);

};

        // Recognition finished
        recognition.onend = () => {

            micBtn.classList.remove("fa-beat");

            setTimeout(() => {

                voicePopup.classList.remove("show");

                // Reset popup text
                voicePopup.querySelector("h3").textContent =
                    "Listening...";

                voicePopup.querySelector("p").textContent =
                    "Speak now";

            }, 600);

        };

        recognition.onerror = (event) => {

            micBtn.classList.remove("fa-beat");

            voicePopup.classList.remove("show");

            voicePopup.querySelector("h3").textContent =
                "Listening...";

            voicePopup.querySelector("p").textContent =
                "Speak now";

            alert("Voice recognition failed: " + event.error);

        };

    });

}
/* ==========================================
   EMOJI BUTTON
========================================== */

const emojiBtn=document.querySelector(".input-tools button:nth-child(2)");

if(emojiBtn){

emojiBtn.addEventListener("click",()=>{

input.value+=" 😊";

input.focus();

});

}


/* ==========================================
   SAVE CHAT
========================================== */

function saveChat(){

localStorage.setItem(

"healoraChat",

chatWindow.innerHTML

);

}

function loadChat() {

    const history = localStorage.getItem("healoraChat");

    if (history) {

        chatWindow.innerHTML = history;

    } else {

    lastChatDate = "";

    addDateSeparator();

    addWelcomeMessage();

}

}

loadChat();

const observer = new MutationObserver(() => {

    if (chatWindow.querySelector(".typing-box")) {
        return;
    }

    saveChat();

});

observer.observe(chatWindow,{

childList:true,

subtree:true

});


/* ==========================================
   QUICK TOOLS
========================================== */


document.querySelectorAll(".tool-card").forEach(card => {

    card.addEventListener("click", () => {

        const title = card.querySelector("h3").innerText.trim();

        if (title === "Medicine Reminder") {

           window.location.href = "reminder.html";

        }

        else if (title === "Medical Reports") {

    window.location.href = "reports.html";

}

        else if (title === "Appointments") {

            window.location.href = "appointments.html";

        }

        else if (title === "Health Tracker") {

            window.location.href = "health-tracker.html";

        }
else if (title === "Medicine Reminder") {

    window.location.href = "reminder.html";

}

    });

});

/* ==========================================
   EMERGENCY BUTTON
========================================== */

const emergency = document.querySelector(".emergency-btn");

const emergencyModal =
    document.getElementById("emergencyModal");

const closeEmergency =
    document.getElementById("closeEmergency");

if (emergency) {

    emergency.addEventListener("click", () => {

        emergencyModal.classList.add("show");

    });

}

if (closeEmergency) {

    closeEmergency.addEventListener("click", () => {

        emergencyModal.classList.remove("show");

    });

}

window.addEventListener("click", (e) => {

    if (e.target === emergencyModal) {

        emergencyModal.classList.remove("show");

    }

});


/* ==========================================
   PAGE READY
========================================== */

console.log("%c🤖 Healora AI Ready",
"color:#14B8A6;font-size:18px;font-weight:bold;");
/* ===============================
   NOTIFICATIONS
=============================== */

const notificationBtn =
document.getElementById("notificationBtn");



});

// Sidebar navigation
document.querySelectorAll(".history-card").forEach(card => {

    card.addEventListener("click", () => {

        const text = card.innerText.trim();

        if (text.includes("Medicine Reminder")) {

            window.location.href = "reminder.html";

        }

        else if (text.includes("Blood Report")) {

            window.location.href = "reports.html";

        }

        else if (text.includes("Heart Health")) {

            window.location.href = "health-tracker.html";

        }


    });

});
;