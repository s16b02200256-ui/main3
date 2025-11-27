let currentCamera = "user"; // user = インカメ, environment = アウトカメ
let stream = null;

const videoElement = document.querySelector(".input_video");
const canvasElement = document.querySelector(".output_canvas");
const canvasCtx = canvasElement.getContext("2d");

// ----------------- カメラ開始 -----------------
async function startCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
  }

  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: currentCamera }
  });

  videoElement.srcObject = stream;
  await videoElement.play();
}

// ----------------- カメラ停止 -----------------
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  stream = null;
}

// ----------------- カメラ切り替え -----------------
document.getElementById("switchBtn").addEventListener("click", () => {
  currentCamera = currentCamera === "user" ? "environment" : "user";
  startCamera();
});

// ----------------- MediaPipe Pose -----------------
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

pose.onResults(onResults);

// ----------------- 描画処理メイン -----------------
function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // 映像を描画
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.poseLandmarks) {
    // ----------- スケルトンラインを描画 -----------
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
      color: '#00FF00',
      lineWidth: 3
    });

    // ----------- ランドマーク（点）を描画 -----------
    drawLandmarks(canvasCtx, results.poseLandmarks, {
      color: '#FF0000',
      radius: 4
    });

    // ----------- 重心を計算 -----------
    const cx = results.poseLandmarks.reduce((sum, lm) => sum + lm.x, 0) / results.poseLandmarks.length;
    const cy = results.poseLandmarks.reduce((sum, lm) => sum + lm.y, 0) / results.poseLandmarks.length;

    const px = cx * canvasElement.width;
    const py = cy * canvasElement.height;

    // ----------- 重心点を描画（黄色） -----------
    canvasCtx.beginPath();
    canvasCtx.arc(px, py, 8, 0, 2 * Math.PI);
    canvasCtx.fillStyle = "yellow";
    canvasCtx.fill();

    // 重心のテキスト描画
    canvasCtx.fillStyle = "white";
    canvasCtx.font = "18px sans-serif";
    canvasCtx.fillText(`重心: (${px.toFixed(1)}, ${py.toFixed(1)})`, 10, 30);
  }

  canvasCtx.restore();
}

// ----------------- Pose に video を入力するループ -----------------
async function frameLoop() {
  if (stream) {
    await pose.send({ image: videoElement });
  }
  requestAnimationFrame(frameLoop);
}

// ----------------- ボタン処理 -----------------
document.getElementById("startBtn").addEventListener("click", async () => {
  await startCamera();
  frameLoop();
});

document.getElementById("stopBtn").addEventListener("click", () => {
  stopCamera();
});