import React, { useState, useEffect } from 'react';
import TheatreRoom from './components/TheatreRoom';
import { Film, User, Key, CheckCircle, HelpCircle } from 'lucide-react';

// Error Boundary to catch render-time issues in TheatreRoom
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-xl mx-auto bg-red-950/40 border border-red-500/30 text-red-300 rounded-lg mt-10 font-mono">
          <h2 className="text-lg font-bold text-red-200">TheatreRoom Render Crash:</h2>
          <p className="text-xs mt-2 bg-black/40 p-4 rounded border border-red-500/10 overflow-x-auto whitespace-pre-wrap">
            {this.state.error?.stack || this.state.error?.toString()}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded text-xs hover:bg-red-500 font-semibold font-sans transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [userName, setUserName] = useState(() => localStorage.getItem('movie_dekhba_username') || '');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [activeRoomCode, setActiveRoomCode] = useState(null);
  const [error, setError] = useState('');

  // Persist name in localStorage
  useEffect(() => {
    localStorage.setItem('movie_dekhba_username', userName);
  }, [userName]);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    console.log("Create Room Clicked. User:", userName);
    if (!userName.trim()) {
      setError('Please enter a display name first.');
      return;
    }
    setError('');
    setActiveRoomCode('CREATE');
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    console.log("Join Room Clicked. User:", userName, "Code:", roomCodeInput);
    if (!userName.trim()) {
      setError('Please enter a display name first.');
      return;
    }
    if (!roomCodeInput.trim() || roomCodeInput.trim().length !== 6) {
      setError('Please enter a valid 6-digit room code.');
      return;
    }
    setError('');
    setActiveRoomCode(roomCodeInput.trim().toUpperCase());
  };

  const handleLeaveRoom = () => {
    setActiveRoomCode(null);
  };

  // Active Theatre Screen
  if (activeRoomCode) {
    return (
      <ErrorBoundary>
        <TheatreRoom
          roomCode={activeRoomCode}
          userName={userName.trim()}
          onLeave={handleLeaveRoom}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col justify-between text-slate-100 font-sans">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-[#0d1527]/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-md shadow-indigo-600/30">
            <Film className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
            Movie Dekhba
          </span>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-grow flex items-center justify-center p-6 relative">
        {/* Glow Decorators */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="w-full max-w-lg flex flex-col gap-6">
          {/* Main Card */}
          <div className="glass-panel p-8 rounded-2xl shadow-2xl relative overflow-hidden">
            {/* Banner info */}
            <div className="absolute top-0 right-0 left-0 bg-indigo-600/10 border-b border-indigo-500/20 py-2 px-4 flex items-center justify-center gap-1.5 text-xs text-indigo-300">
              <CheckCircle className="h-3.5 w-3.5 text-indigo-400" />
              <span>Zero-Setup Instant Synced Movie Platform</span>
            </div>

            <div className="text-center mt-6 mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-white">Movie Dekhba Lobby</h2>
              <p className="text-slate-400 text-sm mt-2">
                Enter your name to host or join a synchronized watch session.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3.5 text-sm bg-red-950/40 border border-red-500/30 text-red-300 rounded-lg">
                {error}
              </div>
            )}

            {/* Step 1: Input Name */}
            <div className="mb-8">
              <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                Your Display Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full py-3 pl-10 pr-4 rounded-lg glass-input text-sm text-slate-100 font-medium"
                  placeholder="E.g., Alex"
                />
              </div>
            </div>

            {/* Step 2: Action Panels (Grid) */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Host Box */}
              <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between items-center text-center group hover:border-indigo-500/30 transition-all duration-300">
                <div className="text-indigo-400 group-hover:scale-105 transition-transform mb-3">
                  <Film className="h-8 w-8" />
                </div>
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-white">Host a Movie</h4>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                    Create a room and invite a friend.
                  </p>
                </div>
                <button
                  onClick={handleCreateRoom}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-600/15"
                >
                  Create Room
                </button>
              </div>

              {/* Join Box */}
              <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between items-center text-center hover:border-purple-500/30 transition-all duration-300">
                <div className="text-purple-400 mb-3">
                  <Key className="h-8 w-8" />
                </div>
                <div className="mb-4 w-full">
                  <h4 className="text-sm font-bold text-white font-sans">Join Room</h4>
                  <input
                    type="text"
                    maxLength={6}
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    className="w-full mt-2 py-1.5 px-2 bg-slate-950/50 border border-slate-800 rounded-md text-xs font-bold tracking-widest text-center uppercase placeholder:normal-case placeholder:font-medium placeholder:tracking-normal text-purple-300"
                    placeholder="Enter Code"
                  />
                </div>
                <button
                  onClick={handleJoinRoom}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 active:scale-[0.98] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-purple-600/15"
                >
                  Join Room
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="py-4 border-t border-slate-800 bg-[#070b12] text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <span>Movie Dekhba MVP &bull; Synced Movie Lounge</span>
        <HelpCircle className="h-3.5 w-3.5 text-slate-600 hover:text-slate-400 cursor-pointer" />
      </footer>
    </div>
  );
}

export default App;
