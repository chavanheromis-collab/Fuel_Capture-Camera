const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyDfQe8kNi3dw4lU1HRFwY_uyPI2UQAMBkrgMTtMJ2ke-oZjGQrkSlQZT_NiZiAuW8/exec";

let video = document.getElementById("video");
let canvas = document.getElementById("canvas");
let statusBox = document.getElementById("status");
let resultBox = document.getElementById("result");

let cameraReady = false;
let latitude = "";
let longitude = "";
let accuracy = "";
let currentRow = "";

window.onload = function () {
  checkRowBeforeOpen();
};

function getRowFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("row");
}

async function checkRowBeforeOpen() {
  currentRow = getRowFromUrl();

  if (!currentRow) {
    statusBox.innerText = "Invalid link. Row number missing.";
    disableButtons();
    return;
  }

  statusBox.innerText = "Checking row availability...";

  try {
    const response = await fetch(
      APPS_SCRIPT_URL + "?action=checkPhotoRow&row=" + encodeURIComponent(currentRow)
    );

    const result = await response.json();

    if (!result.success) {
      statusBox.innerText = "Cannot open camera: " + result.error;
      disableButtons();
      return;
    }

    statusBox.innerText =
      "Row found. Chessis NO: " + result.chessisNo + ". Click Open Camera.";

    enableButtons();

  } catch (err) {
    statusBox.innerText = "Row check failed: " + err.message;
    disableButtons();
  }
}

function disableButtons() {
  document.querySelectorAll("button").forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = "0.5";
  });
}

function enableButtons() {
  document.querySelectorAll("button").forEach(btn => {
    btn.disabled = false;
    btn.style.opacity = "1";
  });
}

async function startCamera() {
  statusBox.innerText = "Requesting camera permission...";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" }
      },
      audio: false
    });

    video.srcObject = stream;

    video.onloadedmetadata = function () {
      video.play();
      cameraReady = true;
      statusBox.innerText = "Camera ready. Now click Get Location.";
    };

  } catch (err) {
    statusBox.innerText = "Camera error: " + err.name + " - " + err.message;
  }
}

function getLocation() {
  statusBox.innerText = "Requesting location permission...";

  navigator.geolocation.getCurrentPosition(
    function(position) {
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
      accuracy = position.coords.accuracy;

      statusBox.innerText =
        "Location ready. Accuracy: " + Math.round(accuracy) + " meters.";
    },
    function(error) {
      statusBox.innerText = "Location error: " + error.message;
    },
    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    }
  );
}


async function captureAndUpload() {
  if (!currentRow) {
    statusBox.innerText = "Row missing.";
    return;
  }

  if (!cameraReady || !video.videoWidth || !video.videoHeight) {
    statusBox.innerText = "Camera not ready.";
    return;
  }

  if (!latitude || !longitude) {
    statusBox.innerText = "Location not ready.";
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");

  // Capture frame
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const now = new Date().toLocaleString();

  // Black overlay
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, canvas.height - 90, canvas.width, 90);

  // Timestamp + GPS
  ctx.fillStyle = "#ffffff";
  ctx.font = "22px Arial";
  ctx.fillText("Time: " + now, 20, canvas.height - 55);
  ctx.fillText("GPS: " + latitude + ", " + longitude, 20, canvas.height - 25);

  // Convert to image
  const imageData = canvas.toDataURL("image/jpeg", 0.85);

  // =========================
  // SHOW CAPTURED IMAGE
  // =========================

  const capturedPhoto = document.getElementById("capturedPhoto");

  capturedPhoto.src = imageData;
  capturedPhoto.style.display = "block";

  // Hide live camera
  video.style.display = "none";

  // Stop camera stream completely
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }

  statusBox.innerText = "Uploading photo to same row...";

  const payload = {
    action: "savePhotoToRow",
    row: currentRow,
    image: imageData,
    latitude: latitude,
    longitude: longitude,
    accuracy: accuracy,
    deviceInfo: navigator.userAgent
  };

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.success) {
      statusBox.innerText = "Photo saved in row " + result.row;

      resultBox.innerHTML =
        "✅ Saved in same row<br><br>" +
        "<a href='" + result.photoUrl + "' target='_blank'>Open Photo</a><br><br>" +
        "<a href='" + result.mapLink + "' target='_blank'>Open Location</a>";

    } else {
      statusBox.innerText = "Upload error: " + result.error;
    }

  } catch (err) {
    statusBox.innerText = "Upload failed: " + err.message;
  }
}
