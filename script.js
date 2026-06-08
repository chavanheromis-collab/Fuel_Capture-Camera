const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyDfQe8kNi3dw4lU1HRFwY_uyPI2UQAMBkrgMTtMJ2ke-oZjGQrkSlQZT_NiZiAuW8/exec";

// ======================================================
// ELEMENTS
// ======================================================

let video =
  document.getElementById("video");

let canvas =
  document.getElementById("canvas");

let statusBox =
  document.getElementById("status");

let resultBox =
  document.getElementById("result");

let stageInfo =
  document.getElementById("stageInfo");

let capturedPhoto =
  document.getElementById("capturedPhoto");

// ======================================================
// GLOBALS
// ======================================================

let cameraReady = false;

let latitude = "";
let longitude = "";
let accuracy = "";

let currentRow = "";

let currentStage = "start";

let currentRequestType = "";

let enteredKm = "";

let capturedImageData = "";
let uploadCompleted = false;

// ======================================================
// ON LOAD
// ======================================================

window.onload = function () {

  checkRowBeforeOpen();
};

// ======================================================
// GET ROW FROM URL
// ======================================================

function getRowFromUrl() {

  const params =
    new URLSearchParams(window.location.search);

  return params.get("row");
}

// ======================================================
// SET STAGE
// ======================================================

function setStage(stage) {

  currentStage = stage;

  resetUI();

  updateStageUI();

  checkRowBeforeOpen();
}

// ======================================================
// UPDATE STAGE UI
// ======================================================

function updateStageUI() {

  document
    .querySelectorAll(".stage-btn")
    .forEach(btn => {

      btn.classList.remove("active-stage");
    });

  if (currentStage === "start") {

    document
      .querySelectorAll(".stage-btn")[0]
      .classList.add("active-stage");
  }

  if (currentStage === "reach") {

    document
      .querySelectorAll(".stage-btn")[1]
      .classList.add("active-stage");
  }

  if (currentStage === "return") {

    document
      .querySelectorAll(".stage-btn")[2]
      .classList.add("active-stage");
  }

  stageInfo.innerHTML =
    "Current Stage: <b>" +
    currentStage.toUpperCase() +
    "</b>";



  const kmInput =
    document.getElementById("kmInput");

  if (currentStage === "start") {

    kmInput.style.display = "block";

    kmInput.placeholder =
      "Enter Start KM";

  }
  else if (currentStage === "return") {

    kmInput.style.display = "block";

    kmInput.placeholder =
      "Enter Return KM";

  }
  else {

    kmInput.style.display = "none";
  }
}

// ======================================================
// CHECK ROW BEFORE OPEN
// ======================================================

async function checkRowBeforeOpen() {

  currentRow = getRowFromUrl();

  updateStageUI();

  if (!currentRow) {

    statusBox.innerText =
      "Invalid link. Row number missing.";

    disableButtons();

    return;
  }

  statusBox.innerText =
    "Checking request access...";

  try {

    const response = await fetch(

      APPS_SCRIPT_URL +

      "?action=checkPhotoRow" +

      "&row=" +
      encodeURIComponent(currentRow) +

      "&stage=" +
      encodeURIComponent(currentStage)
    );

    const result = await response.json();

    if (!result.success) {

      statusBox.innerText =
        result.error;

      disableButtons();

      return;
    }

    currentRequestType =
      result.requestFor || "";

    // ============================================
    // ORGANISATION
    // ============================================

    if (
      currentRequestType
      .toLowerCase()
      === "organisation"
    ) {

      // Disable only REACH

      document
        .querySelectorAll(".stage-btn")[1]
        .disabled = true;

      document
        .querySelectorAll(".stage-btn")[2]
        .disabled = false;
    }

    enableButtons();

    statusBox.innerText =
      "Ready for " +
      currentStage.toUpperCase() +
      " upload";

  } catch (err) {

    statusBox.innerText =
      "Check failed: " + err.message;

    disableButtons();
  }
}

// ======================================================
// DISABLE BUTTONS
// ======================================================

function disableButtons() {

  document
    .getElementById("cameraBtn")
    .disabled = true;

  document
    .getElementById("locationBtn")
    .disabled = true;

  document
    .getElementById("uploadBtn")
    .disabled = true;
}

// ======================================================
// ENABLE BUTTONS
// ======================================================

function enableButtons() {

  document
    .getElementById("cameraBtn")
    .disabled = false;

  document
    .getElementById("locationBtn")
    .disabled = false;

  document
    .getElementById("uploadBtn")
    .disabled = false;
}

// ======================================================
// RESET UI
// ======================================================

function resetUI() {

  const kmInput =
    document.getElementById("kmInput");

  if (kmInput) {
    kmInput.value = "";
  }

  capturedPhoto.style.display = "none";

  video.style.display = "block";

  resultBox.innerHTML = "";

  latitude = "";
  longitude = "";
  accuracy = "";

  cameraReady = false;
}

// ======================================================
// START CAMERA
// ======================================================

