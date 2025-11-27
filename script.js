const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");

let camera = null;
let currentCamera = "user"; // user = インカメラ、environment = アウトカメラ
let stream = null;

// ★ Pose 接続線の定義（胴体 + 四肢）
const CONNECTED_LANDMARKS = [
    [11, 12], [11, 13], [13, 15],
    [12, 14], [14, 16],
    [11, 23], [12, 24],
    [23, 24], [23, 25], [25, 27],
    [24, 26], [26, 28]
];

// --------------------- Pose 設定 ---------------------
const pose = new Pose.Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
});

pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
});

// --------------------- 描画処理 ---------------------
pose.onResults((results) => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.poseLandmarks) {
        // ★ 全ランドマーク（赤）
        canvasCtx.fillStyle = "red";
        for (const lm of results.poseLandmarks) {
            const x = lm.x * canvasElement.width;
            const y = lm.y * canvasElement.height;
            canvasCtx.beginPath();
            canvasCtx.arc(x, y, 5, 0, 2 * Math.PI);
            canvasCtx.fill();
        }

        // ★ 接続線（緑）
        canvasCtx.strokeStyle = "green";
        canvasCtx.lineWidth = 3;

        CONNECTED_LANDMARKS.forEach(([a, b]) => {
            const lmA = results.poseLandmarks[a];
            const lmB = results.poseLandmarks[b];
            if (lmA && lmB) {
                canvasCtx.beginPath();
                canvasCtx.moveTo(lmA.x * canvasElement.width, lmA.y * canvasElement.height);
                canvasCtx.lineTo(lmB.x * canvasElement.width, lmB.y * canvasElement.height);
                canvasCtx.stroke();
            }
        });
    }

    canvasCtx.restore();
});

// --------------------- カメラ開始 ---------------------
async function startCamera() {
    if (stream) {
        stream.getTracks().forEach((t) => t.stop());
    }

    stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentCamera },
        audio: false,
    });

    videoElement.srcObject = stream;

    camera = new Camera(videoElement, {
        onFrame: async () => {
            await pose.send({ image: videoElement });
        },
        width: 640,
        height: 480,
    });

    camera.start();
}

// --------------------- カメラ停止（画面静止） ---------------------
function stopCamera() {
    if (camera) {
        camera.stop();
    }
    if (stream) {
        stream.getTracks().forEach((t) => t.stop());
    }
}

// --------------------- イベント登録 ---------------------
document.getElementById("startBtn").addEventListener("click", startCamera);
document.getElementById("stopBtn").addEventListener("click", stopCamera);

// カメラ切り替え
document.getElementById("switchBtn").addEventListener("click", () => {
    currentCamera = currentCamera === "user" ? "environment" : "user";
    startCamera();
});

// canvas を video と同じサイズに合わせる
videoElement.addEventListener("loadedmetadata", () => {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
});