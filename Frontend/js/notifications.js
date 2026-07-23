/* ==========================================
        HEALORA NOTIFICATIONS
========================================== */

const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {

    const markReadBtn = document.querySelector(".mark-read-btn");
    const deleteBtn = document.querySelector(".delete-btn");
    const notifications = document.querySelectorAll(".notification-card");
    const emptyCard = document.querySelector(".empty-card");
    const moonBtn = document.getElementById("themeBtn");
    const toggles = document.querySelectorAll(".switch input");

    /* ==========================
            HIDE EMPTY CARD
    ========================== */

    if (emptyCard) {
        emptyCard.style.display = "none";
    }

    /* ==========================
          MARK ALL AS READ
    ========================== */

    if (markReadBtn) {

        markReadBtn.addEventListener("click", () => {

            notifications.forEach(card => {
                card.classList.remove("unread");
            });

            showToast("✅ All notifications marked as read.");

        });

    }

    /* ==========================
            DELETE ALL
    ========================== */

    if (deleteBtn) {

        deleteBtn.addEventListener("click", () => {

            if (!confirm("Delete all notifications?")) return;

            notifications.forEach(card => card.remove());

            if (emptyCard) {
                emptyCard.style.display = "block";
            }

            showToast("🗑️ All notifications deleted.");

        });

    }

    /* ==========================
      CLICK TO MARK AS READ
    ========================== */

    notifications.forEach(card => {

        card.addEventListener("click", () => {

            card.classList.remove("unread");

        });

    });

    /* ==========================
       SAVE PREFERENCES
    ========================== */

    toggles.forEach((toggle, index) => {

        const key = "notificationPreference" + index;

        const saved = localStorage.getItem(key);

        if (saved !== null) {

            toggle.checked = saved === "true";

        }

        toggle.addEventListener("change", () => {

            localStorage.setItem(key, toggle.checked);

            showToast("⚙️ Preference updated.");

        });

    });

    /* ==========================
            DARK MODE
    ========================== */

    if (localStorage.getItem("notificationDark") === "true") {

        document.body.classList.add("dark");

    }

    if (moonBtn) {

        moonBtn.addEventListener("click", () => {

            document.body.classList.toggle("dark");

            localStorage.setItem(
                "notificationDark",
                document.body.classList.contains("dark")
            );

        });

    }

    /* ==========================
              TOAST
    ========================== */

    function showToast(message) {

        const oldToast = document.querySelector(".notification-toast");

        if (oldToast) oldToast.remove();

        const toast = document.createElement("div");

        toast.className = "notification-toast";

        toast.innerText = message;

        document.body.appendChild(toast);

        setTimeout(() => {

            toast.classList.add("show");

        }, 100);

        setTimeout(() => {

            toast.classList.remove("show");

            setTimeout(() => {

                toast.remove();

            }, 300);

        }, 2500);

    }

    console.log(
        "%c🔔 Healora Notifications Ready",
        "color:#14B8A6;font-size:18px;font-weight:bold;"
    );

});