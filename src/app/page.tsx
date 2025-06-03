export default function HomePage() {
  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold">AlgoSat Trading System</h1>
        <p className="mt-4">
          <a href="/login" className="text-blue-400 hover:underline">
            Go to Login
          </a>
        </p>
      </div>
    </div>
  );
}