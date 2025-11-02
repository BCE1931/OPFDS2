import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, ListChecks } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();

  const exams = [
    {
      id: 1,
      title: "Online Exam 1",
      totalQuestions: 20,
      time: "15 min",
      highScore: "16 / 20",
    },

    {
      id: 5,
      title: "ReactJS Challenge",
      totalQuestions: 10,
      time: "12 min",
      highScore: "9 / 10",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full px-10 py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-primary">Available Exams</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Choose an exam below to begin your test.
        </p>
      </div>

      {/* Exam Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-10 justify-items-center">
        {exams.map((exam) => (
          <Card
            key={exam.id}
            className="w-[420px] h-[180px] border border-border/60 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl"
          >
            <CardContent className="flex flex-col justify-between h-full py-4 px-6">
              {/* Title */}
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-semibold text-primary">
                  {exam.title}
                </CardTitle>
                <Button
                  size="sm"
                  className="px-5 py-2 rounded-md text-sm font-semibold"
                  onClick={() =>
                    navigate("/check", { state: { examId: exam.id } })
                  }
                >
                  Start
                </Button>
              </div>

              {/* Info */}
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-primary" />
                    <span>Total Questions</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {exam.totalQuestions}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Time</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {exam.time}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span>High Score</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {exam.highScore}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Hero;
