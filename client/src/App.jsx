import React, { useState, useEffect } from 'react';
import TheatreRoom from './components/TheatreRoom';
import { Film, User, Key, Sparkles, ArrowRight, Zap, Tv, FolderOpen, Lock, Menu, X, HelpCircle, Info, ChevronRight, Play } from 'lucide-react';

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
  const [roomAccess, setRoomAccess] = useState('public'); // 'public' or 'restricted'
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoActiveTab, setInfoActiveTab] = useState('how-it-works'); // 'how-it-works', 'faq', 'about'

  const [deviceId] = useState(() => {
    let id = localStorage.getItem('movie_dekhba_device_id');
    if (!id) {
      id = 'device_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('movie_dekhba_device_id', id);
    }
    return id;
  });

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
          roomAccess={roomAccess}
          deviceId={deviceId}
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
        <div className="w-[140%] h-[140%] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-cinematic-wall">
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

      {/* Layered Spotlighting & Purple Ambient Glow Overlays (Fixed to viewport) */}
      <div 
        className="fixed inset-0 backdrop-blur-[3px] -z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(2, 4, 10, 0.55) 0%, rgba(2, 4, 10, 0.8) 100%), radial-gradient(circle at 75% 50%, rgba(99, 102, 241, 0.12) 0%, transparent 60%)'
        }}
      />

      {/* Top Header/Navbar */}
      <header className="px-6 md:px-12 py-5 flex items-center justify-between border-b border-white/[0.04] bg-slate-950/45 backdrop-blur-xl sticky top-0 z-50 animate-slide-down">
        <div className="flex items-center gap-1 group cursor-pointer relative">
          {/* Custom Animated Vintage Projector Icon */}
          <div className="w-16 h-12 flex items-center justify-center relative overflow-visible mt-[-2px]">
            <svg className="w-16 h-16 text-indigo-400 overflow-visible absolute top-[-8px] left-0" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="nav-projector-light" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
                  <stop offset="50%" stopColor="#ffffff" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Light Beam (Flickering & Pulsing Animation) */}
              <polygon 
                points="71,51 71,57 115,70 115,38" 
                fill="url(#nav-projector-light)" 
                className="animate-beam-flicker" 
              />

              {/* Projector Body (Deep Slate/Black) */}
              <rect x="35" y="45" width="30" height="18" rx="2" fill="#0f172a" stroke="#475569" strokeWidth="2" />
              <rect x="65" y="48" width="6" height="12" rx="1" fill="#ffffff" stroke="#475569" strokeWidth="1.5" className="animate-pulse" />
              <line x1="38" y1="58" x2="62" y2="58" stroke="#475569" strokeWidth="2" />
              
              {/* Tripod Stand */}
              <line x1="50" y1="63" x2="50" y2="82" stroke="#475569" strokeWidth="2" />
              <line x1="50" y1="63" x2="42" y2="82" stroke="#475569" strokeWidth="2" />
              <line x1="50" y1="63" x2="58" y2="82" stroke="#475569" strokeWidth="2" />
              <circle cx="50" cy="64" r="2" fill="#475569" />

              {/* Reel Arm Brackets */}
              <line x1="50" y1="46" x2="38" y2="34" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
              <line x1="50" y1="46" x2="62" y2="34" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
              
              {/* Animated Reels */}
              <g className="animate-[spin_4s_linear_infinite]" style={{ transformOrigin: '38px 34px' }}>
                <circle cx="38" cy="34" r="12" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                <circle cx="38" cy="34" r="9" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="4 2" />
                <circle cx="38" cy="27" r="1.5" fill="#020617" />
                <circle cx="38" cy="41" r="1.5" fill="#020617" />
                <circle cx="31" cy="34" r="1.5" fill="#020617" />
                <circle cx="45" cy="34" r="1.5" fill="#020617" />
                <circle cx="38" cy="34" r="2" fill="#64748b" />
              </g>
              
              <g className="animate-[spin_4s_linear_infinite]" style={{ transformOrigin: '62px 34px' }}>
                <circle cx="62" cy="34" r="12" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                <circle cx="62" cy="34" r="9" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="4 2" />
                <circle cx="62" cy="27" r="1.5" fill="#020617" />
                <circle cx="62" cy="41" r="1.5" fill="#020617" />
                <circle cx="55" cy="34" r="1.5" fill="#020617" />
                <circle cx="69" cy="34" r="1.5" fill="#020617" />
                <circle cx="62" cy="34" r="2" fill="#64748b" />
              </g>
            </svg>
          </div>
          <span 
            className="text-xs tracking-[0.22em] uppercase font-black animate-text-flicker select-none ml-[-4px]"
            style={{ fontFamily: '"Outfit", sans-serif' }}
          >
            Movie Dekhba
          </span>
        </div>
        <button
          onClick={() => {
            setInfoActiveTab('how-it-works');
            setInfoModalOpen(true);
          }}
          className="relative flex items-center justify-center p-2.5 text-slate-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] rounded-xl hover:border-indigo-500/30 transition-all cursor-pointer shadow-sm select-none"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center px-4 sm:px-8 py-6 sm:py-16 md:py-24 lg:py-32 relative z-10">
        <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-8 lg:gap-16 xl:gap-20 items-center transform -translate-y-2 sm:-translate-y-4 md:-translate-y-8 lg:-translate-y-12">
          
          {/* Left Column: Clean Responsive Typography */}
          <div className="lg:col-span-7 space-y-4 lg:space-y-6 text-center lg:text-left transform lg:-translate-y-4">
            <div className="animate-slide-up [animation-delay:100ms] [animation-fill-mode:forwards]">
              <h1 
                className="font-extrabold text-white"
                style={{
                  fontSize: 'clamp(2.25rem, 6.2vw - 0.5rem, 5rem)',
                  lineHeight: '1.16',
                  letterSpacing: '-0.025em',
                  wordSpacing: '0.09em'
                }}
              >
                Watch movies{" "}<br className="hidden lg:block" />
                together with{" "}<br className="hidden lg:block" />
                <span className="bg-gradient-to-r from-indigo-400 via-indigo-500 to-violet-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(99,102,241,0.18)]">
                  your friends
                </span>
              </h1>
            </div>
            
            <div className="animate-slide-up [animation-delay:250ms] [animation-fill-mode:forwards]">
              <p 
                className="text-slate-400/90 mx-auto lg:mx-0 font-medium"
                style={{
                  fontSize: 'clamp(0.775rem, 0.2vw + 0.75rem, 1rem)',
                  lineHeight: '1.6',
                  maxWidth: '34rem'
                }}
              >
                Direct high-speed movie rooms for you and your friends. Upload files from your local storage and watch them instantly with no size limits or quality loss.
              </p>
            </div>

            {/* Premium Feature Chips */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 pt-3 sm:pt-4 animate-slide-up [animation-delay:400ms] [animation-fill-mode:forwards]">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold text-slate-300 bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.08] hover:border-indigo-500/30 hover:scale-[1.03] hover:text-white cursor-default select-none shadow-sm">
                <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-indigo-400" />
                <span>Instant Sync</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold text-slate-300 bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.08] hover:border-indigo-500/30 hover:scale-[1.03] hover:text-white cursor-default select-none shadow-sm">
                <Tv className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-indigo-400" />
                <span>HD Streaming</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold text-slate-300 bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.08] hover:border-indigo-500/30 hover:scale-[1.03] hover:text-white cursor-default select-none shadow-sm">
                <FolderOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-indigo-400" />
                <span>Local Files</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold text-slate-300 bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.08] hover:border-indigo-500/30 hover:scale-[1.03] hover:text-white cursor-default select-none shadow-sm">
                <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-indigo-400" />
                <span>Private Rooms</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Tabbed Room Access Widget (Centered on Desktop Grid Column) */}
          <div className="lg:col-span-5 w-full flex justify-center animate-scale-up [animation-delay:200ms] [animation-fill-mode:forwards]">
            <div className="w-full max-w-[32rem] glass-panel px-6 py-10 sm:p-10 md:p-12 rounded-3xl border border-white/[0.06] bg-gradient-to-b from-[#0b0f19]/70 to-[#05070c]/85 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative transition-all duration-300 hover:scale-[1.005] hover:shadow-[0_20px_50px_rgba(99,102,241,0.05)]">
              <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-indigo-500/20 via-indigo-500 to-violet-500/20 rounded-t-3xl shadow-[0_0_15px_rgba(99,102,241,0.4)]"></div>

              {/* Step Tab Switcher (iOS/Apple Style Sliding Indicators) */}
              <div className="flex bg-[#02040a]/65 p-1 rounded-2xl border border-white/[0.04] mb-8 relative z-0 overflow-hidden select-none">
                <div 
                  className="absolute top-1 bottom-1 left-1 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-md shadow-indigo-600/10 transition-all duration-300 ease-out z-10"
                  style={{
                    width: 'calc(50% - 4px)',
                    transform: activeTab === 'host' ? 'translateX(0)' : 'translateX(100%)'
                  }}
                />
                <button
                  onClick={() => { setActiveTab('host'); setError(''); }}
                  className={`flex-1 py-3.5 text-center text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 relative z-20 ${
                    activeTab === 'host' ? 'text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Host Room
                </button>
                <button
                  onClick={() => { setActiveTab('join'); setError(''); }}
                  className={`flex-1 py-3.5 text-center text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 relative z-20 ${
                    activeTab === 'join' ? 'text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Join Room
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 text-xs bg-rose-950/20 border border-rose-500/20 text-rose-300 rounded-xl">
                  {error}
                </div>
              )}

              {/* Tab Content: Host Room Form */}
              {activeTab === 'host' ? (
                <form onSubmit={handleCreateRoom} className="space-y-6">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400/90 tracking-widest mb-2.5 text-left">
                      Display Name
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 transition-colors group-focus-within:text-indigo-400">
                        <User className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        required
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full py-[1.125rem] pl-12 pr-4 rounded-2xl glass-input text-base font-semibold text-white tracking-wide border border-white/[0.06] bg-slate-950/40 focus:bg-slate-950/60 focus:border-indigo-500/60 focus:shadow-[0_0_15px_rgba(99,102,241,0.15)] placeholder:text-slate-500 transition-all duration-300"
                        placeholder="E.g., Alex"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400/90 tracking-widest mb-2.5 text-left">
                      Room Access Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-[#02040a]/65 p-1 rounded-2xl border border-white/[0.04]">
                      <button
                        type="button"
                        onClick={() => setRoomAccess('public')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 select-none cursor-pointer ${
                          roomAccess === 'public'
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/10'
                            : 'text-slate-450 hover:text-slate-200'
                        }`}
                      >
                        Instant Entry
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomAccess('restricted')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 select-none cursor-pointer ${
                          roomAccess === 'restricted'
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/10'
                            : 'text-slate-450 hover:text-slate-200'
                        }`}
                      >
                        Host Approval
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-between py-[1.125rem] px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] text-white rounded-2xl text-base font-semibold transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/25 cursor-pointer group"
                  >
                    <span>Host a New Room</span>
                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </form>
              ) : (
                /* Tab Content: Join Room Form */
                <form onSubmit={handleJoinRoom} className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400/90 tracking-widest mb-2.5 text-left">
                      Display Name
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 transition-colors group-focus-within:text-indigo-400">
                        <User className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        required
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full py-[1.125rem] pl-12 pr-4 rounded-2xl glass-input text-base font-semibold text-white tracking-wide border border-white/[0.06] bg-slate-950/40 focus:bg-slate-950/60 focus:border-indigo-500/60 focus:shadow-[0_0_15px_rgba(99,102,241,0.15)] placeholder:text-slate-500 transition-all duration-300"
                        placeholder="E.g., Alex"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400/90 tracking-widest mb-2.5 text-left">
                      Room Code
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-indigo-400/70 transition-colors group-focus-within:text-indigo-400">
                        <Key className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={roomCodeInput}
                        onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                        className="w-full py-[1.125rem] pl-12 pr-4 bg-slate-950/50 border border-indigo-500/30 focus:bg-slate-950/60 focus:border-indigo-500 rounded-2xl text-base font-bold tracking-widest text-center uppercase placeholder:normal-case placeholder:font-medium placeholder:text-slate-500 placeholder:tracking-normal text-indigo-200 focus:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300"
                        placeholder="Enter 6-digit Code"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-between py-[1.125rem] px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] text-white rounded-2xl text-base font-semibold transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/25 cursor-pointer group"
                  >
                    <span>Join Room</span>
                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </form>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* Footer Info (Translucent Glass Panel) */}
      <footer className="py-4 border-t border-white/[0.04] bg-slate-950/35 backdrop-blur-md text-center text-[9px] sm:text-[10px] text-slate-500 font-semibold uppercase tracking-wider relative z-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center items-center gap-1">
          <span>&copy; {new Date().getFullYear()} Movie Dekhba</span>
          <span className="text-slate-700">&bull;</span>
          <span>Developed by</span>
          <a 
            href="https://github.com/reza-05" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-indigo-400 hover:text-indigo-300 transition-colors hover:underline normal-case font-bold ml-0.5"
          >
            reza-05
          </a>
        </div>
      </footer>

      {/* Premium Guide Modal (Hamburger Menu Overlay) */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl h-[85vh] max-h-[48rem] bg-gradient-to-b from-[#0f1422]/90 to-[#07090f]/95 border border-white/[0.06] rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-scale-up relative">
            
            {/* Close Button */}
            <button 
              onClick={() => setInfoModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.04] text-slate-400 hover:text-white transition-all cursor-pointer z-50 animate-pulse"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Left Sidebar (Navigation) */}
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/[0.05] bg-slate-950/35 p-6 flex flex-col gap-6 select-none shrink-0 text-left">
              {/* Title */}
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20 text-indigo-400">
                  <Film className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-extrabold text-sm text-white tracking-wide">Lounge Guide</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Information Desk</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setInfoActiveTab('how-it-works')}
                  className={`flex items-center gap-3 py-3 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    infoActiveTab === 'how-it-works'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-400 hover:text-slate-200 bg-white/[0.01] hover:bg-white/[0.03]'
                  }`}
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>How It Works</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setInfoActiveTab('faq')}
                  className={`flex items-center gap-3 py-3 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    infoActiveTab === 'faq'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-400 hover:text-slate-200 bg-white/[0.01] hover:bg-white/[0.03]'
                  }`}
                >
                  <HelpCircle className="h-4 w-4 shrink-0" />
                  <span>FAQ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInfoActiveTab('about')}
                  className={`flex items-center gap-3 py-3 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    infoActiveTab === 'about'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-400 hover:text-slate-200 bg-white/[0.01] hover:bg-white/[0.03]'
                  }`}
                >
                  <Info className="h-4 w-4 shrink-0" />
                  <span>About Us</span>
                </button>
              </div>
            </div>

            {/* Right Pane (Content Scroll Area) */}
            <div className="flex-grow p-6 sm:p-8 overflow-y-auto select-text text-left">
              {infoActiveTab === 'how-it-works' && (
                <div className="space-y-8 animate-fade-in">
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight mb-2">How It Works</h2>
                    <p className="text-xs text-slate-400">Follow these simple steps to sync and watch movies with friends instantly.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {/* Step 1 */}
                    <div className="bg-white/[0.02] border border-white/[0.04] p-5 rounded-2xl flex flex-col gap-4">
                      <div className="flex items-start gap-4">
                        <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-sm shrink-0">1</div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-200">Host or Join a Lounge</h4>
                          <p className="text-[11px] text-slate-400/90 mt-1">
                            Choose <span className="text-indigo-400 font-semibold">Host Room</span>, enter your display name, choose your access mode, and click create. To join an existing room, select <span className="text-indigo-400 font-semibold">Join Room</span> and enter the 6-character room code.
                          </p>
                        </div>
                      </div>
                      
                      {/* Step 1 Wireframe Visual mockup */}
                      <div className="bg-slate-950/60 border border-white/[0.04] rounded-xl p-3 flex flex-col gap-2 max-w-sm mx-auto w-full select-none">
                        <div className="flex gap-2 p-1 bg-slate-900/60 rounded-lg border border-white/[0.02]">
                          <div className="flex-1 py-1 text-[9px] font-bold text-center bg-indigo-600 text-white rounded">Host Room</div>
                          <div className="flex-1 py-1 text-[9px] font-bold text-center text-slate-500">Join Room</div>
                        </div>
                        <div className="h-6 bg-slate-900/40 border border-white/[0.04] rounded-lg px-2 flex items-center justify-between">
                          <span className="text-[9px] text-slate-500">Display Name</span>
                          <span className="text-[8px] px-1 bg-white/[0.03] rounded text-slate-600">Name</span>
                        </div>
                        <div className="py-1 bg-indigo-600 text-[9px] font-extrabold text-center text-white rounded-lg">Host a New Room</div>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-white/[0.02] border border-white/[0.04] p-5 rounded-2xl flex flex-col gap-4">
                      <div className="flex items-start gap-4">
                        <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-sm shrink-0">2</div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-200">Share Room Code</h4>
                          <p className="text-[11px] text-slate-400/90 mt-1">
                            Once inside the lounge, copy the room code displayed in the header and send it to your friends. If you enabled <span className="text-indigo-400 font-semibold">Host Approval</span> mode, you will receive an alert popup to Approve or Deny incoming guests.
                          </p>
                        </div>
                      </div>

                      {/* Step 2 Wireframe Visual mockup */}
                      <div className="bg-slate-950/60 border border-white/[0.04] rounded-xl p-3 flex items-center justify-between max-w-sm mx-auto w-full select-none">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] font-bold text-slate-400">Room Code: ABCXYZ</span>
                        </div>
                        <div className="py-1 px-2.5 bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold text-indigo-400 rounded-lg">Copy Code</div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-white/[0.02] border border-white/[0.04] p-5 rounded-2xl flex flex-col gap-4">
                      <div className="flex items-start gap-4">
                        <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-sm shrink-0">3</div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-200">Sync & Stream Media</h4>
                          <p className="text-[11px] text-slate-400/90 mt-1">
                            As the host, select your movie source (Drag and Drop a local video file, input a direct cloud streaming URL, or load a YouTube link). Playback actions (Play, Pause, Seek) will automatically sync across everyone's screens instantly!
                          </p>
                        </div>
                      </div>

                      {/* Step 3 Wireframe Visual mockup */}
                      <div className="bg-slate-950/60 border border-white/[0.04] rounded-xl p-3 flex flex-col gap-2 max-w-sm mx-auto w-full select-none">
                        <div className="aspect-[16/9] bg-slate-900/60 rounded-lg flex items-center justify-center border border-white/[0.02] relative overflow-hidden">
                          <Play className="h-6 w-6 text-indigo-500/60 animate-pulse animate-[pulse_2s_infinite]" />
                          <div className="absolute bottom-1 right-2 px-1 py-0.5 bg-[#02040a]/60 text-[8px] text-indigo-400 rounded font-bold">01:45:20</div>
                        </div>
                        <div className="flex items-center justify-between text-[8px] text-slate-500 font-bold px-1">
                          <span>Real-Time Playback Syncing</span>
                          <span className="text-emerald-500">Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {infoActiveTab === 'faq' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight mb-2">Frequently Asked Questions</h2>
                    <p className="text-xs text-slate-400">Quick answers to common questions about movie syncing and streaming operations.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-5 bg-white/[0.01] border border-white/[0.03] rounded-2xl">
                      <h4 className="font-extrabold text-xs text-indigo-400 uppercase tracking-wider mb-2">Q: Do guests need to upload the movie file too?</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        If you are streaming from a direct cloud URL or YouTube, guests will load it instantly. For local files, they stream directly from your browser via peer-to-peer WebRTC channels; for absolute bufferless performance, we recommend guests drag-and-drop the same file locally if they have it, allowing direct instant sync without downloading!
                      </p>
                    </div>

                    <div className="p-5 bg-white/[0.01] border border-white/[0.03] rounded-2xl">
                      <h4 className="font-extrabold text-xs text-indigo-400 uppercase tracking-wider mb-2">Q: Are my media files stored permanently on the server?</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        No. Your local peer-to-peer files never touch any cloud storage. If you choose to upload files to Cloudflare storage to stream to friends, they are protected by temporary pre-signed credentials and are programmatically deleted and recycled after 4 hours to keep the servers light and storage limits clean.
                      </p>
                    </div>

                    <div className="p-5 bg-white/[0.01] border border-white/[0.03] rounded-2xl">
                      <h4 className="font-extrabold text-xs text-indigo-400 uppercase tracking-wider mb-2">Q: Can anyone join my private watch room?</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        No. Only users with the unique 6-character room code can attempt to enter. If you want maximum control, enable "Host Approval" mode when creating the room to review and screen every guest before letting them enter.
                      </p>
                    </div>

                    <div className="p-5 bg-white/[0.01] border border-white/[0.03] rounded-2xl">
                      <h4 className="font-extrabold text-xs text-indigo-400 uppercase tracking-wider mb-2">Q: Can I kick someone out permanently?</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Yes. Room hosts can click the menu icon beside any user in the sidebar and choose to block them. Once kicked, they are blocked by their persistent browser device signature and IP address, meaning they cannot rejoin by simply changing their name.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {infoActiveTab === 'about' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight mb-2">About Us</h2>
                    <p className="text-xs text-slate-400">Discover the technology behind Movie Dekhba and the developers who brought it to life.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-gradient-to-br from-indigo-600/5 to-violet-600/5 border border-indigo-500/10 rounded-2xl space-y-4">
                      <h3 className="font-extrabold text-sm text-slate-200">The Watch Lounge Experience</h3>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Movie Dekhba is a highly-optimized watch party application designed to bring friends together through synchronized cinema. Leveraging standard WebRTC data channels for browser-to-browser coordination and Cloudflare pre-signed storage pipelines, it provides a premium theatre lounge experience directly on the web with zero setup.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-5 bg-white/[0.01] border border-white/[0.03] rounded-2xl space-y-3 text-left">
                        <h4 className="font-extrabold text-xs text-indigo-400 uppercase tracking-wider">Our Philosophy</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          We believe synchronized entertainment should be simple, private, and buffer-free. We build zero-tracking networks that respect user privacy, prioritizing peer-to-peer data pathways instead of server-side data extraction.
                        </p>
                      </div>
                      
                      <div className="p-5 bg-white/[0.01] border border-white/[0.03] rounded-2xl space-y-3 text-left">
                        <h4 className="font-extrabold text-xs text-indigo-400 uppercase tracking-wider">The Engineering</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Developed by Reza. Constructed utilizing modern React architectures, Tailwind CSS responsive layouts, secure Node.js sockets, and AWS S3-compatible cloud storage buckets with automated programmatic garbage collection.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
