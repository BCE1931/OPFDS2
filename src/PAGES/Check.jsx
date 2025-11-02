import React, { useEffect, useRef, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";

const Check = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [fullscreenAllowed, setFullscreenAllowed] = useState(false);
  const [alignmentPerfect, setAlignmentPerfect] = useState(false);
  const [multipleFaces, setMultipleFaces] = useState(false);
  const navigate = useNavigate();

  // small state to prevent repeated toasts
  const lastToastRef = useRef({
    noface: 0,
    multi: 0,
    moveX: 0,
    moveY: 0,
    rotated: 0,
  });

  // Request camera access
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraAllowed(true);
    } catch (err) {
      toast.error("Camera permission denied. Please allow camera access.");
      setCameraAllowed(false);
    }
  };

  // Request fullscreen
  const enableFullScreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    setFullscreenAllowed(true);
    localStorage.setItem("examMode", "true");
    window.dispatchEvent(new Event("storage")); // notify App.jsx
  };

  useEffect(() => {
    startCamera();
  }, []);

  useEffect(() => {
    if (!cameraAllowed || !videoRef.current) return;

    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 2,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await faceMesh.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    camera.start();
    return () => camera.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraAllowed]);

  // helper: show toast at most once per 1500ms per id
  const limitedToast = (fn, id, msg, options = {}) => {
    const now = Date.now();
    const last = lastToastRef.current[id] || 0;
    if (now - last > 1500) {
      lastToastRef.current[id] = now;
      fn(msg, { toastId: id, ...options });
    }
  };

  const onResults = (results) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // sync canvas size with video
    const vw = videoRef.current.videoWidth || 640;
    const vh = videoRef.current.videoHeight || 480;
    canvas.width = vw;
    canvas.height = vh;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    const faces = results.multiFaceLandmarks || [];

    setAlignmentPerfect(false);

    // default mesh color red (not aligned / error)
    let meshColor = "#FF0000";

    if (faces.length === 0) {
      setMultipleFaces(false);
      limitedToast(
        toast.warning,
        "noface",
        "No face detected. Please look at the camera."
      );
    } else if (faces.length > 1) {
      setMultipleFaces(true);
      limitedToast(
        toast.error,
        "multi",
        "❌ Multiple faces detected — only one person allowed!"
      );
    } else {
      setMultipleFaces(false);

      const landmarks = faces[0];
      // compute normalized xs/ys arrays
      const xs = landmarks.map((pt) => pt.x);
      const ys = landmarks.map((pt) => pt.y);

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const faceWidth = (maxX - minX) * canvas.width;
      const faceHeight = (maxY - minY) * canvas.height;

      // center of face bounding box
      const faceCenterX = ((minX + maxX) / 2) * canvas.width;
      const faceCenterY = ((minY + maxY) / 2) * canvas.height;

      const offsetX = faceCenterX - canvas.width / 2;
      const offsetY = faceCenterY - canvas.height / 2;

      // ----- HEAD TURN (yaw) heuristic -----
      // try to use landmarks 33 and 263 (common FaceMesh eye outer corners)
      // fallback: use averages of left/right halves if indices not present
      const idxLeftEye = 33;
      const idxRightEye = 263;

      let eyeDist = null;
      if (landmarks[idxLeftEye] && landmarks[idxRightEye]) {
        eyeDist =
          Math.abs(landmarks[idxLeftEye].x - landmarks[idxRightEye].x) *
          canvas.width;
      } else {
        // fallback: average left half vs right half x distance
        const meanLeftX =
          xs.filter((x) => x < (minX + maxX) / 2).reduce((a, b) => a + b, 0) /
          Math.max(1, xs.filter((x) => x < (minX + maxX) / 2).length);
        const meanRightX =
          xs.filter((x) => x > (minX + maxX) / 2).reduce((a, b) => a + b, 0) /
          Math.max(1, xs.filter((x) => x > (minX + maxX) / 2).length);
        eyeDist = Math.abs(meanRightX - meanLeftX) * canvas.width;
      }

      // normalized ratio: eyeSpan / faceWidth
      const eyeToFaceRatio = faceWidth > 0 ? eyeDist / faceWidth : 0;

      // if ratio is small, head likely turned (you can tweak threshold)
      const TURN_THRESHOLD = 0.56; // smaller ratio => turned away; adjust between 0.35-0.5
      const turnedAway = eyeToFaceRatio < TURN_THRESHOLD;

      // ----- POSITION alignment checks (center) -----
      const OFFSET_X_ALLOW = 25; // px threshold for left/right
      const OFFSET_Y_ALLOW = 35; // px threshold for up/down
      let centered =
        Math.abs(offsetX) <= OFFSET_X_ALLOW &&
        Math.abs(offsetY) <= OFFSET_Y_ALLOW;

      // if turnedAway => treat as not centered and show error
      if (turnedAway) {
        limitedToast(
          toast.error,
          "rotated",
          "Please face the camera directly (don't turn your head)."
        );
        meshColor = "#FF0000";
      } else if (!centered) {
        // not centered but not turned: warn directional messages
        if (Math.abs(offsetX) > OFFSET_X_ALLOW) {
          limitedToast(
            toast.warning,
            "moveX",
            offsetX > 0 ? "Move left ↩️" : "Move right ↪️"
          );
        }
        if (Math.abs(offsetY) > OFFSET_Y_ALLOW) {
          limitedToast(
            toast.warning,
            "moveY",
            offsetY > 0 ? "Move up ⬆️" : "Move down ⬇️"
          );
        }
        meshColor = "#FF0000";
      } else {
        // perfectly centered and not turned
        meshColor = "#00FF00";
        setAlignmentPerfect(true);
      }

      // Draw mesh points (colored)
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = meshColor;
      for (let i = 0; i < landmarks.length; i++) {
        const x = landmarks[i].x * canvas.width;
        const y = landmarks[i].y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 0.9, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // optionally draw a subtle contour or connections if you want (not required)
    }

    ctx.restore();
  };

  const handleProceed = () => {
    navigate("/exam");
  };

  const readyToProceed =
    cameraAllowed && fullscreenAllowed && alignmentPerfect && !multipleFaces;

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-gray-100">
      <ToastContainer position="top-center" autoClose={1500} hideProgressBar />

      {/* Card */}
      <div className="flex w-[70%] h-[65vh] bg-gray-900 rounded-xl shadow-lg overflow-hidden border border-gray-800">
        {/* Left: Camera + Mesh */}
        <div className="relative w-[55%] bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute w-full h-full object-cover rounded-lg"
          />
          <canvas
            ref={canvasRef}
            className="absolute w-full h-full rounded-lg"
          />
        </div>

        {/* Right: Info + Buttons */}
        <div className="w-[45%] p-6 flex flex-col items-center justify-center space-y-6 bg-gradient-to-br from-gray-900 to-gray-800">
          <h2 className="text-2xl font-semibold text-white">Pre-Exam Check</h2>
          <p className="text-gray-400 text-center leading-relaxed">
            Ensure only <span className="text-white">one person</span> is
            visible in the camera and your face is centered.
          </p>

          {!cameraAllowed && (
            <button
              onClick={startCamera}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-all"
            >
              Allow Camera
            </button>
          )}

          {!fullscreenAllowed && (
            <button
              onClick={enableFullScreen}
              className="px-6 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-all"
            >
              Enter Fullscreen
            </button>
          )}

          <button
            disabled={!readyToProceed}
            onClick={handleProceed}
            className={`px-8 py-3 rounded-lg text-white font-semibold transition-all duration-300 ${
              readyToProceed
                ? "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30"
                : "bg-gray-600 cursor-not-allowed opacity-50"
            }`}
          >
            Proceed to Exam
          </button>

          {!readyToProceed && (
            <p className="text-red-400 text-sm text-center">
              All checks must pass before you can proceed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Check;
