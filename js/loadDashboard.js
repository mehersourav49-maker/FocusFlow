// ================= SAFE DASHBOARD LOADER =================
async function loadDashboard() {
    const container = document.getElementById("dashboardContainer");
    if (!container) return;

    try {
        const res = await fetch("components/dashboard.html");
        container.innerHTML = await res.text();

        // wait for DOM render
        setTimeout(() => {

            // notify all modes dashboard is ready
            window.dispatchEvent(new Event("dashboardReady"));

            initDashboardHealth();

        }, 300);

    } catch (err) {
        console.error("Dashboard load failed:", err);
    }
}

async function initDashboardHealth() {
    try {
        const res = await fetch(`${window.APP_CONFIG.API_BASE}/health`);
        const data = await res.json();

        if (data.ai) {
            AIDashboard.emotionActive();
        }
    } catch {}
}

window.addEventListener("load", loadDashboard);

