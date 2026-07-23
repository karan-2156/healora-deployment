/* ==========================================
   HEALORA AUTHENTICATION
   auth.js
========================================== */
const API_BASE_URL = "http://localhost:5000/api";

const token = localStorage.getItem("token");

if (
    token &&
    window.location.pathname.includes("login.html")
) {
    window.location.href = "dashboard.html";
}
document.addEventListener("DOMContentLoaded", () => {

    /* ===========================
       PASSWORD TOGGLE
    =========================== */

    const passwordField = document.getElementById("loginPassword");
    const togglePassword = document.getElementById("showPassword");

    if (passwordField && togglePassword) {

        togglePassword.addEventListener("click", () => {

            if (passwordField.type === "password") {

                passwordField.type = "text";
                togglePassword.textContent = "🙈";

            } else {

                passwordField.type = "password";
                togglePassword.textContent = "👁";

            }

        });

    }

/* ===========================
   GOOGLE LOGIN
=========================== */

async function handleGoogleResponse(response) {

    console.log("Google Credential Received");
    console.log(response);

    try {

        const res = await fetch(`${API_BASE_URL}/auth/google`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                idToken: response.credential
            })

        });

        const result = await res.json();

        console.log("Backend Response:", result);

        if (!res.ok) {

            showMessage(result.message || "Google Login Failed", "error");
            return;

        }

        localStorage.setItem("token", result.data.token);

        localStorage.setItem(
            "user",
            JSON.stringify(result.data.user)
        );

        showMessage("Google Login Successful!", "success");

        setTimeout(() => {

            window.location.href = "dashboard.html";

        }, 500);

    } catch (err) {

        console.error(err);

        showMessage("Unable to connect to backend.", "error");

    }

}

// Inside DOMContentLoaded

if (typeof google === "undefined") {

    console.error("Google SDK not loaded.");
    return;

}

google.accounts.id.initialize({

    client_id: "105173876303-eetfe46f0pmudduvm3o8b5hf3fsgmral.apps.googleusercontent.com",

    callback: handleGoogleResponse

});

const button = document.getElementById("googleButton");

if (button) {

    google.accounts.id.renderButton(button, {

        theme: "outline",
        size: "large",
        shape: "pill",
        width: 320,
        text: "continue_with"

    });

}

});

/* ===========================
   EMAIL VALIDATION
=========================== */

function validateEmail(email) {

    const regex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return regex.test(email);

}


/* ===========================
   TOAST MESSAGE
=========================== */

function showMessage(message, type) {

    const oldToast = document.querySelector(".toast");

    if (oldToast) {

        oldToast.remove();

    }

    const toast = document.createElement("div");

    toast.className = `toast ${type}`;

    toast.innerHTML = message;

    document.body.appendChild(toast);

    setTimeout(() => {

        toast.classList.add("show");

    }, 100);

    setTimeout(() => {

        toast.classList.remove("show");

        setTimeout(() => {

            toast.remove();

        }, 400);

    }, 3000);

}


/* ===========================
   RIPPLE EFFECT
=========================== */

document.querySelectorAll(".auth-btn, .google-btn").forEach(button => {

    button.addEventListener("click", function (e) {

        const circle = document.createElement("span");

        const diameter = Math.max(this.clientWidth, this.clientHeight);

        const radius = diameter / 2;

        circle.style.width = circle.style.height = diameter + "px";

        circle.style.left =
            e.clientX -
            this.getBoundingClientRect().left -
            radius + "px";

        circle.style.top =
            e.clientY -
            this.getBoundingClientRect().top -
            radius + "px";

        circle.classList.add("ripple");

        const ripple = this.querySelector(".ripple");

        if (ripple) {

            ripple.remove();

        }

        this.appendChild(circle);

    });

});


/* ===========================
   FLOATING BLOBS
=========================== */

const blobs = document.querySelectorAll(".blob");

document.addEventListener("mousemove", (e) => {

    blobs.forEach((blob, index) => {

        const speed = (index + 1) * 0.02;

        const x = (window.innerWidth / 2 - e.clientX) * speed;

        const y = (window.innerHeight / 2 - e.clientY) * speed;

        blob.style.transform =
            `translate(${x}px, ${y}px)`;

    });

});


