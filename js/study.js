// ===================================
// Study Mode - FocusFlow (AI Upgrade)
// Focus Score + Smart Intervention + Yawning + Nodding
// ===================================

// ================= Study Timer =================

window.addEventListener("dashboardReady", () => {
    AIDashboard.setMode("Study Mode");
    AIDashboard.faceActive();
    AIDashboard.attentionActive();
    AIDashboard.objectActive();
});


const timerDisplay = document.getElementById("timer");

// Use lighter defaults for mobile devices to reduce lag.
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const TARGET_WIDTH = isMobile ? 320 : 640;
const TARGET_HEIGHT = isMobile ? 240 : 480;
const FACE_FRAME_SKIP = isMobile ? 1 : 0;
const PHONE_DETECT_EVERY_MS = isMobile ? 1400 : 700;
const DRAW_MESH_EVERY_N_FRAMES = isMobile ? 4 : 1;

let sessionSeconds = 0;
let sessionInterval = null;
let lastBreakSuggestion = 0;

function startStudyTimer() {

    sessionInterval = setInterval(() => {

        sessionSeconds++;

        const mins = String(Math.floor(sessionSeconds / 60)).padStart(2, "0");
        const secs = String(sessionSeconds % 60).padStart(2, "0");

        timerDisplay.innerText = `${mins}:${secs}`;

        checkBreakSuggestion();

    }, 1000);
}

startStudyTimer();


// ================= Phone Detection =================
let objectModel = null;
let phoneDetectedFrames = 0;
const PHONE_FRAMES = 20;

// Load object detection model
async function loadObjectModel() {
    objectModel = await cocoSsd.load();
    console.log("Object Detection Ready");
}

loadObjectModel();

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const emotionText = document.getElementById("emotion");
const attentionText = document.getElementById("attention");
const focusScoreText = document.getElementById("focusScore");
const focusBar = document.getElementById("focusBar");

window.addEventListener("load", () => {

    setTimeout(() => {
        AIDashboard.setMode("Study Mode");
        AIDashboard.faceActive();
        AIDashboard.attentionActive();
        AIDashboard.objectActive(); // phone detection
    }, 1000);

});

// Alert sound
const alertSound = new Audio("sounds/wake up.mp3");
alertSound.loop = true;
let alertPlaying = false;

// ================= Focus Intelligence =================
let focusScore = 100;
let distractionCount = 0;
let distractionStreak = 0;

// ================= Camera =================
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: TARGET_WIDTH },
                height: { ideal: TARGET_HEIGHT },
                frameRate: { ideal: isMobile ? 24 : 30, max: isMobile ? 24 : 30 }
            }
        });
        video.srcObject = stream;

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            video.style.transform = "scaleX(-1)";
            canvas.style.transform = "scaleX(-1)";
        };

    } catch {
        alert("Camera access denied");
    }
}
startCamera();

