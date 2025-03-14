"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const quotes = [
  "Buy low, sell high!",
  "Trade with discipline, not emotion.",
  "Risk comes from not knowing what you're doing.",
  "A smooth sea never made a skilled trader.",
  "The trend is your friend until the end."
];

export default function SignIn() {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(randomQuote);
  }, []);

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      {/* Sign-In Container */}
      <motion.div
        whileHover={{
          scale: 1.02,
          boxShadow: "0px 0px 30px rgba(0, 0, 0, 0.4)"
        }}
        transition={{
          type: "spring",
          stiffness: 120,
          damping: 10
        }}
        className="bg-gray-900 bg-opacity-90 p-8 rounded-2xl shadow-xl w-full max-w-md"
      >
        {/* Welcome back header */}
        <motion.h2
          whileHover={{
            scale: 1.05,
            color: "#60a5fa" // Light blue on hover
          }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 10
          }}
          className="text-2xl font-semibold text-center text-white mb-4"
        >
          Welcome Back!
        </motion.h2>
        
        {/* Quote */}
        <motion.p
          whileHover={{
            scale: 1.05,
            color: "#94a3b8" // Slate gray on hover
          }}
          transition={{ type: "spring", stiffness: 100 }}
          className="text-center text-gray-400 italic mb-4"
        >
          {quote}
        </motion.p>

        {/* Email */}
        <motion.div
          whileHover={{
            scale: 1.02,
            borderColor: "#60a5fa" // Light blue border
          }}
          transition={{ type: "spring", stiffness: 100 }}
          className="mb-4"
        >
          <label htmlFor="email" className="block text-gray-300 mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            placeholder="Enter your email"
          />
        </motion.div>

        {/* Password */}
        <motion.div
          whileHover={{
            scale: 1.02,
            borderColor: "#60a5fa"
          }}
          transition={{ type: "spring", stiffness: 100 }}
          className="mb-4"
        >
          <label htmlFor="password" className="block text-gray-300 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            placeholder="Enter your password"
          />
        </motion.div>

        {/* Sign-in Button */}
        <motion.button
          whileHover={{
            scale: 1.05,
            backgroundColor: "#3b82f6", // Blue hover color
            boxShadow: "0px 0px 20px rgba(59, 130, 246, 0.5)" // Soft blue glow
          }}
          transition={{
            type: "spring",
            stiffness: 120,
            damping: 10
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition shadow-md"
        >
          Sign In
        </motion.button>

        {/* Forgot password */}
        <motion.p
          whileHover={{ scale: 1.05, color: "#60a5fa" }}
          transition={{ type: "spring", stiffness: 100 }}
          className="text-center text-gray-400 mt-4"
        >
          Forgot your password?{" "}
          <a href="#" className="text-blue-400 hover:text-blue-500">
            Reset here
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
}