/* ===========================
   PAGE TITLE
=========================== */

document.addEventListener("visibilitychange", () => {

    if (document.hidden) {

        document.title = "❤️ Come back to Healora";

    } else {

        document.title = "Healora | Login";

    }

});


function updateRule(element, valid){

    if(valid){

        element.innerHTML =
        "✅ " + element.textContent.substring(2);

        element.classList.add("valid");

    }

    else{

        element.innerHTML =
        "❌ " + element.textContent.substring(2);

        element.classList.remove("valid");

    }

}


console.log("%c❤️ Healora Authentication Loaded",
"color:#14B8A6;font-size:18px;font-weight:bold;");



/* ==========================================
   LOGIN
========================================== */

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email = document
            .getElementById("loginEmail")
            .value
            .trim();

        const password = document
            .getElementById("loginPassword")
            .value;

        if (!validateEmail(email)) {

            showMessage(
                "Please enter a valid email.",
                "error"
            );

            return;

        }

        const button =
            loginForm.querySelector(".auth-btn");

        button.classList.add("loading");

        try {

            const response = await fetch(
                `${API_BASE_URL}/auth/login`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        email,
                        password
                    })

                }
            );

            const result = await response.json();

            button.classList.remove("loading");

            if (!response.ok) {

                showMessage(
                    result.message || "Login failed.",
                    "error"
                );

                return;

            }

            localStorage.setItem(
                "token",
                result.data.token
            );

            localStorage.setItem(
                "user",
                JSON.stringify(result.data.user)
            );

            showMessage(
                "Login successful!",
                "success"
            );

            setTimeout(() => {

                window.location.href =
                    "../pages/dashboard.html";

            }, 700);

        }

        catch (error) {

            button.classList.remove("loading");

            console.error(error);

            showMessage(
                "Unable to connect to backend.",
                "error"
            );

        }

    });

}
/* ==========================================
   SIGNUP
========================================== */

const signupForm = document.getElementById("signupForm");

