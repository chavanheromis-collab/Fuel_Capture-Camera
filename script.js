const APPS_SCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE";

let video = document.getElementById("video");
let canvas = document.getElementById("canvas");
let statusBox = document.getElementById("status");
let resultBox = document.getElementById("result");

let cameraReady = false;
let latitude = "";
let longitude = "";
let accuracy = "";

async function startCamera() {
  statusBox.innerText = "Requesting camera permission...";

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      statusBox.innerText = "Camera not supported. Use Chrome on Android mobile.";
      return;
    }

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

  if (!navigator.geolocation) {
    statusBox.innerText = "GPS not supported.";
    return;
  }

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
  if (!cameraReady || !video.videoWidth || !video.videoHeight) {
    statusBox.innerText = "Camera not ready. Click Open Camera first.";
    return;
  }

  if (!latitude || !longitude) {
    statusBox.innerText = "Location not ready. Click Get Location first.";
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Watermark timestamp + GPS on photo
  const now = new Date().toLocaleString();

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, canvas.height - 90, canvas.width, 90);

  ctx.fillStyle = "#ffffff";
  ctx.font = "22px Arial";
  ctx.fillText("Time: " + now, 20, canvas.height - 55);
  ctx.fillText("GPS: " + latitude + ", " + longitude, 20, canvas.height - 25);

  const imageData = canvas.toDataURL("image/jpeg", 0.85);

  statusBox.innerText = "Uploading photo...";

  const payload = {
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
      statusBox.innerText = "Photo uploaded successfully.";

      resultBox.innerHTML =
        "✅ Saved<br><br>" +
        "<a href='" + result.photoUrl + "' target='_blank'>Open Photo</a><br><br>" +
        "<a href='" + result.mapLink + "' target='_blank'>Open Location</a>";
    } else {
      statusBox.innerText = "Upload error: " + result.error;
    }

  } catch (err) {
    statusBox.innerText = "Upload failed: " + err.message;
  }
}
