import React, { useEffect, useState } from "react";
import { KeyRound, Fingerprint } from "lucide-react";
import axios from "axios";
import cookies from "js-cookie";

import { API_URL } from "../config/config";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const auth = cookies.get("auth");

    const verifyToken = axios.get(API_URL + "/auth/verify", {
      headers: { Authorization: "Bearer " + auth },
    });

    toast.promise(verifyToken, {
      loading: "Verifying user login status...",
      success: () => {
        navigate("/");
        return "Session active. Redirecting...";
      },
      error: "Session expired. Please log in again.",
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const auth = cookies.get("auth");
      const response = await axios.post(
        API_URL + "/auth/login",
        { password, otp: parseInt(otp) || parseInt("123456") },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + auth,
          },
        }
      );

      const in10Hours = new Date(new Date().getTime() + 10 * 60 * 60 * 1000);
      cookies.set("auth", response.data.token, { expires: in10Hours });

      toast.success("Login successful! Setting up your dashboard...");

      // Navigate based on user status
      if (response.data.updatePassword === false) {
        navigate("/");
      } else {
        navigate("/onboarding");
      }
    } catch (error: any) {
      toast.error("Incorrect password or OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(value);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-lg border border-gray-700">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <Fingerprint className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-white">
            TradeDeck Login
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Enter your credentials to access your account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-md bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="otp"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                OTP
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Fingerprint className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={handleOtpChange}
                  maxLength={6}
                  pattern="\d{6}"
                  disabled={isLoading}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-md bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter 6-digit OTP"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Signing in...</span>
              </div>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;