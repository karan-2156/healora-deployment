const heartRate = document.getElementById("heartRate");
const bloodPressure = document.getElementById("bloodPressure");
const sleep = document.getElementById("sleep");
const steps = document.getElementById("steps");
const healthScore = document.getElementById("healthScore");
const status = document.getElementById("status");

// Temporary function
async function loadHealthData() {

    try {

        // Later we'll replace this with a real backend API
        // Example:
        // const response = await fetch("http://localhost:5000/api/health/latest");

        // Temporary placeholder
        const data = null;

        if (!data) {

            status.innerText = "No health data found. Add your first health reading.";

            return;

        }

        heartRate.innerText = `${data.heartRate} BPM`;
        bloodPressure.innerText = data.bloodPressure;
        sleep.innerText = `${data.sleep} hrs`;
        steps.innerText = data.steps;
        healthScore.innerText = `${data.healthScore}%`;

        status.innerText = "Health data loaded successfully.";

    }

    catch (error) {

        console.error(error);

        status.innerText = "Unable to load health data.";

    }

}

loadHealthData();