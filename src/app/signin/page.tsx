"use client";
import { useState, useEffect } from "react";

  const quotes = [
    "Cut your losses quickly. Let your profits run. — Jesse Livermore",
    "The market can stay irrational longer than you can stay solvent. — John Maynard Keynes",
    "Risk comes from not knowing what you’re doing. — Warren Buffett",
    "It’s not whether you’re right or wrong that’s important, but how much money you make when you’re right and how much you lose when you’re wrong. — George Soros",
    "Markets are never wrong, opinions often are. — Jesse Livermore",
    "An investment in knowledge pays the best interest. — Benjamin Franklin",
    "The goal of a successful trader is to make the best trades. Money is secondary. — Alexander Elder",
    "The four most dangerous words in investing are: This time it’s different. — Sir John Templeton",
    "Trade what’s happening… not what you think is gonna happen. — Doug Gregory",
    "There is a time to go long, a time to go short and a time to go fishing. — Jesse Livermore",
    "Price is what you pay. Value is what you get. — Warren Buffett",
    "The market is a device for transferring money from the impatient to the patient. — Warren Buffett",
    "The stock market is filled with individuals who know the price of everything but the value of nothing. — Philip Fisher",
    "The biggest risk is not taking any risk. — Mark Zuckerberg",
    "In investing, what is comfortable is rarely profitable. — Robert Arnott",
    "The goal of a trader is to make the best trades. — Alexander Elder",
    "Buy low, sell high. — Anonymous",
    "Markets can remain irrational longer than you can remain solvent. — John Maynard Keynes",
    "Be fearful when others are greedy, and greedy when others are fearful. — Warren Buffett",
    "Losers average losers. — Paul Tudor Jones",
    "Successful investing is about managing risk, not avoiding it. — Benjamin Graham",
    "There are no free lunches on Wall Street. — Anonymous",
    "Investing should be more like watching paint dry or watching grass grow. — Paul Samuelson",
    "The trend is your friend, until the end when it bends. — Ed Seykota",
    "An expert is someone who has made all the mistakes that can be made in a very narrow field. — Niels Bohr",
    "Trading is very competitive and you have to be able to handle getting your butt kicked. — Paul Tudor Jones",
    "The only thing to do when a person is wrong is to be right by ceasing to be wrong. — Jesse Livermore",
    "Panic selling is never a strategy. — Anonymous",
    "Amateurs think about how much money they can make. Professionals think about how much money they could lose. — Jack Schwager",
    "Adapt or perish. — H.G. Wells",
    "Hope is not a trading strategy. — Anonymous",
    "Don’t fight the trend. — Anonymous",
    "Trade the price, not the noise. — Anonymous",
    "The more you learn, the more you earn. — Warren Buffett",
    "All intelligent investing is value investing. — Charlie Munger"
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
    <div className="relative h-screen w-screen bg-black flex items-center justify-center">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-60"
        style={{
          backgroundImage: `url('/background-new.jpg')`,
        }}
      />

      {/* Left Side - Tagline */}
      <div className="absolute left-[17%] sm:left-[15%] md:left-[18%] lg:left-[20%] top-[16%] sm:top-[14%] md:top-[12%] lg:top-[34%] w-[70%] sm:w-[60%] md:w-[50%] lg:w-[40%] text-white break-words">
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

      {/* Right Side - Sign-In Form */}
      <div className={`w-full max-w-[400px] bg-black/80 shadow-xl text-white 
        p-6 md:p-8 rounded-xl backdrop-blur-lg border-2 border-transparent animate-glowing-border 
        mx-auto lg:ml-auto lg:mr-[8%] lg:mt-[5%] sm:mt-[8%]`}>
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