if (signupForm) {

    const toggleSignupPassword =
        document.getElementById("toggleSignupPassword");

    const signupPassword =
        document.getElementById("signupPassword");

    const passwordFeedback =
        document.querySelector(".password-feedback");

    signupPassword.addEventListener("focus", () => {

        passwordFeedback.classList.add("active");

    });

    signupPassword.addEventListener("blur", () => {

    setTimeout(() => {

        const password = signupPassword.value;

        let score = 0;

        if(password.length >= 8) score++;
        if(/[A-Z]/.test(password)) score++;
        if(/[a-z]/.test(password)) score++;
        if(/[0-9]/.test(password)) score++;
        if(/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

        if(score < 5){

            passwordFeedback.classList.remove("active");

        }

    },150);

});



    const strengthFill =
        document.getElementById("strengthFill");

    const strengthText =
        document.getElementById("strengthText");

    console.log(strengthFill);
    console.log(strengthText);

    const ruleLength = document.getElementById("ruleLength");

    const ruleUpper = document.getElementById("ruleUpper");

    const ruleLower = document.getElementById("ruleLower");

    const ruleNumber = document.getElementById("ruleNumber");

    const ruleSpecial = document.getElementById("ruleSpecial");

    const confirmPassword =
        document.getElementById("confirmPassword");

    const confirmMessage =
        document.getElementById("confirmMessage");

    if (toggleSignupPassword && signupPassword) {

        toggleSignupPassword.addEventListener("click", () => {

            if (signupPassword.type === "password") {

                signupPassword.type = "text";
                toggleSignupPassword.textContent = "🙈";

            } else {

                signupPassword.type = "password";
                toggleSignupPassword.textContent = "👁";

            }

        });

    }

    if (signupPassword && strengthFill && strengthText) {

    signupPassword.addEventListener("input", () => {

    const password = signupPassword.value;

    updateRule(
    ruleLength,
    password.length >= 8
);

updateRule(
    ruleUpper,
    /[A-Z]/.test(password)
);

updateRule(
    ruleLower,
    /[a-z]/.test(password)
);

updateRule(
    ruleNumber,
    /[0-9]/.test(password)
);

updateRule(
    ruleSpecial,
    /[!@#$%^&*(),.?":{}|<>]/.test(password)
);

    let score = 0;

    if(password.length >= 8) score++;

    if(/[A-Z]/.test(password)) score++;

    if(/[a-z]/.test(password)) score++;

    if(/[0-9]/.test(password)) score++;

    if(/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    if(score <= 2){

        strengthFill.style.width = "30%";
        strengthFill.style.background = "#EF4444";
        strengthText.innerHTML =
        "<span style='color:#EF4444'>Weak</span>";

    }

    else if(score <= 4){

        strengthFill.style.width = "70%";
        strengthFill.style.background = "#F59E0B";
        strengthText.innerHTML =
        "<span style='color:#F59E0B'>Medium</span>";

    }

    else{

        strengthFill.style.width = "100%";
        strengthFill.style.background = "#10B981";
        strengthText.innerHTML =
        "<span style='color:#10B981'>Strong</span>";

    }


    if(score === 5){

    passwordFeedback.classList.add("completed");

    }else{

    passwordFeedback.classList.remove("completed");
    passwordFeedback.classList.add("active");

}

    if(confirmPassword.value.length > 0){

    if(confirmPassword.value === signupPassword.value){

        confirmMessage.textContent = "✅ Passwords match";

        confirmMessage.className = "confirm-message success";

    }

    else{

        confirmMessage.textContent = "❌ Passwords do not match";

        confirmMessage.className = "confirm-message error";

    }

}

});

    confirmPassword.addEventListener("input", () => {

    if(confirmPassword.value.length === 0){

        confirmMessage.textContent = "";

        confirmMessage.className = "confirm-message";

        return;

    }

    if(confirmPassword.value === signupPassword.value){

        confirmMessage.textContent = "✅ Passwords match";

        confirmMessage.className = "confirm-message success";

    }

    else{

        confirmMessage.textContent = "❌ Passwords do not match";

        confirmMessage.className = "confirm-message error";

    }

});
    }

    signupForm.addEventListener("submit", async function (e) {

    if(signupPassword.value !== confirmPassword.value){

        e.preventDefault();

        showToast("Passwords do not match.", "error");

        return;

    }
        e.preventDefault();

        const name =
            document.getElementById("signupName").value.trim();

        const email =
            document.getElementById("signupEmail").value.trim();

        const password =
            document.getElementById("signupPassword").value;

        const confirm =
            document.getElementById("confirmPassword").value;

        if (name.length < 3) {

            showMessage("Please enter your full name.", "error");
            return;

        }

        if (!validateEmail(email)) {

            showMessage("Please enter a valid email.", "error");
            return;

        }

        if (password.length < 8) {

            showMessage("Password must contain at least 8 characters.", "error");
            return;

        }

        if (password !== confirm) {

            showMessage("Passwords do not match.", "error");
            return;

        }

        const button = this.querySelector(".auth-btn");

        button.classList.add("loading");

try {

    const response = await fetch(`${API_BASE_URL}/auth/register`, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            name,
            email,
            password
        })

    });

    const result = await response.json();

    button.classList.remove("loading");

    if (!response.ok) {

        showMessage(result.message || "Registration failed.", "error");
        return;

    }

    showMessage("Account created successfully!", "success");

    setTimeout(() => {

        window.location.href = "login.html";

    }, 1200);

} catch (error) {

    button.classList.remove("loading");

    console.error(error);

    showMessage("Unable to connect to backend.", "error");

}

    });

}

// =======================================================
// Forgot Password
// =======================================================

const forgotPasswordForm =
    document.getElementById("forgotPasswordForm");

