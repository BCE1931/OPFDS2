import React, { useRef, useEffect, useState } from "react";
import * as faceMesh from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import * as drawingUtils from "@mediapipe/drawing_utils";
import { initTypeData } from "..";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { questions } from "..";

function ExamWithLookAway() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [lookAwayTime, setLookAwayTime] = useState(0);
  const [examMode, setExamMode] = useState(true); // ✅ always true now

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    initTypeData(); // runs once safely
  }, []);

  // Mediapipe setup
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
                if (data.lookAway) {
                  setLookAwayTime((prev) => prev + 1);
                }
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

  useEffect(() => {
    const sendQuestionToBackend = async () => {
      const questionText = questions[currentQuestion].question;
      const questionId = currentQuestion;

      try {
        let storedData = JSON.parse(localStorage.getItem("typeData")) || {};

        if (!storedData[questionId]) {
          const res = await fetch("http://127.0.0.1:8000/classify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: questionText }),
          });

          const data = await res.json();

          storedData[questionId] = {
            questionid: questionId,
            type: data.type,
          };

          localStorage.setItem("typeData", JSON.stringify(storedData));
        }

        const data = storedData[questionId];

        if (lookAwayTime >= 5 && lookAwayTime <= 6) {
          if (data.type === "Theoretical") {
            toast.info("Please focus on the screen! (Theoretical Question)");
          }
        }

        if (lookAwayTime >= 10 && lookAwayTime < 10.2) {
          if (data.type === "Theoretical") {
            toast.info(
              "High Warning! Please focus on the screen! (Theoretical Question)"
            );
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

  const handleAnswer = (option) => {
    setAnswers({ ...answers, [currentQuestion]: option });
  };

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

  const nextQuestion = () => {
    updateLookAwayTime(currentQuestion, lookAwayTime);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setLookAwayTime(0);
    } else {
      navigate("/analyze");
    }
  };

  const prevQuestion = () => {
    updateLookAwayTime(currentQuestion, lookAwayTime);

    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setLookAwayTime(0);
    }
  };

  const submitExam = async () => {
    alert("Exam submitted!");
    console.log("Answers:", answers);
  };

  // ✅ Fullscreen auto-enable and escape detection
  useEffect(() => {
    const requestFullscreen = () => {
      const elem = document.documentElement;
      if (elem.requestFullscreen) elem.requestFullscreen();
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    };

    // automatically enter fullscreen
    requestFullscreen();

    const handleFullScreenChange = () => {
      if (!document.fullscreenElement) {
        // user exited fullscreen manually
        toast.error("⚠️ Please enter fullscreen mode again!");
      }
    };

    document.addEventListener("fullscreenchange", handleFullScreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
    };
  }, []);

  return (
    <div className="h-screen bg-background text-foreground p-4 flex flex-col relative">
      {/* 🗑 Removed: Enter/Exit Exam Mode Buttons */}

      {/* 🔔 Top-center warning if user exits fullscreen */}
      {/* Handled by toast.error inside fullscreenchange listener */}

      {/* 🔘 Look Away Timer */}
      <div className="fixed top-4 right-28 font-bold bg-white text-black px-4 py-2 rounded shadow dark:bg-gray-800 dark:text-white">
        Look Away Time: {lookAwayTime.toFixed(1)}s
      </div>

      {/* Submit Button */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2">
        <button
          onClick={submitExam}
          className="bg-green-500 text-white px-4 py-2 rounded shadow hover:bg-green-600 transition"
        >
          Submit
        </button>
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
        <button
          onClick={nextQuestion}
          className="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 transition"
        >
          Next
        </button>
      </div>

      {/* Hidden video + canvas */}
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default ExamWithLookAway;
