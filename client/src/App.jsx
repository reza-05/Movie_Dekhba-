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
        <div className="p-6 max-w-xl mx-auto bg-rose-950/20 border border-rose-500/30 text-rose-300 rounded-2xl mt-10 font-mono backdrop-blur-md">
          <h2 className="text-lg font-bold text-rose-200">Room Render Crash:</h2>
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

// Premium movie wall catalog containing user-provided posters
const MOVIES_WALL = [
  { img: "/posters/6dasJ58GGFcC62H9KuukAryltUp.jpg" },
  { img: "/posters/6nJ0OUYwNR2jaPXlzPAA3WryiZr.jpg" },
  { img: "/posters/91vIHsL-zjL._AC_UF1000,1000_QL80_.jpg" },
  { img: "/posters/Acwua30iAaIiNTBac68iVZTyYrH.jpg" },
  { img: "/posters/AdkFsbEQyJKB6dJgr6VjoFkujOX.jpg" },
  { img: "/posters/Animal_(2023_film)_poster.jpg" },
  { img: "/posters/Doraemon-_Nobita_and_the_Island_of_Miracles_movie_poster.jpg" },
  { img: "/posters/Ip+Man.webp" },
  { img: "/posters/MV5BMTc5MDE2ODcwNV5BMl5BanBnXkFtZTgwMzI2NzQ2NzM@._V1_FMjpg_UX1000_.jpg" },
  { img: "/posters/MV5BMjA1Nzk0OTM2OF5BMl5BanBnXkFtZTgwNjU2NjEwMDE@._V1_QL75_UX190_CR0,0,190,281_.jpg" },
  { img: "/posters/MV5BMmJiYWI4ZjktMzgyZS00MjBiLThmOTYtZWJmOTUzOTFkMTFiXkEyXkFqcGc@._V1_.jpg" },
  { img: "/posters/MV5BMmMyZjk0MjUtZmEwZi00YmJjLWIyNGQtZDA0NzBjNWJjZjIwXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" },
  { img: "/posters/MV5BYTgyZDhmMTEtZDFhNi00MTc4LTg3NjUtYWJlNGE5Mzk2NzMxXkEyXkFqcGc@._V1_QL75_UX190_CR0,2,190,281_.jpg" },
  { img: "/posters/MV5BYjI0NDQzYmEtNzMwZC00ODA3LTgzZDYtZTk5ODZjY2Y2OTkzXkEyXkFqcGc@._V1_.jpg" },
  { img: "/posters/MV5BYzU2MWQ5NGQtYmNlMC00ZjJkLWJmODItZDM5MDM3YmUyMWJkXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" },
  { img: "/posters/MV5BZGZmOTZjNzUtOTE4OS00OGM3LWJiNGEtZjk4Yzg2M2Q1YzYxXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" },
  { img: "/posters/Tiger_Zinda_Hai_poster.jpg" },
  { img: "/posters/Your_Name_poster.png" },
  { img: "/posters/aXBQD515okXQZmYA89ntXMvSJSd.jpg" },
  { img: "/posters/bJ4Npo2BXaWS5GJGgYcQ8DSORZZ.jpg" },
  { img: "/posters/cPn71YFDENH0JkWUezlsLyWmLfN.jpg" },
  { img: "/posters/cWz28oGV3cSajWdziVQbqrYCmnX.jpg" },
  { img: "/posters/caYipV8vKfj628YKpEk3cHDc2jv.jpg" },
  { img: "/posters/gXfeDMkEcHoYBvtkbU11g3F81b.jpg" },
  { img: "/posters/ga1zJ6UejPIfyL8BA22pK6dqsC8.jpg" },
  { img: "/posters/images (2).jpeg" },
  { img: "/posters/images (3).jpeg" },
  { img: "/posters/images (4).jpeg" },
  { img: "/posters/images (5).jpeg" },
  { img: "/posters/images (6).jpeg" },
  { img: "/posters/images (7).jpeg" },
  { img: "/posters/kOoxkXTYTi4OipM5G97gK9jnYIk.jpg" },
  { img: "/posters/lQ4n23dZsh8v8f4cTbdhJgQPshH.jpg" },
  { img: "/posters/oAk3sPcDYiDfsiQv8bPzntv4s8f.jpg" },
  { img: "/posters/oBYExKI8E3bTzQjPkofhpV2EJon.jpg" },
  { img: "/posters/odIyR46aAX59dvQ1ON4P53ow1aE (1).jpg" },
  { img: "/posters/xGFjhFkqpOpFFUkEQjetKS11AWz.jpg" }
];

