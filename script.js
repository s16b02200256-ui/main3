const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

let stream = null;
let cameraRunning = false;

// 初期はインカメ
let useFrontCamera = true;

// ======== MediaPipe Pose ========
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

pose.onResults(onResults);


// ======== カメラ開始 ========
async function startCamera() {
  if (cameraRunning) return;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 640,
        height: 480,
        facingMode: useFrontCamera ? "user" : "environment",
      },
      audio: false
    });

    videoElement.srcObject = stream;

    videoElement.onloadedmetadata = () => {
      videoElement.play();
      cameraRunning = true;
      requestAnimationFrame(processVideo);
    };

  } catch (err) {
    console.error("カメラ起動エラー:", err);
  }
}

// ======== カメラ停止 ========
function stopCamera() {
  if (!cameraRunning) return;

  stream.getTracks().forEach(track => track.stop());
  videoElement.srcObject = null;
  cameraRunning = false;
}

// ======== カメラ切替 ========
async function switchCamera() {
  stopCamera();
  useFrontCamera = !useFrontCamera;
  await startCamera();
}

// ======== フレーム処理 ========
async function processVideo() {
  if (!cameraRunning) return;

  await pose.send({ image: videoElement });
  requestAnimationFrame(processVideo);
}


// ======== 描画処理（MediaPipe） ========
function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  canvasCtx.drawImage(
    results.image,
    0, 0,
    canvasElement.width, canvasElement.height
  );

  if (!results.poseLandmarks) {
    canvasCtx.restore();
    return;
  }

  // ① ランドマーク（赤）
  drawLandmarks(canvasCtx, results.poseLandmarks, {
    color: "red",
    radius: 4
  });

  // ② 骨格ライン（緑）
  drawConnectors(canvasCtx, results.poseLandmarks, Pose.POSE_CONNECTIONS, {
    color: "lime",
    lineWidth: 3
  });

  canvasCtx.restore();
}


// ======== イベント紐付け ========
document.getElementById("startBtn").addEventListener("click", startCamera);
document.getElementById("stopBtn").addEventListener("click", stopCamera);
document.getElementById("switchBtn").addEventListener("click", switchCamera);