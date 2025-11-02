"use client";

import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import CountUp from "react-countup";
import { questions } from "..";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

function Analyze() {
  const location = useLocation();
  const examInfo =
    location.state || JSON.parse(localStorage.getItem("analyzeData")) || null;

  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState({
    totalQuestions: 0,
    attempted: 0,
    score: 0,
    totalLookTime: 0,
  });

  useEffect(() => {
    if (examInfo) {
      setSummary({
        totalQuestions: examInfo.totalQuestions || 0,
        attempted: examInfo.attempted || 0,
        score: examInfo.score || 0,
        totalLookTime: examInfo.totalLookTime || 0,
      });
    }

    const stored = JSON.parse(localStorage.getItem("typeData")) || {};
    const questionKeys = Object.keys(stored).filter(
      (key) => !isNaN(Number(key)) && typeof stored[key] === "object"
    );

    const formattedData = questionKeys.map((key) => {
      const q = stored[key];
      let lookTime = Number(q.lookawaytime);
      if (isNaN(lookTime) || lookTime < 1) lookTime = 1;
      if (lookTime > 15) lookTime = 15;

      return {
        name: `Q${Number(key) + 1}`,
        Theoretical: q.type === "Theoretical" ? lookTime : 0,
        Practical: q.type === "Numerical" ? lookTime : 0,
      };
    });

    setChartData(formattedData);
  }, [examInfo]);

  const chartConfig = {
    Theoretical: { label: "Theoretical", color: "#ef4444" },
    Practical: { label: "Practical", color: "#3b82f6" },
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground mt-8 px-6 space-y-8">
      {/* ✅ Exam info header */}
      {examInfo && (
        <div className="text-center">
          <h2 className="text-2xl font-semibold">{examInfo.title}</h2>
          <p className="text-sm text-muted-foreground">
            Username: {examInfo.username} | Exam ID: {examInfo.id}
          </p>
        </div>
      )}

      {/* ✅ Summary Section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        {[
          { label: "Total Questions", value: summary.totalQuestions },
          { label: "Attempted", value: summary.attempted },
          { label: "Score", value: summary.score },
          {
            label: "Look-Away Time (s)",
            value: summary.totalLookTime.toFixed(1),
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="bg-black rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 p-6 flex flex-col items-center justify-center"
          >
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {item.label}
            </h3>
            <p className="text-5xl font-bold">
              <CountUp
                end={parseFloat(item.value)}
                duration={1.2}
                decimals={item.label.includes("Time") ? 1 : 0}
              />
            </p>
          </div>
        ))}
      </div>

      {/* ✅ Chart Section */}
      <Card className="w-full h-[75vh] bg-black shadow-lg rounded-2xl">
        <CardHeader className="flex items-center justify-between border-b py-4 px-6">
          <div>
            <CardTitle>📊 Analyze Results</CardTitle>
            <CardDescription>
              Visualization of look-away time (1–15s) for each question
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-4 pt-4 sm:px-6 sm:pt-6 h-[calc(100%-70px)]">
          {chartData.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 mt-10">
              No data found.
            </p>
          ) : (
            <div className="h-full flex items-center justify-center">
              <ChartContainer
                config={chartConfig}
                className="w-full h-full aspect-auto"
              >
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="fillTheoretical"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={chartConfig.Theoretical.color}
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor={chartConfig.Theoretical.color}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient
                      id="fillPractical"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={chartConfig.Practical.color}
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor={chartConfig.Practical.color}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    domain={[1, 15]}
                    label={{
                      value: "Look Away Time (s)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />

                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(label) => `Question ${label}`}
                        indicator="dot"
                      />
                    }
                  />

                  <Area
                    type="natural"
                    dataKey="Theoretical"
                    stroke={chartConfig.Theoretical.color}
                    fill="url(#fillTheoretical)"
                    stackId="a"
                  />
                  <Area
                    type="natural"
                    dataKey="Practical"
                    stroke={chartConfig.Practical.color}
                    fill="url(#fillPractical)"
                    stackId="a"
                  />

                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Analyze;
