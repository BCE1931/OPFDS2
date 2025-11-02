import React, { useRef, useEffect, useState } from "react";
import * as faceMesh from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import { initTypeData } from "..";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { questions } from "..";

function ExamWithLookAway() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [lookAwayTime, setLookAwayTime] = useState(0);
  const [examMode, setExamMode] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // 🧹 Reset localStorage on entering exam
  useEffect(() => {
    localStorage.removeItem("typeData");
    initTypeData();
    console.log("✅ Fresh exam started — typeData reset");
  }, []);

  // 🧠 Save selected answer into localStorage
  const handleAnswer = (option) => {
    setAnswers({ ...answers, [currentQuestion]: option });

    let storedData = JSON.parse(localStorage.getItem("typeData")) || {};
    storedData[currentQuestion] = {
      ...(storedData[currentQuestion] || {}),
      questionid: currentQuestion,
      selectedAnswer: option,
    };
    localStorage.setItem("typeData", JSON.stringify(storedData));
  };

  // 🧩 Update look-away time in localStorage
  const updateLookAwayTime = (questionId, extraTime) => {
    let storedData = JSON.parse(localStorage.getItem("typeData")) || {};

    if (!storedData[questionId]) {
      storedData[questionId] = {
        questionid: questionId,
        type: "",
        alreadyhas: false,
        lookawaytime: 0,
      };
    }

    storedData[questionId].lookawaytime =
      (storedData[questionId].lookawaytime || 0) + extraTime;

    localStorage.setItem("typeData", JSON.stringify(storedData));
  };

  // 🧠 FaceMesh + backend loop
  useEffect(() => {
    let interval;

    if (videoRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          const canvas = document.createElement("canvas");
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, "image/jpeg")
          );

          if (!interval) {
            interval = setInterval(async () => {
              try {
                const canvas = document.createElement("canvas");
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(
                  videoRef.current,
                  0,
                  0,
                  canvas.width,
                  canvas.height
                );

                const blob = await new Promise((resolve) =>
                  canvas.toBlob(resolve, "image/jpeg")
                );

                const formData = new FormData();
                formData.append("file", blob, "frame.jpg");

                const res = await fetch("http://127.0.0.1:8000/analyze_face", {
                  method: "POST",
                  body: formData,
                });

                const data = await res.json();
                if (data.lookAway) setLookAwayTime((prev) => prev + 1);
              } catch (err) {
                console.error("Face analysis error:", err);
              }
            }, 1000);
          }
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // 🧩 Warn user based on question type + lookAwayTime
  useEffect(() => {
    const sendQuestionToBackend = async () => {
      const questionText = questions[currentQuestion].question;
      const questionId = currentQuestion;

      try {
        let storedData = JSON.parse(localStorage.getItem("typeData")) || {};

        // 🔹 classify question only once
        if (!storedData[questionId]?.type) {
          const res = await fetch("http://127.0.0.1:8000/classify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: questionText }),
          });

          const data = await res.json();

          storedData[questionId] = {
            ...(storedData[questionId] || {}),
            questionid: questionId,
            type: data.type,
          };

          localStorage.setItem("typeData", JSON.stringify(storedData));
        }

        const data = storedData[questionId];

        // ⏱ 5s warning
        if (lookAwayTime >= 5 && lookAwayTime <= 6) {
          if (data.type === "Theoretical")
            toast.info("Please focus on the screen! (Theoretical Question)");
        }

        // ⏱ 10s warning
        if (lookAwayTime >= 10 && lookAwayTime < 10.2) {
          if (data.type === "Theoretical") {
            toast.info("High Warning! Please focus on the screen!");
          } else if (data.type === "Numerical") {
            toast.error("Please focus on the screen! (Numerical Question)");
          }
        }
      } catch (err) {
        console.error("Backend request failed:", err);
      }
    };

    if (
      (lookAwayTime >= 5 && lookAwayTime < 5.2) ||
      (lookAwayTime >= 10 && lookAwayTime < 10.2)
    ) {
      sendQuestionToBackend();
    }
  }, [lookAwayTime, currentQuestion]);

  // ⏭ Navigation between questions
  const nextQuestion = () => {
    updateLookAwayTime(currentQuestion, lookAwayTime);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setLookAwayTime(0);
    }
  };

  const prevQuestion = () => {
    updateLookAwayTime(currentQuestion, lookAwayTime);
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setLookAwayTime(0);
    }
  };

  // ✅ Submit → show summary popup
  const submitExam = () => {
    const storedData = JSON.parse(localStorage.getItem("typeData")) || {};
    const totalQuestions = questions.length;

    const attempted = Object.values(storedData).filter(
      (q) => q.selectedAnswer && q.selectedAnswer !== ""
    ).length;
    const unattempted = totalQuestions - attempted;

    let score = 0;
    Object.keys(storedData).forEach((key) => {
      const userAns = storedData[key]?.selectedAnswer;
      const correct = questions[key]?.answer;
      if (userAns && userAns === correct) score++;
    });

    const totalLookTime = Object.values(storedData).reduce(
      (sum, q) => sum + (q.lookawaytime || 0),
      0
    );

    const summary = {
      totalQuestions,
      attempted,
      unattempted,
      score,
      totalLookTime,
    };
    setSummaryData(summary);
    setShowSummary(true);
  };

  // ✅ Confirm & Navigate
  const confirmAndNavigate = () => {
    if (summaryData) {
      // ✅ Turn off exam mode in both state and localStorage
      setExamMode(false);
      localStorage.setItem("examMode", "false");
      window.dispatchEvent(new Event("storage"));

      // ✅ Stop the camera feed properly
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop()); // stop each video/audio track
        videoRef.current.srcObject = null;
        console.log("📷 Camera stopped successfully");
      }

      // ✅ Exit fullscreen safely
      if (document.fullscreenElement) {
        document
          .exitFullscreen()
          .catch((err) => console.warn("Error exiting fullscreen:", err));
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }

      // ✅ Wait 200ms for App.jsx to update route view, then navigate
      setTimeout(() => {
        navigate("/analyze", { state: summaryData });
      }, 200);
    }
  };

  // ✅ Enforce fullscreen
  useEffect(() => {
    const requestFullscreen = () => {
      const elem = document.documentElement;
      if (elem.requestFullscreen) elem.requestFullscreen();
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    };

    requestFullscreen();

    const handleFullScreenChange = () => {
      if (!document.fullscreenElement)
        toast.error("⚠️ Please enter fullscreen mode again!");
    };

    document.addEventListener("fullscreenchange", handleFullScreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
  }, []);

  return (
    <div className="h-screen bg-background text-foreground p-4 flex flex-col relative">
      <div className="fixed top-4 right-28 font-bold bg-white text-black px-4 py-2 rounded shadow dark:bg-gray-800 dark:text-white">
        Look Away Time: {lookAwayTime.toFixed(1)}s
      </div>

      {/* Question + Options */}
      <div className="flex flex-1 mt-16 bg-card text-card-foreground shadow rounded overflow-hidden">
        <div className="w-1/2 p-6 border-r border-border flex flex-col bg-card">
          <h2 className="text-xl font-semibold">
            {questions[currentQuestion].question}
          </h2>
        </div>

        <div className="w-1/2 p-6 flex flex-col justify-start space-y-4 bg-card text-card-foreground">
          {questions[currentQuestion].options.map((option, idx) => (
            <label
              key={idx}
              className={`border rounded px-4 py-3 cursor-pointer transition-all 
                hover:bg-accent hover:text-accent-foreground
                ${
                  answers[currentQuestion] === option
                    ? "bg-accent text-accent-foreground border-border"
                    : "bg-card text-card-foreground"
                }`}
            >
              <input
                type="radio"
                value={option}
                checked={answers[currentQuestion] === option}
                onChange={() => handleAnswer(option)}
                className="mr-2"
              />
              {option}
            </label>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-4">
        <button
          onClick={prevQuestion}
          className="bg-gray-500 text-white px-4 py-2 rounded shadow hover:bg-gray-600 transition"
        >
          Prev
        </button>

        {currentQuestion === questions.length - 1 ? (
          <button
            onClick={submitExam}
            className="bg-green-500 text-white px-4 py-2 rounded shadow hover:bg-green-600 transition"
          >
            Submit
          </button>
        ) : (
          <button
            onClick={nextQuestion}
            className="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 transition"
          >
            Next
          </button>
        )}
      </div>

      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* ✅ Summary Popup */}
      {showSummary && summaryData && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 w-[350px] text-center space-y-3">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              📋 Exam Summary
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              <b>Total Questions:</b> {summaryData.totalQuestions}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <b>Attempted:</b> {summaryData.attempted}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <b>Unattempted:</b> {summaryData.unattempted}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <b>Score:</b> {summaryData.score}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <b>Total Look-Away Time:</b> {summaryData.totalLookTime}s
            </p>

            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => setShowSummary(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndNavigate}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                Submit & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExamWithLookAway;