if (forgotPasswordForm) {

    forgotPasswordForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email =
            document.getElementById("forgotEmail").value.trim();

        const button =
            forgotPasswordForm.querySelector(".auth-btn");

        button.classList.add("loading");

        try {

            const response = await fetch(

                `${API_BASE_URL}/auth/forgot-password`,

                {

                    method: "POST",

                    headers: {

                        "Content-Type": "application/json"

                    },

                    body: JSON.stringify({

                        email

                    })

                }

            );

            const result = await response.json();

            button.classList.remove("loading");

            if (!response.ok) {

                showMessage(

                    result.message || "Unable to send OTP.",

                    "error"

                );

                return;

            }

            showMessage(

                "OTP sent successfully.",

                "success"

            );

            sessionStorage.setItem(

                "resetEmail",

                email

            );

            setTimeout(() => {

                window.location.href =

                    "verify-otp.html";

            }, 1200);

        }

        catch (error) {

            button.classList.remove("loading");

            console.error(error);

            showMessage(

                "Unable to connect to backend.",

                "error"

            );

        }

    });

}

// =======================================================
// Verify OTP
// =======================================================

const verifyOtpForm = document.getElementById("verifyOtpForm");

if (verifyOtpForm) {

    const email = sessionStorage.getItem("resetEmail");

    if (!email) {

        window.location.href = "forgot-password.html";

    }

    const timerElement = document.getElementById("timer");

    const resendButton = document.getElementById("resendOtp");

    let seconds = 60;

    const countdown = setInterval(() => {

        seconds--;

        if (timerElement) {

            timerElement.innerText = seconds;

        }

        if (seconds <= 0) {

            clearInterval(countdown);

            resendButton.disabled = false;

            document.getElementById("otpTimer").innerHTML =
                "Didn't receive the OTP?";

        }

    }, 1000);

    verifyOtpForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const otp = document.getElementById("otp").value.trim();

        const button = verifyOtpForm.querySelector(".auth-btn");

        button.classList.add("loading");

        try {

            const response = await fetch(

                `${API_BASE_URL}/auth/verify-otp`,

                {

                    method: "POST",

                    headers: {

                        "Content-Type": "application/json"

                    },

                    body: JSON.stringify({

                        email,

                        otp

                    })

                }

            );

            const result = await response.json();

            button.classList.remove("loading");

            if (!response.ok) {

                showMessage(

                    result.message,

                    "error"

                );

                return;

            }

            showMessage(

                "OTP verified successfully.",

                "success"

            );

            sessionStorage.setItem(

                "verifiedOTP",

                otp

            );

            setTimeout(() => {

                window.location.href =
                    "reset-password.html";

            }, 1200);

        }

        catch (error) {

            button.classList.remove("loading");

            showMessage(

                "Unable to connect to backend.",

                "error"

            );

        }

    });

    resendButton.addEventListener("click", async () => {

        resendButton.disabled = true;

        seconds = 60;

        document.getElementById("otpTimer").innerHTML =
            `Resend OTP in <span id="timer">60</span> seconds`;

        try {

            await fetch(

                `${API_BASE_URL}/auth/forgot-password`,

                {

                    method: "POST",

                    headers: {

                        "Content-Type": "application/json"

                    },

                    body: JSON.stringify({

                        email

                    })

                }

            );

            showMessage(

                "OTP sent again.",

                "success"

            );

        }

        catch {

            showMessage(

                "Unable to resend OTP.",

                "error"

            );

        }

    });

}

// =======================================================
// Reset Password
// =======================================================

const resetPasswordForm = document.getElementById("resetPasswordForm");