// ================= FaceMesh =================
const faceMesh = new FaceMesh({
    locateFile: file =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: !isMobile,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

// Eye landmarks
const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

// Face direction
const NOSE_TIP = 1;
const LEFT_CHEEK = 234;
const RIGHT_CHEEK = 454;

// Mouth landmarks (for yawning)
const UPPER_LIP = 13;
const LOWER_LIP = 14;

// Thresholds
const EYE_CLOSED_THRESHOLD = 0.15;
const MAX_EYE_CLOSED_FRAMES = 45;
const MAX_LOOKING_AWAY_FRAMES = 60;
const MAX_DISTRACTED_FRAMES = 90;

// Yawning + nodding thresholds
const YAWN_THRESHOLD = 0.04;
const YAWN_FRAMES = 20;

const NOD_THRESHOLD = 0.02;
const NOD_FRAMES = 20;

let eyeClosedFrames = 0;
let distractedFrames = 0;
let lookingAwayFrames = 0;
let yawnFrames = 0;
let nodFrames = 0;
let lastNoseY = null;
let frameCounter = 0;
let onFrameCounter = 0;
let lastPhoneDetectAt = 0;
let phoneDetectInFlight = false;

// ================= Utils =================
function distance(p1, p2) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function calculateEAR(eye) {
    const v1 = distance(eye[1], eye[5]);
    const v2 = distance(eye[2], eye[4]);
    const h = distance(eye[0], eye[3]);
    return (v1 + v2) / (2 * h);
}

function playAlert() {
    if (!alertPlaying) {
        alertSound.play();
        alertPlaying = true;
    }
}

function stopAlert() {
    if (alertPlaying) {
        alertSound.pause();
        alertSound.currentTime = 0;
        alertPlaying = false;
    }
}

function updateFocusDisplay() {
    focusBar.style.width = focusScore + "%";
    focusScoreText.innerText = Math.round(focusScore) + "%";
}

function smartIntervention() {

    if (distractionCount > 8) {
        attentionText.innerText = "Warning: Take a short break (High distraction)";
    }
    else if (focusScore < 40) {
        attentionText.innerText = "Warning: Focus dropping. Deep breath and continue";
    }
    else if (distractionStreak > 60) {
        attentionText.innerText = "Warning: Stay focused on study material";
    }
}

// ================= Face Results =================
faceMesh.onResults(results => {
    frameCounter++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiFaceLandmarks.length > 0) {

        const lm = results.multiFaceLandmarks[0];

        // ----- Eye attention -----
        const leftEye = LEFT_EYE.map(i => lm[i]);
        const rightEye = RIGHT_EYE.map(i => lm[i]);
        const avgEAR = (calculateEAR(leftEye) + calculateEAR(rightEye)) / 2;

        if (avgEAR < EYE_CLOSED_THRESHOLD) eyeClosedFrames++;
        else eyeClosedFrames = 0;

        // ----- Head direction -----
        const noseX = lm[NOSE_TIP].x;
        const faceCenterX = (lm[LEFT_CHEEK].x + lm[RIGHT_CHEEK].x) / 2;
        const headOffset = Math.abs(noseX - faceCenterX);

        if (headOffset > 0.04) lookingAwayFrames++;
        else lookingAwayFrames = 0;

        // ----- Yawning detection -----
        const mouthOpen = Math.abs(lm[UPPER_LIP].y - lm[LOWER_LIP].y);

        if (mouthOpen > YAWN_THRESHOLD) yawnFrames++;
        else yawnFrames = 0;

        // ----- Head nodding detection -----
        const noseY = lm[NOSE_TIP].y;

        if (lastNoseY !== null && noseY - lastNoseY > NOD_THRESHOLD) nodFrames++;
        else nodFrames = 0;

        lastNoseY = noseY;

        // ----- Decision Logic -----
        let isFocused = true;

        if (yawnFrames > YAWN_FRAMES) {
            attentionText.innerText = "Drowsy (Yawning)";
            isFocused = false;
        }
        else if (nodFrames > NOD_FRAMES) {
            attentionText.innerText = "Sleepy (Head Nodding)";
            isFocused = false;
        }
        else if (eyeClosedFrames > MAX_EYE_CLOSED_FRAMES) {
            attentionText.innerText = "Inattentive (Eyes Closed)";
            isFocused = false;
        }
        else if (lookingAwayFrames > MAX_LOOKING_AWAY_FRAMES) {
            attentionText.innerText = "Distracted (Looking Away)";
            isFocused = false;
        }
        else {
            attentionText.innerText = "Focused";
        }

        // ----- Focus Score -----
        if (isFocused) {
            focusScore = Math.min(100, focusScore + 0.2);
            distractionStreak = 0;
            stopAlert();
        } else {
            focusScore = Math.max(0, focusScore - 0.7);
            distractionCount++;
            distractionStreak++;
            playAlert();
            smartIntervention();
        }

        updateFocusDisplay();
        emotionText.innerText = "Neutral";

        if (frameCounter % DRAW_MESH_EVERY_N_FRAMES === 0) {
            drawConnectors(
                ctx,
                lm,
                FACEMESH_TESSELATION,
                { color: "#00FF00", lineWidth: 1 }
            );
        }

    } else {

        distractedFrames++;

        if (distractedFrames > MAX_DISTRACTED_FRAMES) {
            attentionText.innerText = "Distracted (Face Missing)";
            focusScore = Math.max(0, focusScore - 1);
            playAlert();
            updateFocusDisplay();
        }
    }
});

async function detectPhone() {

    if (!objectModel || phoneDetectInFlight) return;
    phoneDetectInFlight = true;

    try {
        const predictions = await objectModel.detect(video);

        const phoneFound = predictions.some(
            obj => obj.class === "cell phone" && obj.score > 0.6
        );

        if (phoneFound) phoneDetectedFrames++;
        else phoneDetectedFrames = 0;

        if (phoneDetectedFrames > PHONE_FRAMES) {
            attentionText.innerText = "Phone Usage Detected";
            focusScore = Math.max(0, focusScore - 1.5);
            playAlert();
            smartIntervention();
        }
    } finally {
        phoneDetectInFlight = false;
    }
}

function checkBreakSuggestion() {

    // Every 20 minutes
    if (sessionSeconds - lastBreakSuggestion > 1200) {

        if (focusScore < 50 || distractionCount > 10) {
            attentionText.innerText =
                "AI Suggestion: Take a 5 min break to restore focus";
        }

        lastBreakSuggestion = sessionSeconds;
    }

    // Emergency fatigue detection
    if (focusScore < 20) {
        attentionText.innerText =
            "AI Recommendation: Stop and take rest";
    }
}


// ================= Camera Utils =================
const camera = new Camera(video, {
onFrame: async () => {
    onFrameCounter++;

    if (!video.videoWidth || !video.videoHeight) return;

    // Keep canvas sizing stable; avoid per-frame width/height assignment.
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }

    // Optionally skip some FaceMesh frames on mobile.
    if (FACE_FRAME_SKIP === 0 || onFrameCounter % (FACE_FRAME_SKIP + 1) === 0) {
        await faceMesh.send({ image: video });
    }

    // Run object detection at a lower frequency because coco-ssd is expensive on phones.
    const now = performance.now();
    if (now - lastPhoneDetectAt >= PHONE_DETECT_EVERY_MS) {
        lastPhoneDetectAt = now;
        detectPhone();
    }
},

    width: TARGET_WIDTH,
    height: TARGET_HEIGHT
});
camera.start();

// ================= End Session =================
function stopSession() {

    stopAlert();
    clearInterval(sessionInterval);

    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }

    window.location.href = "index.html";
}
// ================= AI Study Coach Chat =================

const chatBox = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");

// Add message to UI
function addMessage(text, sender) {
    const div = document.createElement("div");
    div.classList.add("chat-message", sender);
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Send message
async function sendMessage() {

    const message = chatInput.value.trim();
    if (!message) return;

    addMessage(message, "user");
    chatInput.value = "";

    addMessage("Thinking...", "ai");

    try {
        const reply = await askStudyAI(message);

        chatBox.lastChild.innerText = reply;

    } catch {
        chatBox.lastChild.innerText =
            "AI unavailable. Try again later.";
    }
}

// Call backend AI
async function askStudyAI(question) {

    const response = await fetch(`${window.APP_CONFIG.API_BASE}/study-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
    });

    const data = await response.json();
    return data.reply;
}

