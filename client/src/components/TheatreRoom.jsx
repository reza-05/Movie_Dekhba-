import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Play, Pause, Volume2, Users, Send, Video, 
  ArrowLeft, Copy, Check, MessageSquare, Monitor, ShieldAlert, X 
} from 'lucide-react';

function TheatreRoom({ roomCode: initialRoomCode, userName, onLeave }) {
  const [roomCode, setRoomCode] = useState(initialRoomCode === 'CREATE' ? '' : initialRoomCode);
  const [socketConnected, setSocketConnected] = useState(false);
  const [usersList, setUsersList] = useState({});
  const [videoSrc, setVideoSrc] = useState(null);
  const [videoName, setVideoName] = useState('');
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(true);

  // Copy code feedback state
  const [copied, setCopied] = useState(false);

  // References
  const socket = useRef(null);
  const videoRef = useRef(null);
  const isSyncing = useRef(false);
  const chatEndRef = useRef(null);

  // 1. Initialize Socket.io Connection
  useEffect(() => {
    // Connect to backend server. Fallback to current window origin if needed
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
    socket.current = io(backendUrl);

    socket.current.on('connect', () => {
      setSocketConnected(true);
      console.log('Connected to server socket');
      
      // Perform handshake (create or join)
      if (initialRoomCode === 'CREATE') {
        socket.current.emit('create-room', { name: userName });
      } else {
        socket.current.emit('join-room', {
          roomCode: initialRoomCode,
          name: userName
        });
      }
    });

    socket.current.on('room-created', ({ roomCode: code, users }) => {
      setRoomCode(code);
      setUsersList(users);
    });

    socket.current.on('room-updated', ({ roomCode: code, users, videoState }) => {
      setRoomCode(code);
      setUsersList(users);
      
      // Handle page sync when first joining an active room
      if (videoRef.current && videoState) {
        // Sync time if difference is significant
        if (Math.abs(videoRef.current.currentTime - videoState.currentTime) > 1.5) {
          isSyncing.current = true;
          videoRef.current.currentTime = videoState.currentTime;
        }
      }
    });

    socket.current.on('join-error', (errorMessage) => {
      alert(errorMessage);
      onLeave();
    });

    // Handle incoming synchronization commands
    socket.current.on('player-play', ({ currentTime }) => {
      console.log('PROGRAMMATIC PLAY action at', currentTime);
      if (videoRef.current) {
        isSyncing.current = true;
        if (Math.abs(videoRef.current.currentTime - currentTime) > 0.8) {
          videoRef.current.currentTime = currentTime;
        }
        videoRef.current.play().catch(err => {
          console.warn('Playback blocked by browser auto-play policy:', err);
        });
      }
    });

    socket.current.on('player-pause', ({ currentTime }) => {
      console.log('PROGRAMMATIC PAUSE action at', currentTime);
      if (videoRef.current) {
        isSyncing.current = true;
        videoRef.current.pause();
        if (currentTime !== undefined) {
          videoRef.current.currentTime = currentTime;
        }
      }
    });

    socket.current.on('player-seek', ({ currentTime }) => {
      console.log('PROGRAMMATIC SEEK action to', currentTime);
      if (videoRef.current) {
        isSyncing.current = true;
        videoRef.current.currentTime = currentTime;
      }
    });

    socket.current.on('chat-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [initialRoomCode, userName, onLeave]);

  // 2. Presence Monitor (The Watchdog)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!socket.current || !socketConnected) return;

      const status = document.visibilityState === 'hidden' ? 'Away' : 'Active';
      console.log('Visibility change detected:', status);
      
      // Emit presence event to server
      socket.current.emit('presence-change', { status });

      // If we go Away locally, pause the video locally first so it emits pause
      if (status === 'Away' && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socketConnected]);

  // 3. Auto-scroll Chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatOpen]);

  // 4. File Selection Handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setVideoName(file.name);
      console.log('Local video loaded. Name:', file.name);
    }
  };

  // 5. Local Player Control Interceptors
  const handleLocalPlay = () => {
    if (isSyncing.current) {
      console.log('Play intercept ignored (programmatic change)');
      isSyncing.current = false;
      return;
    }
    if (socket.current && videoRef.current) {
      console.log('Local play action triggered. Emitting player-play...');
      socket.current.emit('player-play', { currentTime: videoRef.current.currentTime });
    }
  };

  const handleLocalPause = () => {
    if (isSyncing.current) {
      console.log('Pause intercept ignored (programmatic change)');
      isSyncing.current = false;
      return;
    }
    if (socket.current && videoRef.current) {
      console.log('Local pause action triggered. Emitting player-pause...');
      socket.current.emit('player-pause', { currentTime: videoRef.current.currentTime });
    }
  };

  const handleLocalSeeked = () => {
    if (isSyncing.current) {
      console.log('Seek intercept ignored (programmatic change)');
      isSyncing.current = false;
      return;
    }
    if (socket.current && videoRef.current) {
      console.log('Local seek action triggered. Emitting player-seek...');
      socket.current.emit('player-seek', { currentTime: videoRef.current.currentTime });
    }
  };

  // 6. Chat Submission Handler
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket.current) return;

    socket.current.emit('chat-message', chatInput.trim());
    setChatInput('');
  };

  // Helper to copy room code
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col text-slate-100 font-sans">
      {/* Room Toolbar */}
      <header className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-b border-slate-800 bg-[#0d1425]/70 backdrop-blur-md gap-4">
        {/* Left Side: Back/Room Metadata */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button 
            onClick={onLeave}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            title="Leave Room"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-white">Movie Lounge</h2>
              <div className={`h-2.5 w-2.5 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} 
                   title={socketConnected ? "Connected to Sync Server" : "Disconnected"} />
            </div>
            {videoName && (
              <p className="text-xs text-indigo-400 font-medium truncate max-w-xs md:max-w-md" title={videoName}>
                File: {videoName}
              </p>
            )}
          </div>
        </div>

        {/* Center: Room Code Display */}
        <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800 w-full sm:w-auto justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Room Code:</span>
            <span className="text-base font-mono font-bold tracking-widest text-indigo-400">
              {roomCode || 'Generating...'}
            </span>
          </div>
          {roomCode && (
            <button
              onClick={copyRoomCode}
              className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors"
              title="Copy Room Code"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Right Side: Quick Toggles */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* User Count */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/40 text-xs font-semibold text-slate-300 border border-slate-700/50">
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            <span>{Object.keys(usersList).length}/2 Viewers</span>
          </div>

          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all flex items-center gap-1 ${chatOpen ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : ''}`}
            title="Toggle Live Chat"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs font-semibold hidden md:inline">Chat</span>
          </button>
        </div>
      </header>

      {/* Workspace Area */}
      <div className="flex-grow flex relative overflow-hidden">
        {/* Main Screening / Player Panel */}
        <div className="flex-grow flex flex-col p-6 items-center justify-center overflow-y-auto max-h-[calc(100vh-80px)]">
          {!videoSrc ? (
            /* Movie File Picker Card (Initial Stage) */
            <div className="w-full max-w-xl glass-panel p-10 rounded-2xl text-center flex flex-col items-center border border-slate-800 relative group overflow-hidden shadow-2xl">
              {/* Background gradient accent */}
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600"></div>
              
              <div className="bg-indigo-600/10 p-6 rounded-full text-indigo-400 group-hover:scale-105 transition-transform mb-6 shadow-inner">
                <Video className="h-12 w-12" />
              </div>
              
              <h3 className="text-2xl font-extrabold text-white tracking-tight">Load Your Local Movie File</h3>
              <p className="text-slate-400 text-sm mt-3 px-6 leading-relaxed">
                Select the exact same movie file as your partner. 
                It will play locally in your browser instantly without any uploading.
              </p>

              <label className="mt-8 cursor-pointer group/btn inline-flex items-center justify-center py-3.5 px-7 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-sm font-semibold tracking-wide shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:scale-[1.01]">
                <span>Choose Movie File</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              
              <div className="mt-8 flex items-center gap-2 bg-slate-900/50 py-2 px-4 rounded-lg border border-slate-800 text-xs text-slate-400">
                <Volume2 className="h-4 w-4 text-slate-500" />
                <span>Supported Formats: MP4, WebM, OGG, MKV (if browser supported)</span>
              </div>
            </div>
          ) : (
            /* HTML5 Synced Video Player Display */
            <div className="w-full max-w-5xl flex flex-col gap-4">
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800 group">
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="w-full h-full object-contain"
                  controls
                  onPlay={handleLocalPlay}
                  onPause={handleLocalPause}
                  onSeeked={handleLocalSeeked}
                />
              </div>

              {/* Local File Reloading Option */}
              <div className="flex items-center justify-between px-2 text-xs">
                <span className="text-slate-400 truncate max-w-xs md:max-w-md">Playing: <strong className="text-slate-200">{videoName}</strong></span>
                <label className="cursor-pointer text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                  Change File
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* User Presence List (The Watchdog Overview) */}
          <div className="w-full max-w-5xl mt-6 border-t border-slate-800/80 pt-6">
            <h4 className="text-xs uppercase font-bold tracking-widest text-slate-500 mb-3 flex items-center gap-1">
              <Monitor className="h-3.5 w-3.5 text-slate-500" />
              <span>Presence Tracking (Watchdog)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(usersList).map(([sid, uProfile]) => {
                const isUserAway = uProfile.status === 'Away';
                const isUserOffline = uProfile.status === 'Offline';
                const isCurrentUser = uProfile.name === userName;
                
                return (
                  <div 
                    key={sid}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      isUserAway 
                        ? 'bg-amber-950/20 border-amber-500/20' 
                        : isUserOffline 
                        ? 'bg-slate-900/30 border-slate-800' 
                        : 'bg-slate-900/50 border-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img 
                          src={`https://api.dicebear.com/7.x/bottts/svg?seed=${uProfile.name}`} 
                          alt={uProfile.name} 
                          className="h-9 w-9 rounded-lg bg-slate-800 border border-slate-700/50"
                        />
                        <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#070b13] ${
                          isUserAway ? 'bg-amber-500' : isUserOffline ? 'bg-slate-600' : 'bg-emerald-500'
                        }`} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-slate-200">
                          {uProfile.name} {isCurrentUser ? '(You)' : ''}
                        </div>
                        <p className="text-xs text-slate-500">Status: {uProfile.status}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isUserAway 
                          ? 'bg-amber-500/10 text-amber-400' 
                          : isUserOffline 
                          ? 'bg-slate-800 text-slate-400' 
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {uProfile.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Away warning banner if any other user goes away */}
            {Object.entries(usersList).some(([sid, up]) => up.status === 'Away' && up.name !== userName) && (
              <div className="mt-4 p-3 bg-amber-950/20 border border-amber-500/20 rounded-lg flex items-center gap-2 text-xs text-amber-300">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span>Partner is currently <strong>Away</strong> (Movie has been paused automatically).</span>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Right Sidebar: Live Chat */}
        {chatOpen && (
          <aside className="w-full md:w-80 lg:w-96 border-l border-slate-800 bg-[#0a101d]/60 backdrop-blur-md flex flex-col shadow-2xl relative z-10">
            {/* Chat Header */}
            <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-400" />
                <span className="font-bold text-sm text-white">Live Theatre Chat</span>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Message Log */}
            <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-3">
              {messages.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <MessageSquare className="h-8 w-8 text-slate-700 mb-2" />
                  <p className="text-xs">No messages yet.</p>
                  <p className="text-[10px] mt-1">Send a message to start conversation!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender === userName;
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                    >
                      {/* Sender Meta */}
                      <span className="text-[10px] text-slate-500 font-semibold mb-1 px-1">{msg.sender}</span>
                      
                      {/* Text Bubble */}
                      <div className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                        isMe 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50'
                      }`}>
                        {msg.text}
                      </div>

                      {/* Time */}
                      <span className="text-[9px] text-slate-600 mt-1 px-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChat} className="p-4 border-t border-slate-800/80 bg-slate-950/20">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type message..."
                  className="flex-grow py-2 px-3 rounded-lg text-xs glass-input"
                />
                <button
                  type="submit"
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors active:scale-95"
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}

export default TheatreRoom;
