import React, { useState, useEffect } from 'react';
import TheatreRoom from './components/TheatreRoom';
import { Film, User, Key, Sparkles, ArrowRight, Play, Volume2, Maximize, MonitorPlay, Users } from 'lucide-react';

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
        <div className="p-6 max-w-xl mx-auto bg-rose-950/20 border border-rose-500/30 text-rose-300 rounded-2xl mt-10 font-mono backdrop-blur-md">
          <h2 className="text-lg font-bold text-rose-200">Lounge Render Crash:</h2>
          <p className="text-xs mt-2 bg-black/40 p-4 rounded-xl border border-rose-500/10 overflow-x-auto whitespace-pre-wrap">
            {this.state.error?.stack || this.state.error?.toString()}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-xl text-xs hover:from-rose-500 hover:to-rose-600 font-semibold font-sans transition-all duration-200 active:scale-[0.98]"
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
    <div className="min-h-screen bg-[#02040a] flex flex-col justify-between text-slate-200 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Top Header/Navbar */}
      <header className="px-6 md:px-12 py-5 flex items-center justify-between border-b border-slate-900/60 bg-[#02040a]/40 backdrop-blur-lg sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-indigo-500 to-violet-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-500/10">
            <Film className="h-5 w-5" />
          </div>
          <span className="text-base font-bold tracking-tight text-white font-sans">
            Movie Dekhba
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-3.5 py-1.5 rounded-full font-bold uppercase tracking-wider">
          <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span>Active Service</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center px-6 py-12 md:py-16 relative overflow-hidden">
        {/* Glowing Background Accents */}
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[350px] md:w-[500px] h-[350px] md:h-[500px] bg-indigo-600/5 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/3 translate-x-1/2 translate-y-1/2 w-[350px] md:w-[500px] h-[350px] md:h-[500px] bg-violet-600/5 rounded-full blur-[80px] -z-10 pointer-events-none"></div>

        <div className="w-full max-w-6xl grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Tagline & Sleek CSS Player Illustration */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.08]">
                Watch movies<br />
                together with<br />
                <span className="bg-gradient-to-r from-indigo-400 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
                  your friends.
                </span>
              </h1>
              
              <p className="text-slate-400 text-sm md:text-base max-w-lg leading-relaxed font-medium">
                Direct high-speed movie rooms for you and your friends. 
                Upload files from your local storage and watch them instantly with no size limits or quality loss.
              </p>
            </div>

            {/* Premium CSS-based Movie Player Mockup */}
            <div className="relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950/40 shadow-2xl group hidden md:block">
              {/* Dynamic glowing gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/10 via-transparent to-violet-950/10 z-0"></div>
              
              {/* Mock Movie Poster Backdrop */}
              <div className="absolute inset-0 bg-[#080d1a] flex items-center justify-center z-0 opacity-40">
                <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 blur-xl animate-pulse"></div>
              </div>

              {/* Top Floating Stats */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-slate-800/60 text-[10px] font-bold text-slate-300">
                  <Film className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Movie Lounge</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-slate-800/60 text-[10px] font-bold text-slate-300">
                  <Users className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                  <span>2/2 Viewers</span>
                </div>
              </div>

              {/* Central Play Button */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="h-14 w-14 rounded-full bg-white text-black flex items-center justify-center shadow-lg shadow-white/10 hover:scale-105 active:scale-95 transition-all cursor-pointer">
                  <Play className="h-6 w-6 fill-current pl-0.5" />
                </div>
              </div>

              {/* Bottom Control Bar */}
              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-slate-800/80 z-10 flex flex-col gap-2">
                {/* Timeline */}
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden relative">
                  <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-indigo-500 to-violet-500 w-[42%] rounded-full shadow-lg"></div>
                </div>
                {/* Actions */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="text-white">01:42:05</span>
                    <span>/</span>
                    <span>02:15:30</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-3.5 w-3.5 text-slate-400 hover:text-white transition-colors" />
                    <Maximize className="h-3.5 w-3.5 text-slate-400 hover:text-white transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Split Control Card */}
          <div className="lg:col-span-5 w-full">
            <div className="glass-panel p-8 rounded-3xl border border-white/[0.04] bg-gradient-to-b from-[#0b0f19]/80 to-[#05070c]/90 shadow-2xl relative">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 rounded-t-3xl"></div>

              <h2 className="text-2xl font-bold tracking-tight text-white mb-1.5">Room Access</h2>
              <p className="text-xs text-slate-400 mb-6">Choose to host a new room or join an existing one.</p>

              {error && (
                <div className="mb-6 p-3.5 text-xs bg-rose-950/20 border border-rose-500/20 text-rose-300 rounded-xl">
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
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full py-3 pl-10 pr-4 rounded-xl glass-input text-xs font-semibold text-white tracking-wide border border-white/[0.06] bg-slate-950/30 focus:border-indigo-500/50 focus:shadow-indigo-500/5 transition-all"
                      placeholder="E.g., Alex"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-900/60 my-6"></div>

                {/* Actions */}
                <div className="space-y-5">
                  {/* Action 1: Create Room */}
                  <button
                    onClick={handleCreateRoom}
                    className="w-full flex items-center justify-between py-3 px-5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20"
                  >
                    <span>Host a New Room</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-grow h-px bg-slate-900/60"></div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">or</span>
                    <div className="flex-grow h-px bg-slate-900/60"></div>
                  </div>

                  {/* Action 2: Join Room */}
                  <div className="flex gap-2.5">
                    <div className="relative flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Key className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        value={roomCodeInput}
                        onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                        className="w-full py-3 pl-9 pr-2 bg-slate-950/20 border border-slate-900 rounded-xl text-xs font-bold tracking-widest text-center uppercase placeholder:normal-case placeholder:font-semibold placeholder:tracking-normal text-violet-300 focus:border-violet-500/50 transition-all"
                        placeholder="Room Code"
                      />
                    </div>
                    <button
                      onClick={handleJoinRoom}
                      className="py-3 px-6 bg-slate-950 hover:bg-slate-900 active:scale-[0.98] text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold transition-all"
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
      <footer className="py-5 border-t border-slate-900 bg-[#02040a] text-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
        <span>&copy; {new Date().getFullYear()} Movie Dekhba &bull; Synced Movie Night</span>
      </footer>
    </div>
  );
}

export default App;