async function startCamera() {

  const kmInput =
    document.getElementById("kmInput");

  if (
    currentStage === "start" ||
    currentStage === "return"
  ) {

    enteredKm =
      kmInput.value.trim();

    if (!enteredKm) {

      statusBox.innerText =
        "Please enter KM reading first.";

      return;
    }
  }

  statusBox.innerText =
    "Requesting camera permission...";

  try {

    const stream =
      await navigator.mediaDevices.getUserMedia({

        video: {
          facingMode: {
            ideal: "environment"
          }
        },

        audio: false
      });

    video.srcObject = stream;

    video.onloadedmetadata = function () {

      video.play();

      cameraReady = true;

      statusBox.innerText =
        "Camera ready. Click Get Location.";
    };

  } catch (err) {

    statusBox.innerText =
      "Camera error: " +
      err.message;
  }
}

// ======================================================
// GET LOCATION
// ======================================================

function getLocation() {

  statusBox.innerText =
    "Requesting GPS location...";

  navigator.geolocation.getCurrentPosition(

    function(position) {

      latitude =
        position.coords.latitude;

      longitude =
        position.coords.longitude;

      accuracy =
        position.coords.accuracy;

      statusBox.innerText =
        "Location ready. Accuracy: " +
        Math.round(accuracy) +
        " meters.";
    },

    function(error) {

      statusBox.innerText =
        "Location error: " +
        error.message;
    },

    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    }
  );
}


// Retake Function ======================================

async function retakePhoto() {

  if (uploadCompleted) {
    return;
  }

  capturedPhoto.style.display = "none";
  video.style.display = "block";

  capturedImageData = "";

  document.getElementById("retakeBtn").disabled = true;

  await startCamera();

  statusBox.innerText =
    "Retake photo and upload again.";
}

// ======================================================
// CAPTURE + UPLOAD
// ======================================================

async function captureAndUpload() {

  if (!currentRow) {

    statusBox.innerText =
      "Row missing.";

    return;
  }

  if (
    !cameraReady ||
    !video.videoWidth ||
    !video.videoHeight
  ) {

    statusBox.innerText =
      "Camera not ready.";

    return;
  }

  if (!latitude || !longitude) {

    statusBox.innerText =
      "Location not ready.";

    return;
  }

  // ====================================================
  // DRAW IMAGE
  // ====================================================

  canvas.width = video.videoWidth;

  canvas.height = video.videoHeight;

  const ctx =
    canvas.getContext("2d");

  ctx.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
  );

  // ====================================================
  // OVERLAY
  // ====================================================

  const now =
    new Date().toLocaleString();

  ctx.fillStyle =
    "rgba(0,0,0,0.65)";

  ctx.fillRect(
    0,
    canvas.height - 130,
    canvas.width,
    130
  );

  ctx.fillStyle =
    "#ffffff";

  ctx.font =
    "22px Arial";

  ctx.fillText(
    "Stage: " +
    currentStage.toUpperCase(),
    20,
    canvas.height - 90
  );

  ctx.fillText(
    "Time: " + now,
    20,
    canvas.height - 55
  );

  ctx.fillText(
    "GPS: " +
    latitude +
    ", " +
    longitude,
    20,
    canvas.height - 20
  );

  // ====================================================
  // IMAGE DATA
  // ====================================================

  const imageData =
    canvas.toDataURL(
      "image/jpeg",
      0.85
    );

  // ====================================================
  // SHOW IMAGE
  // ====================================================

  capturedPhoto.src =
    imageData;

  capturedPhoto.style.display =
    "block";

  video.style.display =
    "none";


  document.getElementById("retakeBtn").disabled = false;

  // ====================================================
  // STOP CAMERA
  // ====================================================

  if (video.srcObject) {

    video
      .srcObject
      .getTracks()
      .forEach(track => track.stop());
  }

  statusBox.innerText =
    "Uploading " +
    currentStage.toUpperCase() +
    " image...";

  // ====================================================
  // PAYLOAD
  // ====================================================

  const payload = {

    action: "savePhotoToRow",

    row: currentRow,

    stage: currentStage,

    km: enteredKm,

    image: imageData,

    latitude: latitude,
    longitude: longitude,
    accuracy: accuracy,

    deviceInfo: navigator.userAgent
  };

  try {

    const response = await fetch(

      APPS_SCRIPT_URL,

      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );

    const result =
      await response.json();

    if (result.success) {

      uploadCompleted = true;

      document.getElementById("retakeBtn").disabled = true;

      statusBox.innerText =
        currentStage.toUpperCase() +
        " uploaded successfully";

      // ================================================
      // RESULT UI
      // ================================================

      let html = "";

      html +=
        "<div class='success-box'>";

      html +=
        "<h3>Upload Success</h3>";

      html +=
        "<p><b>Stage:</b> " +
        currentStage.toUpperCase() +
        "</p>";

      html +=
        "<a href='" +
        result.photoUrl +
        "' target='_blank'>Open Photo</a>";

      html += "<br><br>";

      html +=
        "<a href='" +
        result.mapLink +
        "' target='_blank'>Open Location</a>";

      if (result.traveledMap) {

        html += "<br><br>";

        html +=
          "<a href='" +
          result.traveledMap +
          "' target='_blank'>Open Traveled Route</a>";
      }

      html += "</div>";

      resultBox.innerHTML = html;

      disableButtons();

    } else {

      statusBox.innerText =
        "Upload failed: " +
        result.error;
    }

  } catch (err) {

    statusBox.innerText =
      "Upload failed: " +
      err.message;
  }
}
