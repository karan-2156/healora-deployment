/* ============================================
   HEALORA LANDING PAGE
   script.js
============================================ */

/* ========= PRELOADER ========= */

window.addEventListener("load", () => {

    const preloader = document.querySelector(".preloader");

    if (preloader) {
        preloader.classList.add("hide");

        setTimeout(() => {
            preloader.remove();
        }, 600);
    }

});

/* ========= MOBILE MENU ========= */

const menuBtn = document.querySelector(".menu-toggle");
const navMenu = document.querySelector(".nav-links");

if (menuBtn && navMenu) {

    menuBtn.addEventListener("click", () => {

        navMenu.classList.toggle("active");
        menuBtn.classList.toggle("active");

    });

}

/* ========= CLOSE MENU ========= */

document.querySelectorAll(".nav-links a").forEach(link => {

    link.addEventListener("click", () => {

        if (navMenu) {

            navMenu.classList.remove("active");

        }

        if (menuBtn) {

            menuBtn.classList.remove("active");

        }

    });

});

/* ========= STICKY NAVBAR ========= */

const navbar = document.querySelector(".navbar");

window.addEventListener("scroll", () => {

    if (!navbar) return;

    if (window.scrollY > 40) {

        navbar.classList.add("sticky");

    } else {

        navbar.classList.remove("sticky");

    }

});

/* ========= SMOOTH SCROLL ========= */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {

    anchor.addEventListener("click", function (e) {

        const target = document.querySelector(this.getAttribute("href"));

        if (target) {

            e.preventDefault();

            target.scrollIntoView({

                behavior: "smooth"

            });

        }

    });

});

/* ========= HERO BUTTON ========= */

const heroBtn = document.querySelector(".hero .btn-primary");

if (heroBtn) {

    heroBtn.addEventListener("click", () => {

    const token = localStorage.getItem("token");

    if (token) {

        window.location.href = "pages/dashboard.html";

    } else {

        window.location.href = "pages/signup.html";

    }

});

}

/* ========= COUNTER ANIMATION ========= */

const counters = document.querySelectorAll(".counter");

function startCounters() {

    counters.forEach(counter => {

        const target = +counter.dataset.target;

        let value = 0;

        const speed = target / 80;

        function update() {

            value += speed;

            if (value < target) {

                counter.innerText = Math.floor(value);

                requestAnimationFrame(update);

            } else {

                counter.innerText = target;

            }

        }

        update();

    });

}
/* ============================================
   PART 2
   SCROLL ANIMATIONS + FAQ + ACTIVE NAV
============================================ */

/* ========= SCROLL REVEAL ========= */

const revealElements = document.querySelectorAll(
".feature-card, .analytics-card, .testimonial-card, .section-header, .chat-window, .cta-box"
);

function revealOnScroll(){

    const trigger = window.innerHeight * 0.85;

    revealElements.forEach(element=>{

        const top = element.getBoundingClientRect().top;

        if(top < trigger){

            element.classList.add("show");

        }

    });

}

window.addEventListener("scroll",revealOnScroll);

revealOnScroll();


/* ========= ACTIVE NAV LINK ========= */

const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".nav-links a");

window.addEventListener("scroll",()=>{

    let current = "";

    sections.forEach(section=>{

        const sectionTop = section.offsetTop-140;

        if(pageYOffset >= sectionTop){

            current = section.getAttribute("id");

        }

    });

    navLinks.forEach(link=>{

        link.classList.remove("active");

        if(link.getAttribute("href")==="#"+current){

            link.classList.add("active");

        }

    });

});


/* ========= FAQ ========= */

const faqItems=document.querySelectorAll(".faq-item");

faqItems.forEach(item=>{

    const question=item.querySelector(".faq-question");

    if(question){

        question.addEventListener("click",()=>{

            faqItems.forEach(other=>{

                if(other!==item){

                    other.classList.remove("active");

                }

            });

            item.classList.toggle("active");

        });

    }

});


/* ========= BUTTON RIPPLE ========= */

const buttons=document.querySelectorAll(".btn");

