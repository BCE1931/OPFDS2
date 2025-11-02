"use client";

import React, { useState, useEffect } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
  const [chartData, setChartData] = useState([]);

  // ✅ Load and format data from localStorage
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("typeData")) || {};
    const questionKeys = Object.keys(stored).filter(
      (key) => !isNaN(Number(key)) && typeof stored[key] === "object"
    );

    const formattedData = questionKeys.map((key) => {
      const q = stored[key];
      let lookTime = Number(q.lookawaytime);

      // ✅ Clean and clamp data between 1s to 15s
      if (isNaN(lookTime) || lookTime < 1) lookTime = 1;
      if (lookTime > 15) lookTime = 15;

      return {
        name: `Q${Number(key) + 1}`,
        Theoretical: q.type === "Theoretical" ? lookTime : 0,
        Practical: q.type === "Practical" ? lookTime : 0,
      };
    });

    setChartData(formattedData);
  }, []);

  const chartConfig = {
    Theoretical: { label: "Theoretical", color: "#ef4444" },
    Practical: { label: "Practical", color: "#3b82f6" },
  };

  return (
    <div className="w-full h-[calc(100vh-64px)] overflow-auto mt-8 px-6">
      {/* 👆 pushes chart slightly below navbar */}
      <Card className="w-full h-full bg-white dark:bg-gray-900 shadow-lg rounded-2xl">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>📊 Analyze Results</CardTitle>
            <CardDescription>
              Visualization of look-away time (1–15s) for each question
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-4 pt-6 sm:px-6 sm:pt-8 h-[calc(100%-100px)]">
          {chartData.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400">
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
                    domain={[1, 15]} // ✅ force Y-axis between 1s–15s
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
