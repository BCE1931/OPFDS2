import React, { useReducer } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import fetch_hook from "./fetch_hook";
import { MagicCard } from "@/components/ui/magic-card"; // ✅ same as login

const Signup = () => {
  const reducer = (curstate, action) => {
    switch (action.type) {
      case "ch_email":
        return { ...curstate, email: action.value };
      case "ch_username":
        return { ...curstate, username: action.value };
      case "ch_pwd":
        return { ...curstate, pwd: action.value };
      case "ch_sending":
        return { ...curstate, sending: action.value };
      default:
        return curstate;
    }
  };

  const navigate = useNavigate();
  const { handleFetch } = fetch_hook();
  const [curstate, dispatch] = useReducer(reducer, {
    email: "",
    username: "",
    pwd: "",
    sending: false,
  });

  const handleinput = async () => {
    if (!curstate.username || !curstate.pwd || !curstate.email) {
      alert("Please fill in all fields.");
      return;
    }

    dispatch({ type: "ch_sending", value: true });
    const { ok, data } = await handleFetch(
      `http://localhost:8080/signup`,
      "signup",
      "POST",
      { token: "", required: false },
      {
        username: curstate.username,
        password: curstate.pwd,
        email: curstate.email,
      }
    );

    dispatch({ type: "ch_sending", value: false });

    if (!ok || !data) {
      alert("Error in sending signup details");
      return;
    }

    if (data.message === "ok") {
      localStorage.setItem("username", curstate.username);
      navigate("/exam");
    } else if (data.message === "username already exists") {
      alert("Username already exists");
    } else {
      alert("Unexpected response from server");
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleinput();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <Card className="w-full max-w-sm border-none p-0 shadow-none">
        {/* ✅ Magic Card border wrapper */}
        <MagicCard
          gradientColor="#2e2e2e"
          className="p-0 rounded-2xl bg-[#0a0a0a]/95 backdrop-blur-md shadow-lg"
        >
          <CardHeader className="border-border border-b p-4 pb-4 text-center">
            <CardTitle className="text-2xl font-bold text-white">
              Sign Up
            </CardTitle>
            <CardDescription className="text-gray-400">
              Create your account to get started
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username" className="text-gray-300">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="username"
                  value={curstate.username}
                  onChange={(e) =>
                    dispatch({ type: "ch_username", value: e.target.value })
                  }
                  onKeyDown={handleKeyDown}
                  className="bg-gray-800 text-white border-gray-700 focus:ring-indigo-500"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={curstate.email}
                  onChange={(e) =>
                    dispatch({ type: "ch_email", value: e.target.value })
                  }
                  onKeyDown={handleKeyDown}
                  className="bg-gray-800 text-white border-gray-700 focus:ring-indigo-500"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password" className="text-gray-300">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={curstate.pwd}
                  onChange={(e) =>
                    dispatch({ type: "ch_pwd", value: e.target.value })
                  }
                  onKeyDown={handleKeyDown}
                  className="bg-gray-800 text-white border-gray-700 focus:ring-indigo-500"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-border border-t p-4 pt-4 flex flex-col gap-3">
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              onClick={handleinput}
            >
              Sign Up
            </Button>

            <Button className="w-full bg-gray-800 hover:bg-gray-700 text-white">
              <Link to="/">Sign In</Link>
            </Button>

            <Button className="w-full bg-gray-800 hover:bg-gray-700 text-white mt-2">
              <a
                href="https://github.com/BCE1931/SUMMARY-LLM1"
                target="_blank"
                rel="noopener noreferrer"
              >
                💻 <span>GitHub Code</span>
              </a>
            </Button>
          </CardFooter>
        </MagicCard>
      </Card>
    </div>
  );
};

export default Signup;
