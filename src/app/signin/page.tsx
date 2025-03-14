"use client";

import { useState, useEffect } from "react";

export default function SignIn() {
  const [quote, setQuote] = useState("");
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

  useEffect(() => {
    const interval = setInterval(() => {
      setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, 5000); // 5 seconds interval
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-screen bg-cover bg-center" style={{ backgroundImage: `url('/background-new.jpg')` }}>
      <div className="absolute left-[20%] top-1/3 w-[40%] text-white break-words">
        <h1
          className="text-5xl font-extrabold leading-tight tracking-wide"
          style={{
            fontFamily: "Poppins, sans-serif",
            color: "#68E0CF", // Neon blue-green color
            textShadow: "0 0 15px rgba(104, 224, 207, 0.7)",
          }}
        >
          Your Trading Edge Starts Here
        </h1>
        <p
          className="text-gray-400 mt-2 text-lg"
          style={{
            fontFamily: "Roboto, sans-serif",
            letterSpacing: "0.5px",
            color: "#C1C9E8",
          }}
        >
          Unlock the power of strategy and precision.
        </p>
        
        <p className="mt-4 italic text-yellow-400 font-semibold">
          {quote}
        </p>
      </div>

      {/* Sign In Form */}
      <div className="absolute top-[20%] right-[2%] bg-black/75 shadow-xl text-white p-8 rounded-xl backdrop-blur-lg  
                      border-2 border-transparent animate-glowing-border">
        <h2 className="text-2xl font-bold mb-2">Welcome Back!</h2>
        <p className="text-sm text-gray-400 mb-4">Login using your email ID</p>

        {/* Email Field */}
        <input 
          type="email" 
          placeholder="Email Address" 
          className={`w-full p-3 mb-4 bg-gray-800 border border-gray-700 rounded focus:outline-none 
                      hover:border-blue-400 focus:ring-2 focus:ring-blue-500 transition duration-300`}
        />
        
        {/* Password Field */}
        <input 
          type="password" 
          placeholder="Password" 
          className={`w-full p-3 mb-4 bg-gray-800 border border-gray-700 rounded focus:outline-none 
                      hover:border-blue-400 focus:ring-2 focus:ring-blue-500 transition duration-300`}
        />
        
        {/* Sign In Button */}
        <button 
          className="w-full bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600 
                    transition duration-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          Sign In
        </button>

        <div className="mt-4 text-sm">
          Forgot your password? <a href="#" className="text-blue-400 hover:underline">Reset here</a>
        </div>
      </div>
    </div>
  );
}