if (resetPasswordForm) {

    const email = sessionStorage.getItem("resetEmail");
    const otp = sessionStorage.getItem("verifiedOTP");

    if (!email || !otp) {

        window.location.href = "forgot-password.html";

    }

    const newPassword =
        document.getElementById("newPassword");

    const confirmPassword =
        document.getElementById("confirmNewPassword");

    const passwordFeedback =
        document.querySelector(".password-feedback");

    const passwordStrength =
        document.querySelector(".password-strength");

    const strengthFill =
        document.getElementById("strengthFill");

    const strengthText =
        document.getElementById("strengthText");

    const lengthRule =
        document.getElementById("lengthRule");

    const upperRule =
        document.getElementById("upperRule");

    const lowerRule =
        document.getElementById("lowerRule");

    const numberRule =
        document.getElementById("numberRule");

    const specialRule =
        document.getElementById("specialRule");

    const passwordMatch =
        document.getElementById("passwordMatch");

    const togglePassword =
        document.getElementById("toggleResetPassword");

    // -------------------------
    // Show / Hide Password
    // -------------------------

    if (togglePassword) {

        togglePassword.addEventListener("click", () => {

            const isHidden = newPassword.type === "password";

            newPassword.type = isHidden ? "text" : "password";
            confirmPassword.type = isHidden ? "text" : "password";

            togglePassword.textContent =
                isHidden ? "🙈" : "👁";

        });

    }

    // -------------------------
    // Show password rules
    // -------------------------

    newPassword.addEventListener("focus", () => {

        if (passwordFeedback)
            passwordFeedback.classList.add("active");

        if (passwordStrength)
            passwordStrength.classList.add("active");

    });

    newPassword.addEventListener("blur", () => {

        if (newPassword.value === "") {

            if (passwordFeedback)
                passwordFeedback.classList.remove("active");

            if (passwordStrength)
                passwordStrength.classList.remove("active");

        }

    });

    // -------------------------
    // Password Strength
    // -------------------------

    newPassword.addEventListener("input", () => {

        const password = newPassword.value;

        const hasLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        lengthRule.innerHTML =
            hasLength ? "✅ Minimum 8 characters" : "❌ Minimum 8 characters";

        upperRule.innerHTML =
            hasUpper ? "✅ One uppercase letter" : "❌ One uppercase letter";

        lowerRule.innerHTML =
            hasLower ? "✅ One lowercase letter" : "❌ One lowercase letter";

        numberRule.innerHTML =
            hasNumber ? "✅ One number" : "❌ One number";

        specialRule.innerHTML =
            hasSpecial ? "✅ One special character" : "❌ One special character";

        let score = 0;

        if (hasLength) score++;
        if (hasUpper) score++;
        if (hasLower) score++;
        if (hasNumber) score++;
        if (hasSpecial) score++;

        if (score <= 2) {

            strengthFill.style.width = "30%";
            strengthFill.style.background = "#EF4444";
            strengthText.innerHTML = "🔴 Weak Password";

        }

        else if (score <= 4) {

            strengthFill.style.width = "70%";
            strengthFill.style.background = "#F59E0B";
            strengthText.innerHTML = "🟠 Medium Password";

        }

        else {

            strengthFill.style.width = "100%";
            strengthFill.style.background = "#10B981";
            strengthText.innerHTML = "🟢 Strong Password";

        }

        checkPasswordMatch();

    });

    // -------------------------
    // Password Match
    // -------------------------

    function checkPasswordMatch() {

        if (confirmPassword.value === "") {

            passwordMatch.innerHTML = "";
            return;

        }

        if (newPassword.value === confirmPassword.value) {

            passwordMatch.innerHTML = "✅ Passwords match";
            passwordMatch.style.color = "#10B981";

        }

        else {

            passwordMatch.innerHTML = "❌ Passwords do not match";
            passwordMatch.style.color = "#EF4444";

        }

    }

    newPassword.addEventListener("input", checkPasswordMatch);

    confirmPassword.addEventListener("input", checkPasswordMatch);

    // -------------------------
    // Reset Password API
    // -------------------------

    resetPasswordForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        if (newPassword.value !== confirmPassword.value) {

            showMessage(
                "Passwords do not match.",
                "error"
            );

            return;

        }

        const button =
            resetPasswordForm.querySelector(".auth-btn");

        button.classList.add("loading");

        try {

            const response = await fetch(

                `${API_BASE_URL}/auth/reset-password`,

                {

                    method: "POST",

                    headers: {

                        "Content-Type": "application/json"

                    },

                    body: JSON.stringify({

                        email,
                        otp,
                        newPassword: newPassword.value

                    })

                }

            );

            const result = await response.json();

            button.classList.remove("loading");

            if (!response.ok) {

                showMessage(

                    result.message,

                    "error"

                );

                return;

            }

            showMessage(

                "Password reset successfully!",

                "success"

            );

            sessionStorage.removeItem("resetEmail");
            sessionStorage.removeItem("verifiedOTP");

            setTimeout(() => {

                window.location.href = "login.html";

            }, 1500);

        }

        catch (error) {

            button.classList.remove("loading");

            showMessage(

                "Unable to connect to backend.",

                "error"

            );

        }

    });

}
