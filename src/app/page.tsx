"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const quotes = [
  "Buy low, sell high.",
  "Risk comes from not knowing what you're doing. – Warren Buffett",
  "The trend is your friend until the end.",
  "Amateurs think about how much they can make. Professionals think about how much they can lose. – Jack Schwager",
  "Do not be embarrassed by your failures. Learn from them and start again. – Richard Branson",
  "The market is a device for transferring money from the impatient to the patient. – Warren Buffett",
  "Hope is not a trading strategy.",
  "Cut your losses quickly. Let your profits run. – Jesse Livermore",
  "Pigs get fat, hogs get slaughtered.",
  "Trade the plan, not your emotions.",
  "Markets are never wrong, opinions often are. – Jesse Livermore",
  "The goal of a successful trader is to make the best trades. Money is secondary. – Alexander Elder",
  "Patience pays. Wait for the right setup.",
  "Successful trading is about minimizing losses, not maximizing profits.",
  "Be fearful when others are greedy, and greedy when others are fearful. – Warren Buffett",
  "Don't chase the market. Let the trade come to you.",
  "Confidence is not ‘I will profit on this trade.’ Confidence is ‘I will be fine if I don’t.’",
  "An investment in knowledge pays the best interest. – Benjamin Franklin",
  "Failing to plan is planning to fail. – Alan Lakein",
  "Being wrong is acceptable. Staying wrong is unacceptable.",
  "Do more of what works, and less of what doesn’t.",
  "Don't let a win go to your head, or a loss to your heart.",
  "It's not whether you’re right or wrong that’s important — it’s how much you make when you're right and how much you lose when you’re wrong. – George Soros",
  "Successful trading requires time, dedication, and patience.",
  "A trading edge means nothing if you don’t have the discipline to stick to it.",
  "Don’t trade for the thrill; trade for the profit.",
  "Don't focus on making money; focus on protecting what you have.",
  "Trade what you see, not what you think.",
  "Professional traders manage risk; amateurs chase profits.",
  "There is no such thing as free money in the market.",
  "A good trade is one that follows the rules — regardless of the outcome.",
  "The market doesn’t care about your opinion; it only cares about price action."
];

export default function SignIn() {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 5000); // Change quote every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="h-screen flex items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage: "url('/background.jpg')",
        filter: "brightness(0.7) contrast(0.9)" // Adjusted for better balance
      }}
    >
      <div
        className="w-full max-w-md p-8 rounded-xl shadow-2xl"
        style={{
          backgroundColor: "rgba(20, 24, 34, 0.92)", // Darker background with better contrast
          backdropFilter: "blur(12px)", // Stronger blur effect
          border: "1px solid rgba(255, 255, 255, 0.1)", // Subtle border for definition
          boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.6)"
        }}
      >
        <h2 className="text-white text-2xl font-bold text-center mb-6">
          Sign In
        </h2>
        <input
          type="email"
          placeholder="Email Address"
          className="w-full bg-[#2c3849] text-white placeholder-gray-400 rounded-md px-4 py-2 mb-4 outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <input
          type="password1123"
          placeholder="password1123"
          className="w-full bg-[#2c3849] text-white placeholder-gray-400 rounded-md px-4 py-2 mb-4 outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        {/* Button with glow effect */}
        <motion.button
          whileHover={{
            scale: 1.05,
            boxShadow: "0px 0px 20px rgba(59, 130, 246, 0.8)"
          }}
          whileTap={{ scale: 0.95 }}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-300"
        >
          Sign In
        </motion.button>
        <p className="text-center text-gray-400 mt-4">
          Forgot your password1123?{" "}
          <a href="#" className="text-blue-400 hover:text-blue-500">
            Reset here
          </a>
        </p>
      </div>

      {/* QUOTE SECTION */}
      <div className="absolute bottom-10 w-full text-center px-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={quoteIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="text-white text-sm md:text-base italic"
          >
            {quotes[quoteIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}