buttons.forEach(button=>{

    button.addEventListener("click",function(e){

        const circle=document.createElement("span");

        const diameter=Math.max(this.clientWidth,this.clientHeight);

        const radius=diameter/2;

        circle.style.width=circle.style.height=diameter+"px";

        circle.style.left=e.clientX-this.getBoundingClientRect().left-radius+"px";

        circle.style.top=e.clientY-this.getBoundingClientRect().top-radius+"px";

        circle.classList.add("ripple");

        const ripple=this.getElementsByClassName("ripple")[0];

        if(ripple){

            ripple.remove();

        }

        this.appendChild(circle);

    });

});


/* ========= HERO FLOAT ========= */

const dashboard=document.querySelector(".dashboard-preview");

window.addEventListener("mousemove",(e)=>{

    if(!dashboard) return;

    const x=(window.innerWidth/2-e.pageX)/45;

    const y=(window.innerHeight/2-e.pageY)/45;

    dashboard.style.transform=
    `rotateY(${x}deg) rotateX(${-y}deg)`;

});


window.addEventListener("mouseleave",()=>{

    if(!dashboard) return;

    dashboard.style.transform="rotateY(0deg) rotateX(0deg)";

});


/* ========= SCROLL TO TOP ========= */

const scrollBtn=document.querySelector(".scroll-top");

if(scrollBtn){

window.addEventListener("scroll",()=>{

if(window.scrollY>600){

scrollBtn.classList.add("show");

}else{

scrollBtn.classList.remove("show");

}

});

scrollBtn.addEventListener("click",()=>{

window.scrollTo({

top:0,

behavior:"smooth"

});

});

}
/* ============================================
   PART 3
   PREMIUM INTERACTIONS
============================================ */

/* ========= COUNTER ON SCROLL ========= */

const counterItems = document.querySelectorAll(".counter");

let counterStarted = false;

function animateCounters() {

    if (counterStarted) return;

    const analytics = document.querySelector(".analytics");

    if (!analytics) return;

    const trigger = analytics.getBoundingClientRect().top;

    if (trigger < window.innerHeight - 120) {

        counterStarted = true;

        counterItems.forEach(counter => {

            const target = Number(counter.dataset.target);

            let count = 0;

            const increment = Math.ceil(target / 100);

            const update = () => {

                count += increment;

                if (count >= target) {

                    counter.innerText = target;

                } else {

                    counter.innerText = count;

                    requestAnimationFrame(update);

                }

            };

            update();

        });

    }

}

window.addEventListener("scroll", animateCounters);


/* ========= PARALLAX BLOBS ========= */

const blobs = document.querySelectorAll(".blob");

window.addEventListener("mousemove", (e) => {

    blobs.forEach((blob, index) => {

        const speed = (index + 1) * 0.02;

        const x = (window.innerWidth / 2 - e.clientX) * speed;

        const y = (window.innerHeight / 2 - e.clientY) * speed;

        blob.style.transform =
            `translate(${x}px, ${y}px)`;

    });

});


/* ========= FLOATING ICONS ========= */

const floatingIcons = document.querySelectorAll(".floating-icon");

floatingIcons.forEach((icon, i) => {

    let angle = i * 50;

    setInterval(() => {

        angle += 0.02;

        const x = Math.sin(angle) * 10;

        const y = Math.cos(angle) * 10;

        icon.style.transform =
            `translate(${x}px, ${y}px)`;

    }, 20);

});


/* ========= MAGNETIC BUTTON ========= */

document.querySelectorAll(".btn").forEach(button => {

    button.addEventListener("mousemove", (e) => {

        const rect = button.getBoundingClientRect();

        const x = e.clientX - rect.left;

        const y = e.clientY - rect.top;

        const moveX = (x - rect.width / 2) / 8;

        const moveY = (y - rect.height / 2) / 8;

        button.style.transform =
            `translate(${moveX}px, ${moveY}px)`;

    });

    button.addEventListener("mouseleave", () => {

        button.style.transform = "";

    });

});


/* ========= HERO IMAGE TILT ========= */

const heroImage = document.querySelector(".hero-right");

