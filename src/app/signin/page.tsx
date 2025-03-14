"use client";
import { useState, useEffect } from "react";

const quotes = [
  "The stock market is filled with individuals who know the price of everything but the value of nothing. — Philip Fisher",
  "Cut your losses quickly. Let your profits run. — Jesse Livermore",
  "An investment in knowledge pays the best interest. — Benjamin Franklin",
  "Know what you own, and know why you own it. — Peter Lynch",
  "The four most dangerous words in investing are: ‘This time it's different.’ — Sir John Templeton",
  "The stock market is a device for transferring money from the impatient to the patient. — Warren Buffett",
  "Risk comes from not knowing what you're doing. — Warren Buffett",
  "Opportunities come infrequently. When it rains gold, put out the bucket, not the thimble. — Warren Buffett",
  "Wide diversification is only required when investors do not understand what they are doing. — Warren Buffett",
  "Time in the market beats timing the market. — Ken Fisher",
];

export default function SignIn() {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex(
        (prevIndex) => (prevIndex + 1) % quotes.length
      );
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

      {/* Tagline Section */}
      <div className="absolute left-[10%] sm:left-[15%] md:left-[18%] lg:left-[20%] top-[20%] md:top-[25%] lg:top-[30%] xl:top-[35%] w-[80%] md:w-[40%] text-white">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-glow"
        style={{
            fontFamily: "Poppins, sans-serif",
            color: "#68E0CF", // Neon blue-green color
            textShadow: "0 0 15px rgba(104, 224, 207, 0.7)",
          }}
      >
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
      <div className="absolute top-[20%] sm:top-[22%] md:top-[25%] lg:top-[20%] right-[5%] w-[90%] sm:w-[60%] md:w-[40%] lg:w-[30%] xl:w-[25%] bg-black/80 shadow-xl text-white p-8 rounded-xl backdrop-blur-lg border-2 border-transparent animate-glowing-border">
        <h2 className="text-2xl font-bold mb-4">Welcome Back!</h2>
        <p className="text-gray-400 mb-6">Login using your email ID</p>

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

        {/* 🔥 Fixed Sign-In Button */}
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