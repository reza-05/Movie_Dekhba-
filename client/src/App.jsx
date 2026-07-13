import React, { useState, useEffect } from 'react';
import TheatreRoom from './components/TheatreRoom';
import { Film, User, Key, Sparkles, ArrowRight } from 'lucide-react';

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
        <div className="p-6 max-w-xl mx-auto bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl mt-10 font-mono">
          <h2 className="text-lg font-bold text-red-200">Lounge Render Crash:</h2>
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
    if (!userName.trim()) {
      setError('Please enter a display name to continue.');
      return;
    }
    setError('');
    setActiveRoomCode('CREATE');
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!userName.trim()) {
      setError('Please enter a display name to continue.');
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
    <div className="min-h-screen bg-[#030712] flex flex-col justify-between text-slate-200 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Top Header/Navbar */}
      <header className="px-6 md:px-12 py-5 flex items-center justify-between border-b border-slate-900 bg-[#030712]/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-tr from-indigo-500 to-violet-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
            <Film className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white font-sans">
            Movie Dekhba
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/50 border border-slate-800/80 px-3.5 py-1.5 rounded-full">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold">Lounge Service Active</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center px-6 py-12 md:py-20 relative overflow-hidden">
        {/* Glowing Background Accents */}
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-indigo-600/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
        <div className="absolute bottom-1/3 right-1/3 translate-x-1/2 translate-y-1/2 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-violet-600/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

        <div className="w-full max-w-5xl grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Premium Pitch / Copy */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Sparkles className="h-3 w-3" />
              <span>Direct Link Sharing</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
              Watch movies.<br />
              Together.<br />
              <span className="bg-gradient-to-r from-indigo-400 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
                In perfect sync.
              </span>
            </h1>
            
            <p className="text-slate-400 text-sm md:text-base max-w-lg leading-relaxed">
              Experience zero-lag, high-quality movie sessions with your friends. 
              Upload files from your local storage and stream them instantly in full audio and video resolution.
            </p>
          </div>

          {/* Right Column: Split Control Card */}
          <div className="lg:col-span-5 w-full">
            <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600"></div>

              <h2 className="text-xl font-bold tracking-tight text-white mb-2">Lobby Access</h2>
              <p className="text-xs text-slate-400 mb-6">Enter your name and choose to host or join a lounge.</p>

              {error && (
                <div className="mb-6 p-3 text-xs bg-rose-950/20 border border-rose-500/20 text-rose-300 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                {/* Input: Name */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
                    Display Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4.5 w-4.5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full py-2.5 pl-9 pr-4 rounded-xl glass-input text-xs font-semibold text-white tracking-wide"
                      placeholder="E.g., Alex"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-900 my-6"></div>

                {/* Split Action Sections */}
                <div className="space-y-4">
                  {/* Action 1: Create Lounge */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleCreateRoom}
                      className="w-full flex items-center justify-between py-3 px-5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20"
                    >
                      <span>Host a New Lounge</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Divider line with OR */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-grow h-px bg-slate-900"></div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">or</span>
                    <div className="flex-grow h-px bg-slate-900"></div>
                  </div>

                  {/* Action 2: Join Lounge */}
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Key className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        value={roomCodeInput}
                        onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                        className="w-full py-2.5 pl-9 pr-2 bg-[#1f2937]/20 border border-slate-800 rounded-xl text-xs font-bold tracking-widest text-center uppercase placeholder:normal-case placeholder:font-semibold placeholder:tracking-normal text-violet-300"
                        placeholder="Lounge Code"
                      />
                    </div>
                    <button
                      onClick={handleJoinRoom}
                      className="py-2.5 px-6 bg-slate-900 hover:bg-slate-850 active:scale-[0.99] text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold transition-all"
                    >
                      Join
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer Info */}
      <footer className="py-5 border-t border-slate-900 bg-[#030712] text-center text-[10px] text-slate-500">
        <span>&copy; {new Date().getFullYear()} Movie Dekhba &bull; Synced Movie Night Lounge</span>
      </footer>
    </div>
  );
}

export default App;
