// =======================================
// Practice Mode - Stable Emotion AI Version
// =======================================

window.addEventListener("dashboardReady", () => {
    AIDashboard.setMode("Practice Mode");
    AIDashboard.faceActive();
    AIDashboard.emotionActive();
});


let eyeScoreValue = 50;
let expressionScoreValue = 50;
let stabilityScoreValue = 50;
let isSessionActive = true;

const summaryBox = document.getElementById("summaryBox");
const summaryText = document.getElementById("summaryText");
const generateFeedbackBtn = document.getElementById("generateFeedbackBtn");
const endSessionBtn = document.getElementById("endSessionBtn");


const video = document.getElementById("video");
const feedbackText = document.getElementById("feedbackText");
const confidenceLevel = document.getElementById("confidenceLevel");

// Wait until full page load
window.addEventListener("load", async () => {

    if (typeof faceapi === "undefined") {
        console.error("faceapi not loaded!");
        feedbackText.innerText = "Face AI library failed to load. Check internet connection.";
        return;
    }

    console.log("faceapi loaded successfully");

    try {
        await loadModels();
        await startCamera();
    } catch (error) {
        console.error("Practice mode startup failed:", error);
        feedbackText.innerText = "Unable to start Practice mode. Check camera/model access.";
        confidenceLevel.innerText = "Confidence: Unavailable";
        return;
    }

    video.addEventListener("play", () => {
        detectEmotion();
    });
});

// ================= Load Models =================
async function loadModels() {
    await faceapi.nets.tinyFaceDetector.loadFromUri("./models");
    await faceapi.nets.faceExpressionNet.loadFromUri("./models");
    console.log("Models Loaded");
}

window.addEventListener("load", () => {

    setTimeout(() => {
        AIDashboard.setMode("Practice Mode");
        AIDashboard.faceActive();
        AIDashboard.emotionActive();
    }, 1000);

});


// ================= Start Camera =================
async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
}

// ================= Emotion Detection =================
async function detectEmotion() {
    if (!isSessionActive) return;

    try {
        const detection = await faceapi
            .detectSingleFace(
                video,
                new faceapi.TinyFaceDetectorOptions()
            )
            .withFaceExpressions();

        if (detection && detection.expressions) {
            const expressions = detection.expressions;

            const dominantEmotion = Object.keys(expressions)
                .reduce((a, b) =>
                    expressions[a] > expressions[b] ? a : b
                );

            updateFeedback(dominantEmotion);
        }
    } catch (error) {
        console.error("Emotion detection error:", error);
    }

    if (isSessionActive) {
        requestAnimationFrame(detectEmotion);
    }
}

// ================= Feedback Logic =================
function updateFeedback(emotion) {

    if (emotion === "happy") {
        feedbackText.innerText = "Great! You look confident";
        confidenceLevel.innerText = "Confidence: High";
    }

    else if (emotion === "neutral") {
        feedbackText.innerText = "Maintain slight smile";
        confidenceLevel.innerText = "Confidence: Medium";
    }

    else if (emotion === "sad" || emotion === "fearful") {
        feedbackText.innerText = "Relax your facial expression";
        confidenceLevel.innerText = "Confidence: Low";
    }

    else if (emotion === "angry") {
        feedbackText.innerText = "Avoid tense expressions";
        confidenceLevel.innerText = "Confidence: Low";
    }

    else {
        feedbackText.innerText = "Stay composed";
        confidenceLevel.innerText = "Confidence: Medium";
    }
    // ---- Expression Score ----
if (emotion === "happy") {
    expressionScoreValue = 90;
} else if (emotion === "neutral") {
    expressionScoreValue = 60;
} else {
    expressionScoreValue = 40;
}

// ---- Eye Contact Score (simple version) ----
eyeScoreValue = emotion === "happy" ? 85 : 65;

// ---- Stability Score (basic placeholder) ----
stabilityScoreValue = confidenceLevel.innerText.includes("High") ? 85 : 60;

updateDashboard();

}

async function generateAIFeedback(metrics) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
        const response = await fetch(`${window.APP_CONFIG.API_BASE}/generate-feedback`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ metrics }),
            signal: controller.signal,
        });

        const data = await response.json();
        return data.feedback;
    } finally {
        clearTimeout(timeoutId);
    }
}
function updateDashboard() {

    const confidenceValue =
        Math.round(
            0.4 * eyeScoreValue +
            0.3 * expressionScoreValue +
            0.3 * stabilityScoreValue
        );

    document.getElementById("confidenceBar").style.width = confidenceValue + "%";
    document.getElementById("eyeBar").style.width = eyeScoreValue + "%";
    document.getElementById("expressionBar").style.width = expressionScoreValue + "%";
    document.getElementById("stabilityBar").style.width = stabilityScoreValue + "%";

    document.getElementById("confidenceScore").innerText = confidenceValue + "%";
    document.getElementById("eyeScore").innerText = eyeScoreValue + "%";
    document.getElementById("expressionScore").innerText = expressionScoreValue + "%";
    document.getElementById("stabilityScore").innerText = stabilityScoreValue + "%";
}


// ================= Session Actions =================
async function generateSessionFeedback() {
    summaryBox.style.display = "block";
    summaryText.innerHTML = "Generating AI feedback...";

    try {

        const metrics = {
            eyeContact: "Moderate",
            smile: confidenceLevel.innerText.includes("High") ? "High" : "Medium",
            nervous: confidenceLevel.innerText.includes("Low") ? "High" : "Low"
        };

        const aiFeedback = await generateAIFeedback(metrics);

        summaryText.innerHTML = aiFeedback;

    } catch (error) {
        console.error("AI error:", error);
        summaryText.innerHTML = "AI feedback unavailable. Check backend.";
    }

    if (generateFeedbackBtn) {
        generateFeedbackBtn.style.display = "none";
    }
    if (endSessionBtn) {
        endSessionBtn.style.display = "block";
    }
}

function endSession() {
    isSessionActive = false;

    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }

    window.location.href = "index.html";
}

window.generateSessionFeedback = generateSessionFeedback;
window.endSession = endSession;


