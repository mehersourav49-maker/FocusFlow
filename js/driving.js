// =======================================
// Driving Mode - FocusFlow (FINAL WORKING)
// Drowsiness + Yawning + Head Nodding
// =======================================

// ================= DASHBOARD =================
window.addEventListener("dashboardReady", () => {
    AIDashboard.setMode("Driving Mode");
    AIDashboard.faceActive();
    AIDashboard.attentionActive();
});

// ================= ELEMENTS =================
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const alertBox = document.getElementById("alertBox");
const alertText = document.getElementById("alertText");

const alertSound = new Audio("sounds/wake up.mp3");
alertSound.loop = true;

let alertActive = false;

// ================= CAMERA =================
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        };

    } catch {
        alert("Camera access denied");
    }
}
startCamera();

// ================= FACEMESH =================
const faceMesh = new FaceMesh({
    locateFile: f =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

// Landmarks
const LEFT_EYE = [33,160,158,133,153,144];
const RIGHT_EYE = [362,385,387,263,373,380];
const UPPER_LIP = 13;
const LOWER_LIP = 14;
const NOSE_TIP = 1;

// Thresholds
const EYE_CLOSED_THRESHOLD = 0.14;
const MAX_EYE_CLOSED_FRAMES = 25;

const YAWN_THRESHOLD = 0.04;
const YAWN_FRAMES = 20;

const NOD_THRESHOLD = 0.03;
const NOD_FRAMES = 15;

let eyeClosedFrames = 0;
let yawnFrames = 0;
let nodFrames = 0;
let lastNoseY = null;

// ================= UTILS =================
function distance(p1,p2){
    return Math.hypot(p1.x-p2.x,p1.y-p2.y);
}

function calculateEAR(eye){
    const v1=distance(eye[1],eye[5]);
    const v2=distance(eye[2],eye[4]);
    const h=distance(eye[0],eye[3]);
    return (v1+v2)/(2*h);
}

function startAlert(message){
    if(alertActive) return;
    alertActive=true;
    alertSound.play();
    alertBox.classList.add("warning");
    alertText.innerText=message;
}

function stopAlert(){
    alertActive=false;
    alertSound.pause();
    alertSound.currentTime=0;
    alertBox.classList.remove("warning");
    alertText.innerText="Driver Alert";
}

// ================= DETECTION =================
faceMesh.onResults(results => {

    if(!video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0,0,canvas.width,canvas.height);

    if(!results.multiFaceLandmarks.length){
        stopAlert();
        return;
    }

    const lm = results.multiFaceLandmarks[0];

    // draw mesh
    drawConnectors(ctx,lm,FACEMESH_TESSELATION,{
        color:"#22c55e",
        lineWidth:1
    });

    // ===== Eye closure =====
    const leftEye = LEFT_EYE.map(i=>lm[i]);
    const rightEye = RIGHT_EYE.map(i=>lm[i]);

    const avgEAR=(calculateEAR(leftEye)+calculateEAR(rightEye))/2;

    if(avgEAR < EYE_CLOSED_THRESHOLD) eyeClosedFrames++;
    else eyeClosedFrames=0;

    // ===== Yawning =====
    const mouthOpen=Math.abs(lm[UPPER_LIP].y-lm[LOWER_LIP].y);
    if(mouthOpen>YAWN_THRESHOLD) yawnFrames++;
    else yawnFrames=0;

    // ===== Head nod =====
    const noseY=lm[NOSE_TIP].y;
    if(lastNoseY!==null && noseY-lastNoseY>NOD_THRESHOLD) nodFrames++;
    else nodFrames=0;
    lastNoseY=noseY;

    // ===== Decision =====
    if(yawnFrames>YAWN_FRAMES){
        startAlert("Yawning Detected! Stay Alert");
    }
    else if(nodFrames>NOD_FRAMES){
        startAlert("Head Nodding! Drowsy Driver");
    }
    else if(eyeClosedFrames>MAX_EYE_CLOSED_FRAMES){
        startAlert("Drowsiness Detected!");
    }
    else{
        stopAlert();
    }
});

// ================= CAMERA LOOP =================
const camera=new Camera(video,{
    onFrame:async()=>await faceMesh.send({image:video}),
    width:640,
    height:480
});
camera.start();

// ================= END =================
function stopSession(){
    stopAlert();
    video.srcObject?.getTracks().forEach(t=>t.stop());
    window.location.href="index.html";
}
