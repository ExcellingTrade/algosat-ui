"use client";
import { useState, useEffect } from "react";

const quotes = [
  "Cut your losses quickly. Let your profits run. — Jesse Livermore",
  "The market can stay irrational longer than you can stay solvent. — John Maynard Keynes",
  "Risk comes from not knowing what you’re doing. — Warren Buffett",
  // ... (rest of the quotes array remains unchanged)
];

export default function SignIn() {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prevIndex) => (prevIndex + 1) % quotes.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-screen w-screen bg-black">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-60"
        style={{
          backgroundImage: `url('/background-new.jpg')`,
        }}
      />

      {/* Wrapper for Tagline and Form */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between h-full w-full px-4 lg:px-0">
        {/* Tagline Section */}
        <div className="relative lg:absolute lg:left-[20%] lg:top-[34%] w-full lg:w-[40%] text-white break-words">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-glow">
            Your Trading Edge Starts Here
          </h1>
          <p className="text-md md:text-lg text-gray-400 mt-2">
            Unlock the power of strategy and precision.
          </p>
          {/* Quotes Section */}
          <p className="mt-4 italic font-semibold text-yellow-400 text-lg md:text-xl animate-fadeIn">
            {quotes[currentQuoteIndex]}
          </p>
        </div>

        {/* Sign-In Form */}
        <div className="w-full max-w-[400px] bg-black/80 shadow-xl text-white p-6 md:p-8 rounded-xl backdrop-blur-lg border-2 border-transparent animate-glowing-border mt-8 lg:mt-0 lg:ml-auto lg:mr-[8%]">
          <h2 className="text-2xl font-bold mb-4 text-center">Welcome Back!</h2>
          <p className="text-gray-400 mb-6 text-center">
            Login using your email ID
          </p>
          {/* Email Input */}
          <input
            type="email"
            placeholder="Email Address"
            className="w-full p-3 mb-4 bg-gray-800 border border-gray-700 rounded focus:outline-none hover:border-blue-400 focus:ring-2 focus:ring-blue-500 transition duration-300"
          />
          {/* Password Input */}
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 mb-4 bg-gray-800 border border-gray-700 rounded focus:outline-none hover:border-blue-400 focus:ring-2 focus:ring-blue-500 transition duration-300"
          />
          {/* Sign-In Button */}
          <button
            className="w-full p-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:shadow-lg animate-glowing-border"
          >
            Sign In
          </button>
          {/* Forgot Password */}
          <div className="mt-4 text-center">
            <span className="text-gray-400">Forgot your password?</span>{" "}
            <a href="#" className="text-blue-400 hover:underline">
              Reset here
            </a>
          </div>
        </div>
      </div>

      {/* Glowing Border Animation */}
      <style jsx>{`
        .animate-glowing-border {
          animation: glowing 2s infinite;
          border-image-source: linear-gradient(
            to right,
            #00c6ff,
            #0072ff,
            #00c6ff
          );
          border-image-slice: 1;
        }

        @keyframes glowing {
          0% {
            border-width: 2px;
            border-color: transparent;
          }
          25% {
            border-width: 2px;
            border-color: #00c6ff;
          }
          50% {
            border-width: 2px;
            border-color: #0072ff;
          }
          75% {
            border-width: 2px;
            border-color: #00c6ff;
          }
          100% {
            border-width: 2px;
            border-color: transparent;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 1s ease-in-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .text-glow {
          text-shadow: 0 0 10px #00c6ff, 0 0 20px #00c6ff, 0 0 30px #0072ff;
        }
      `}</style>
    </div>
  );
}