function App() {
  const [userName, setUserName] = useState(() => localStorage.getItem('movie_dekhba_username') || '');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [activeRoomCode, setActiveRoomCode] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('host'); // 'host' or 'join'

  // Clear legacy names from local storage automatically
  useEffect(() => {
    const legacyNames = ['soumic', 'anik'];
    if (userName && legacyNames.includes(userName.toLowerCase().trim())) {
      setUserName('');
      localStorage.removeItem('movie_dekhba_username');
    }
  }, [userName]);

  // Persist name in localStorage
  useEffect(() => {
    if (userName) {
      localStorage.setItem('movie_dekhba_username', userName);
    }
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

  // Helper function to render staggered movie cards with actual poster images
  const renderMovieCard = (movie, idx) => (
    <div 
      key={idx}
      className="w-full aspect-[2/3] bg-slate-950 border border-white/[0.05] rounded-xl relative shadow-lg overflow-hidden group select-none transition-transform duration-300 hover:scale-[1.03]"
    >
      <img 
        src={movie.img} 
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
      />
    </div>
  );

  // Set up staggered background scroll lists
  // Base randomized sequence of all 37 posters to avoid adjacent duplicate alignments
  const baseSeq = [
    0, 18, 36, 9, 27, 5, 23, 14, 32, 1, 19, 10, 28, 6, 24, 15, 33, 2, 20, 11, 29, 7, 25, 16, 34, 3, 21, 12, 30, 8, 26, 17, 35, 4, 22, 13, 31
  ];

  // Generate columns shifted by mathematical offsets to guarantee zero horizontal duplicate alignments
  const generateCol = (shift) => {
    const sequence = baseSeq.map(idx => MOVIES_WALL[(idx + shift) % 37]);
    return [...sequence, ...sequence, ...sequence];
  };

  const col1 = generateCol(0);
  const col2 = generateCol(7);
  const col3 = generateCol(14);
  const col4 = generateCol(21);
  const col5 = generateCol(28);

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
    <div className="min-h-screen flex flex-col justify-between text-slate-200 antialiased selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      
      {/* Solid background color container at bottom of z-stack (Fixed to viewport) */}
      <div className="fixed inset-0 bg-[#02040a] -z-30 pointer-events-none" />

      {/* 3D Curved Perspective Movie Grid Background (Fixed and Grid based) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-20 flex justify-center items-center opacity-[0.28] select-none">
        <div 
          className="w-[140%] h-[140%] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          style={{ transform: 'perspective(1200px) rotateX(24deg) rotateY(-10deg) rotateZ(10deg) skewX(-8deg) scale(1.15)' }}
        >
          <div className="flex flex-col gap-4 animate-scroll-up">
            {col1.map((movie, idx) => renderMovieCard(movie, idx))}
          </div>
          <div className="flex flex-col gap-4 animate-scroll-down mt-[-300px]">
            {col2.map((movie, idx) => renderMovieCard(movie, idx))}
          </div>
          <div className="flex flex-col gap-4 animate-scroll-up mt-[100px] hidden sm:flex">
            {col3.map((movie, idx) => renderMovieCard(movie, idx))}
          </div>
          <div className="flex flex-col gap-4 animate-scroll-down mt-[-150px] hidden md:flex">
            {col4.map((movie, idx) => renderMovieCard(movie, idx))}
          </div>
          <div className="flex flex-col gap-4 animate-scroll-up mt-[200px] hidden lg:flex">
            {col5.map((movie, idx) => renderMovieCard(movie, idx))}
          </div>
        </div>
      </div>

      {/* Radial Spotlighting Overlay with Backdrop Blur (Fixed to viewport) */}
      <div 
        className="fixed inset-0 backdrop-blur-[3px] -z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(2, 4, 10, 0.55) 0%, rgba(2, 4, 10, 0.3) 65%, rgba(2, 4, 10, 0.15) 100%)'
        }}
      />

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
      <main className="flex-grow flex items-center justify-center px-4 sm:px-8 py-16 md:py-24 lg:py-32 relative z-10">
        <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-12 lg:gap-16 xl:gap-20 items-center transform -translate-y-4 md:-translate-y-8 lg:-translate-y-12">
          
          {/* Left Column: Clean Responsive Typography */}
          <div className="lg:col-span-7 space-y-6 lg:space-y-8 text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black tracking-normal text-white leading-[1.2]">
              Watch movies<br className="hidden lg:block" />
              together with<br className="hidden lg:block" />
              <span className="bg-gradient-to-r from-indigo-400 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
                your friends
              </span>
            </h1>
            
            <p className="text-slate-400 text-sm sm:text-base md:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed font-semibold">
              Direct high-speed movie rooms for you and your friends. Upload files from your local storage and watch them instantly with no size limits or quality loss.
            </p>
          </div>

          {/* Right Column: Interactive Tabbed Room Access Widget (Centered on Desktop Grid Column) */}
          <div className="lg:col-span-5 w-full flex justify-center">
            <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/[0.04] bg-gradient-to-b from-[#0b0f19]/80 to-[#05070c]/90 shadow-2xl relative transition-all duration-300">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 rounded-t-3xl"></div>

              {/* Step Tab Switcher */}
              <div className="flex bg-[#02040a]/40 p-1.5 rounded-2xl border border-slate-900/60 mb-8 relative">
                <button
                  onClick={() => { setActiveTab('host'); setError(''); }}
                  className={`flex-1 py-2.5 text-center text-xs font-bold rounded-xl transition-all duration-200 ${
                    activeTab === 'host' 
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Host Room
                </button>
                <button
                  onClick={() => { setActiveTab('join'); setError(''); }}
                  className={`flex-1 py-2.5 text-center text-xs font-bold rounded-xl transition-all duration-200 ${
                    activeTab === 'join' 
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Join Room
                </button>
              </div>

              {error && (
                <div className="mb-6 p-3.5 text-xs bg-rose-950/20 border border-rose-500/20 text-rose-300 rounded-xl">
                  {error}
                </div>
              )}

              {/* Tab Content: Host Room Form */}
              {activeTab === 'host' ? (
                <form onSubmit={handleCreateRoom} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2 text-left">
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

                  <button
                    type="submit"
                    className="w-full flex items-center justify-between py-3 px-5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20"
                  >
                    <span>Host a New Room</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                /* Tab Content: Join Room Form */
                <form onSubmit={handleJoinRoom} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2 text-left">
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

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2 text-left">
                      Room Code
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-400">
                        <Key className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={roomCodeInput}
                        onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                        className="w-full py-3 pl-10 pr-4 bg-slate-950/40 border border-indigo-500/30 focus:border-indigo-500 rounded-xl text-xs font-bold tracking-widest text-center uppercase placeholder:normal-case placeholder:font-semibold placeholder:text-slate-500 placeholder:tracking-normal text-indigo-200 focus:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all"
                        placeholder="Enter 6-digit Code"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-between py-3 px-5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20"
                  >
                    <span>Join Room</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* Footer Info */}
      <footer className="py-5 border-t border-slate-900 bg-[#02040a] text-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider relative z-10">
        <span>
          &copy; {new Date().getFullYear()} Movie Dekhba &bull; All Rights Reserved &bull; Developed by{' '}
          <a 
            href="https://github.com/reza-05" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-indigo-400 hover:text-indigo-300 transition-colors hover:underline normal-case font-bold"
          >
            reza-05
          </a>
        </span>
      </footer>
    </div>
  );
}

export default App;