if (heroImage) {

    heroImage.addEventListener("mousemove", (e) => {

        const rect = heroImage.getBoundingClientRect();

        const x = e.clientX - rect.left;

        const y = e.clientY - rect.top;

        const rotateY = (x - rect.width / 2) / 30;

        const rotateX = -(y - rect.height / 2) / 30;

        heroImage.style.transform =
            `perspective(1000px)
             rotateX(${rotateX}deg)
             rotateY(${rotateY}deg)`;

    });

    heroImage.addEventListener("mouseleave", () => {

        heroImage.style.transform =
            "perspective(1000px) rotateX(0) rotateY(0)";

    });

}


/* ========= RANDOM FLOAT ========= */

document.querySelectorAll(".glass-card").forEach(card => {

    const random = Math.random() * 6 + 4;

    card.style.animation =
        `floating ${random}s ease-in-out infinite`;

});


/* ========= CONSOLE MESSAGE ========= */

console.log(

"%c❤️ Welcome to Healora",

"font-size:28px;color:#14B8A6;font-weight:bold;"

);

console.log(

"%cBuilt with HTML • CSS • JavaScript",

"font-size:15px;color:#0B4F6C;"

);
/* ============================================
   PART 4
   PREMIUM EFFECTS
============================================ */

/* ========= CURSOR GLOW ========= */

const glow = document.createElement("div");

glow.className = "cursor-glow";

document.body.appendChild(glow);

document.addEventListener("mousemove",(e)=>{

    glow.style.left = e.clientX + "px";

    glow.style.top = e.clientY + "px";

});


/* ========= SCROLL PROGRESS ========= */

const progressBar = document.createElement("div");

progressBar.className = "scroll-progress";

document.body.appendChild(progressBar);

window.addEventListener("scroll",()=>{

    const scrollTop = document.documentElement.scrollTop;

    const scrollHeight =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight;

    const progress =
    (scrollTop/scrollHeight)*100;

    progressBar.style.width = progress + "%";

});


/* ========= NAVBAR BLUR ========= */

window.addEventListener("scroll",()=>{

    const nav=document.querySelector(".navbar");

    if(!nav) return;

    if(window.scrollY>80){

        nav.style.backdropFilter="blur(20px)";
        nav.style.background="rgba(255,255,255,.75)";

    }else{

        nav.style.backdropFilter="blur(0px)";
        nav.style.background="transparent";

    }

});


/* ========= RANDOM FLOAT ========= */

document.querySelectorAll(".feature-card").forEach((card,index)=>{

    card.style.animation=
    `floating ${5+index}s ease-in-out infinite`;

});


/* ========= HERO PARALLAX ========= */

window.addEventListener("scroll",()=>{

    const hero=document.querySelector(".hero");

    if(!hero) return;

    hero.style.backgroundPositionY=
    window.scrollY*0.3+"px";

});


/* ========= PAGE VISIBILITY ========= */

document.addEventListener("visibilitychange",()=>{

    if(document.hidden){

        document.title="❤️ Come back to Healora";

    }

    else{

        document.title="Healora | AI Health Assistant";

    }

});


/* ========= BUTTON HOVER SOUND PLACEHOLDER ========= */

document.querySelectorAll(".btn").forEach(btn=>{

btn.addEventListener("mouseenter",()=>{

btn.style.transition=".3s";

});

});


/* ========= LOADING COMPLETE ========= */

window.addEventListener("load",()=>{

document.body.classList.add("loaded");

});


/* ========= YEAR ========= */

const year=document.querySelector("#year");

if(year){

year.textContent=new Date().getFullYear();

}


/* ========= PERFORMANCE ========= */

window.requestIdleCallback?.(()=>{

console.log("Healora Loaded Successfully");

});


/* ========= WELCOME ========= */

console.log(

"%c❤️ Healora",

"font-size:32px;font-weight:bold;color:#14B8A6"

);

console.log(

"%cDesigned by Team Healora",

"font-size:16px;color:#0B4F6C"

);

/* ==========================================
   LANDING PAGE AUTH CHECK
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    const loginBtn = document.getElementById("loginBtn");
    const getStartedBtn = document.getElementById("getStartedBtn");

    if (!loginBtn || !getStartedBtn) return;

    if (token) {

        loginBtn.textContent = "Dashboard";
        loginBtn.href = "pages/dashboard.html";

        getStartedBtn.textContent =
            `Welcome ${user?.name || "User"}`;

        getStartedBtn.href = "pages/dashboard.html";

    }

});