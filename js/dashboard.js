// ================= AI Dashboard Controller =================

function setStatus(id, state) {
    const el = document.getElementById(id);
    if (!el) return;

    el.innerText = state;
    el.className = state === "Active" ? "active" : "inactive";
}

function setMode(modeName) {
    const mode = document.getElementById("currentMode");
    if (mode) mode.innerText = modeName;
}

// ===== Public functions =====
window.AIDashboard = {
    faceActive: () => setStatus("faceStatus", "Active"),
    emotionActive: () => setStatus("emotionStatus", "Active"),
    attentionActive: () => setStatus("attentionStatus", "Active"),
    objectActive: () => setStatus("objectStatus", "Active"),
    setMode
};
