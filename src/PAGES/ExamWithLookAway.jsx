import React, { useRef, useEffect, useState } from "react";
import * as faceMesh from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import * as drawingUtils from "@mediapipe/drawing_utils";
import { initTypeData } from "..";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const questions = [
  // Theoretical / programming
  {
    question: "What is the capital of India?",
    options: ["New Delhi", "Mumbai", "Bangalore", "Kolkata"],
    answer: "New Delhi",
  },
  {
    question: "Which language runs in a web browser?",
    options: ["Java", "C", "Python", "JavaScript"],
    answer: "JavaScript",
  },
  {
    question: "What does CSS stand for?",
    options: [
      "Central Style Sheets",
      "Cascading Style Sheets",
      "Cascading Simple Sheets",
      "Computer Style Sheets",
    ],
    answer: "Cascading Style Sheets",
  },
  {
    question: "HTML stands for?",
    options: [
      "Hyper Text Markup Language",
      "High Text Markup Language",
      "Hyperlink Text Mark Language",
      "Hyperlink and Text Markup Language",
    ],
    answer: "Hyper Text Markup Language",
  },
  {
    question: "Which of the following is a JavaScript framework?",
    options: ["Django", "React", "Laravel", "Flask"],
    answer: "React",
  },
  {
    question: "Which company developed React?",
    options: ["Google", "Facebook", "Microsoft", "Twitter"],
    answer: "Facebook",
  },

  // Numerical questions
  {
    question:
      "If a train travels 60 km in 1.5 hours, what is its speed in km/h?",
    options: ["30", "40", "45", "50"],
    answer: "40",
  },
  {
    question: "What is 25% of 200?",
    options: ["25", "40", "50", "75"],
    answer: "50",
  },
  {
    question: "If x + 5 = 12, what is the value of x?",
    options: ["5", "6", "7", "8"],
    answer: "7",
  },
  {
    question: "The sum of angles in a triangle is?",
    options: ["90°", "180°", "270°", "360°"],
    answer: "180°",
  },
  {
    question: "What is the LCM of 4 and 6?",
    options: ["10", "12", "14", "24"],
    answer: "12",
  },

  // Theoretical / general knowledge
  {
    question: "Which HTML tag is used to create a hyperlink?",
    options: ["<a>", "<link>", "<href>", "<hyperlink>"],
    answer: "<a>",
  },
  {
    question: "Which CSS property is used to change text color?",
    options: ["color", "font-color", "text-color", "fg-color"],
    answer: "color",
  },
  {
    question: "Which SQL command is used to fetch data?",
    options: ["SELECT", "UPDATE", "INSERT", "DELETE"],
    answer: "SELECT",
  },
  {
    question: "Which keyword is used to declare a constant in JavaScript?",
    options: ["const", "let", "var", "static"],
    answer: "const",
  },

  // Numerical / aptitude
  {
    question:
      "A shopkeeper buys an item for $80 and sells for $100. What is the profit %?",
    options: ["20%", "25%", "15%", "10%"],
    answer: "25%",
  },
  {
    question: "If 5x = 45, find x.",
    options: ["5", "7", "9", "10"],
    answer: "9",
  },
  {
    question: "What is the area of a rectangle with length 10 and width 5?",
    options: ["50", "25", "15", "30"],
    answer: "50",
  },
  {
    question: "If a car covers 120 km in 2 hours, what is its speed?",
    options: ["50 km/h", "60 km/h", "55 km/h", "70 km/h"],
    answer: "60 km/h",
  },
  {
    question: "The next number in the series 2, 4, 8, 16, ?",
    options: ["20", "24", "32", "36"],
    answer: "32",
  },
  {
    question: "Which of the following is a backend framework?",
    options: ["React", "Django", "Vue", "Angular"],
    answer: "Django",
  },
];
function ExamWithLookAway() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [lookAwayTime, setLookAwayTime] = useState(0);
  const [examMode, setExamMode] = useState(() => {
    return localStorage.getItem("examMode") === "true";
  });

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
          // Instead of analyzing here, send frame to backend
          const canvas = document.createElement("canvas");
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          // Convert to blob for sending
          const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, "image/jpeg")
          );

          // Send to backend every 1 second
          if (!interval) {
            interval = setInterval(async () => {
              try {
                // 🎥 capture a fresh frame each second
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

                // Convert to blob
                const blob = await new Promise((resolve) =>
                  canvas.toBlob(resolve, "image/jpeg")
                );

                const formData = new FormData();
                formData.append("file", blob, "frame.jpg");

                // send to backend
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
        // ✅ Load existing data (or start with empty object)
        let storedData = JSON.parse(localStorage.getItem("typeData")) || {};

        // ✅ Check if this question type already exists
        if (!storedData[questionId]) {
          // Send request only if we don't have it
          const res = await fetch("http://127.0.0.1:8000/classify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: questionText }),
          });

          const data = await res.json();

          // ✅ Store result in localStorage
          storedData[questionId] = {
            questionid: questionId,
            type: data.type,
          };

          localStorage.setItem("typeData", JSON.stringify(storedData));
        }

        // ✅ Retrieve current question type
        const data = storedData[questionId];

        // 5 seconds logic
        if (lookAwayTime >= 5 && lookAwayTime <= 6) {
          if (data.type === "Theoretical") {
            toast.info("Please focus on the screen! (Theoretical Question)");
          }
        }

        // 10 seconds logic
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

    // Create entry if not present
    if (!storedData[questionId]) {
      storedData[questionId] = {
        questionid: questionId,
        type: "",
        alreadyhas: false,
        lookawaytime: 0,
      };
    }

    // Safely add time
    storedData[questionId].lookawaytime =
      (storedData[questionId].lookawaytime || 0) + extraTime;

    localStorage.setItem("typeData", JSON.stringify(storedData));

    // console.log(
    //   ✅ Updated lookAwayTime for Question ${questionId}:,
    //   storedData[questionId].lookawaytime
    // );
  };

  const nextQuestion = () => {
    updateLookAwayTime(currentQuestion, lookAwayTime);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setLookAwayTime(0);
    } else {
      navigate("/analyze");
      // alert("Exam finished!");
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

  useEffect(() => {
    const handleFullScreenChange = () => {
      if (!document.fullscreenElement) {
        // user exited fullscreen manually
        setExamMode(false);
        localStorage.setItem("examMode", "false");
        window.dispatchEvent(new Event("storage"));
      }
    };

    document.addEventListener("fullscreenchange", handleFullScreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
  }, []);

  return (
    <div className="h-screen bg-background text-foreground p-4 flex flex-col relative">
      {/* 🔘 Exam Mode toggle button (top-right beside Look Away Time) */}
      {!examMode && (
        <div className="fixed top-4 right-80 flex items-center gap-2 z-20">
          <button
            onClick={() => {
              setExamMode(true);
              localStorage.setItem("examMode", "true");
              window.dispatchEvent(new Event("storage"));
              if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch((err) => {
                  console.warn("Fullscreen request failed:", err);
                });
              }
            }}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded shadow transition"
          >
            Enter Exam Mode
          </button>
        </div>
      )}

      {examMode && (
        <div className="fixed top-4 right-80 z-20">
          <button
            onClick={() => {
              setExamMode(false);
              localStorage.setItem("examMode", "false");
              window.dispatchEvent(new Event("storage"));
              if (document.exitFullscreen) {
                document.exitFullscreen().catch((err) => {
                  console.warn("Exit fullscreen failed:", err);
                });
              }
            }}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow transition"
          >
            Exit Exam Mode
          </button>
        </div>
      )}

      {/* Look-away timer – hide in exam mode */}
      {!examMode && (
        <div className="fixed top-4 right-28 font-bold bg-white text-black px-4 py-2 rounded shadow dark:bg-gray-800 dark:text-white">
          Look Away Time: {lookAwayTime.toFixed(1)}s
        </div>
      )}

      {/* Submit button – hide in exam mode */}

      <div className="fixed top-4 left-1/2 transform -translate-x-1/2">
        <button
          onClick={submitExam}
          className="bg-green-500 text-white px-4 py-2 rounded shadow hover:bg-green-600 transition"
        >
          Submit
        </button>
      </div>

      {/* Question + Options container */}
      <div className="flex flex-1 mt-16 bg-card text-card-foreground shadow rounded overflow-hidden">
        {/* Question */}
        <div className="w-1/2 p-6 border-r border-border flex flex-col bg-card">
          <h2 className="text-xl font-semibold">
            {questions[currentQuestion].question}
          </h2>
        </div>

        {/* Options */}
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
                // name={question-${currentQuestion}}
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

      {/* Navigation buttons – hide in exam mode */}

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

      {/* Hidden video for Mediapipe */}
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default ExamWithLookAway;
