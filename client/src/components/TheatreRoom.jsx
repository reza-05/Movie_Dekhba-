import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Play, Pause, Volume2, Users, Send, Video, 
  ArrowLeft, Copy, Check, MessageSquare, Monitor, ShieldAlert, X, Download
} from 'lucide-react';

function TheatreRoom({ roomCode: initialRoomCode, userName, onLeave }) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

  const [roomCode, setRoomCode] = useState(initialRoomCode === 'CREATE' ? '' : initialRoomCode);
  const [socketConnected, setSocketConnected] = useState(false);
  const [usersList, setUsersList] = useState({});
  
  // Video & Stream states
  const [videoSrc, setVideoSrc] = useState(null);
  const videoSrcRef = useRef(null);

  const updateVideoSrc = (url) => {
    videoSrcRef.current = url;
    setVideoSrc(url);
  };

  const [videoName, setVideoName] = useState('');
  const [isHost, setIsHost] = useState(initialRoomCode === 'CREATE');
  const [bufferStatus, setBufferStatus] = useState('');
  const [transferProgress, setTransferProgress] = useState(0);
  
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
  
  // File Transfer References
  const fileRef = useRef(null);
  const receivedChunks = useRef([]);
  const lastChunkTime = useRef(Date.now());
  const transferActive = useRef(false);
  const onAckChunk = useRef(null);
  const transferOffset = useRef(0);
  const ackedOffset = useRef(0);
  const guestReceivedBytes = useRef(0);

  // 1. Initialize Socket.io Connection & Handshake
  useEffect(() => {
    socket.current = io(backendUrl);

    socket.current.on('connect', () => {
      setSocketConnected(true);
      console.log('Connected to sync server socket');
      
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
      setIsHost(true);
    });

    socket.current.on('room-updated', ({ roomCode: code, users, videoState, fileName, fileSize }) => {
      setRoomCode(code);
      setUsersList(users);
      
      // Guest side: If Host has already chosen a file, start downloading it!
      if (initialRoomCode !== 'CREATE' && fileName && fileSize && !transferActive.current && !videoSrcRef.current) {
        setVideoName(fileName);
        startFileTransferDownload(fileName, fileSize);
      }
      
      // Handle page sync when first joining an active room
      if (videoRef.current && videoState) {
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

    // Listen for Host sharing a movie file metadata
    socket.current.on('share-torrent', ({ fileName, fileSize }) => {
      if (initialRoomCode !== 'CREATE' && !transferActive.current && !videoSrcRef.current) {
        setVideoName(fileName);
        startFileTransferDownload(fileName, fileSize);
      }
    });

    socket.current.on('request-file-stream', () => {
      console.log('Host received file transfer request');
      sendFileDataChunks();
    });

    socket.current.on('ack-chunk', ({ offset }) => {
      if (onAckChunk.current) {
        onAckChunk.current(offset);
      }
    });

    socket.current.on('file-stream-chunk', ({ chunk, offset }) => {
      if (isHost) return; // Only guest receives chunks
      
      receivedChunks.current.push(chunk);
      guestReceivedBytes.current += chunk.byteLength;
      
      // Acknowledge chunk receipt immediately with progress offset to slide the Host's window
      socket.current.emit('ack-chunk', { offset: guestReceivedBytes.current });
      
      // Calculate download speed
      const now = Date.now();
      const duration = (now - lastChunkTime.current) / 1000;
      lastChunkTime.current = now;
      
      const progress = Math.min(100, Math.round((guestReceivedBytes.current / fileSizeRef.current) * 100));
      setTransferProgress(progress);

      const speed = duration > 0 ? (chunk.byteLength / 1024 / 1024 / duration).toFixed(1) : '0.0';
      setBufferStatus(`Receiving movie... (Progress: ${progress}%, Speed: ${speed} MB/s)`);
    });

    socket.current.on('file-stream-end', () => {
      if (isHost) return;
      console.log('File transfer complete. Compiling blob...');
      setBufferStatus('Compiling video file...');

      const blob = new Blob(receivedChunks.current, { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      
      updateVideoSrc(url);
      setBufferStatus('Playback is ready!');
      transferActive.current = false;
    });

    // Playback sync listeners
    socket.current.on('player-play', ({ currentTime }) => {
      if (videoRef.current) {
        isSyncing.current = true;
        if (Math.abs(videoRef.current.currentTime - currentTime) > 0.8) {
          videoRef.current.currentTime = currentTime;
        }
        videoRef.current.play().catch(err => console.warn(err));
      }
    });

    socket.current.on('player-pause', ({ currentTime }) => {
      if (videoRef.current) {
        isSyncing.current = true;
        videoRef.current.pause();
        if (currentTime !== undefined) {
          videoRef.current.currentTime = currentTime;
        }
      }
    });

    socket.current.on('player-seek', ({ currentTime }) => {
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

  // 2. Presence Watchdog
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!socket.current || !socketConnected) return;

      const status = document.visibilityState === 'hidden' ? 'Away' : 'Active';
      socket.current.emit('presence-change', { status });

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

  // Store file size reference for guest speed tracking
  const fileSizeRef = useRef(0);

  // 4. Host File Selection & Transfer Trigger
  const handleHostFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoName(file.name);
      fileRef.current = file;
      
      // Share file info with Guest via server
      socket.current.emit('share-torrent', {
        magnetURI: '', // Leave magnet empty to trigger fallback
        fileName: file.name,
        fileSize: file.size
      });

      // Play local file directly (0% delay and 0% upload cost for Host)
      const url = URL.createObjectURL(file);
      updateVideoSrc(url);
      setBufferStatus('Hosting session active. Playback is local.');
    }
  };

  // 5. Guest File Transfer Request
  const startFileTransferDownload = (name, size) => {
    transferActive.current = true;
    fileSizeRef.current = size;
    guestReceivedBytes.current = 0;
    receivedChunks.current = [];
    lastChunkTime.current = Date.now();
    setTransferProgress(0);

    setBufferStatus('Requesting movie file transfer from Host...');
    
    // Send request to Host
    socket.current.emit('request-file-stream');
  };

  // 6. Host Chunks Sender Loop (Sliding Window Flow Control)
  const sendFileDataChunks = () => {
    const file = fileRef.current;
    if (!file) return;

    setBufferStatus('Transferring movie to Guest...');
    
    transferOffset.current = 0;
    ackedOffset.current = 0;
    const chunkSize = 256 * 1024; // 256KB chunks for WebSocket stability
    const windowSize = 6 * 1024 * 1024; // 6MB sliding window size (optimum for ping RTT vs memory buffer)

    const sendNext = () => {
      if (transferOffset.current >= file.size) {
        return;
      }

      // Keep reading and sending chunks as long as we stay within the sliding window
      while (transferOffset.current - ackedOffset.current < windowSize && transferOffset.current < file.size) {
        const currentOffset = transferOffset.current;
        const slice = file.slice(currentOffset, currentOffset + chunkSize);
        const reader = new FileReader();
        
        reader.onload = (e) => {
          socket.current.emit('file-stream-chunk', {
            chunk: e.target.result,
            offset: currentOffset
          });

          // Check if this is the final chunk of the file
          if (currentOffset + chunkSize >= file.size) {
            socket.current.emit('file-stream-end');
            setBufferStatus('Transfer complete!');
            onAckChunk.current = null;
          }
        };
        reader.readAsArrayBuffer(slice);
        
        transferOffset.current += chunkSize;
      }
    };

    // Callback invoked when Guest acknowledges receiving up to 'guestOffset' bytes
    onAckChunk.current = (guestOffset) => {
      ackedOffset.current = guestOffset;
      sendNext(); // Slide window and resume sending if paused
    };

    // Initial fill of the sliding window
    sendNext();
  };

  // 7. Video Control Hooks (Socket Sync Emits)
  const handleLocalPlay = () => {
    if (isSyncing.current) {
      isSyncing.current = false;
      return;
    }
    if (socket.current && videoRef.current) {
      socket.current.emit('player-play', { currentTime: videoRef.current.currentTime });
    }
  };

  const handleLocalPause = () => {
    if (isSyncing.current) {
      isSyncing.current = false;
      return;
    }
    if (socket.current && videoRef.current) {
      socket.current.emit('player-pause', { currentTime: videoRef.current.currentTime });
    }
  };

  const handleLocalSeeked = () => {
    if (isSyncing.current) {
      isSyncing.current = false;
      return;
    }
    if (socket.current && videoRef.current) {
      socket.current.emit('player-seek', { currentTime: videoRef.current.currentTime });
    }
  };

  // 8. Chat Handler
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket.current) return;

    socket.current.emit('chat-message', chatInput.trim());
    setChatInput('');
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col text-slate-100 font-sans">
      {/* Room Header */}
      <header className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-b border-slate-800 bg-[#0d1425]/70 backdrop-blur-md gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button 
            onClick={onLeave}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-white">Movie Lounge</h2>
              <div className={`h-2.5 w-2.5 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            </div>
            {videoName && (
              <p className="text-xs text-indigo-400 font-medium truncate max-w-xs md:max-w-md" title={videoName}>
                File: {videoName}
              </p>
            )}
          </div>
        </div>

        {/* Room Code */}
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
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Toolbar Info */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/40 text-xs font-semibold text-slate-300 border border-slate-700/50">
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            <span>{Object.keys(usersList).length}/2 Viewers</span>
          </div>

          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all flex items-center gap-1 ${chatOpen ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : ''}`}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs font-semibold hidden md:inline">Chat</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-grow flex flex-col md:flex-row relative overflow-y-auto md:overflow-hidden">
        <div className="flex-grow w-full flex flex-col p-4 md:p-6 items-center justify-center md:overflow-y-auto md:max-h-[calc(100vh-80px)]">
          
          {/* Status Bar */}
          {bufferStatus && (
            <div className="w-full max-w-5xl mb-4 bg-indigo-950/20 border border-indigo-500/20 px-4 py-2.5 rounded-lg flex items-center gap-2.5 text-xs text-indigo-300">
              <Download className="h-4 w-4 text-indigo-400 animate-bounce" />
              <span>{bufferStatus}</span>
            </div>
          )}

          {!videoName && isHost ? (
            /* File Selection Card (Host Only) */
            <div className="w-full max-w-xl glass-panel p-10 rounded-2xl text-center flex flex-col items-center border border-slate-800 relative group overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600"></div>
              
              <div className="bg-indigo-600/10 p-6 rounded-full text-indigo-400 mb-6 shadow-inner">
                <Video className="h-12 w-12" />
              </div>
              
              <h3 className="text-2xl font-extrabold text-white tracking-tight">Select Movie to Host</h3>
              <p className="text-slate-400 text-sm mt-3 px-6 leading-relaxed">
                Choose any movie file (.mp4, .mkv, or .webm) from your computer. 
                Your guest will download it directly from you in real-time.
              </p>

              <label className="mt-8 cursor-pointer group/btn inline-flex items-center justify-center py-3.5 px-7 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-sm font-semibold tracking-wide shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:scale-[1.01]">
                <span>Choose Movie File</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleHostFileChange}
                  className="hidden"
                />
              </label>
            </div>
          ) : !videoName && !isHost ? (
            /* Waiting screen (Guest only) */
            <div className="w-full max-w-xl glass-panel p-10 rounded-2xl text-center flex flex-col items-center border border-slate-800 relative shadow-2xl">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600"></div>
              
              <div className="bg-purple-600/10 p-6 rounded-full text-purple-400 mb-6 shadow-inner animate-pulse">
                <Video className="h-12 w-12" />
              </div>
              
              <h3 className="text-2xl font-extrabold text-white tracking-tight">Waiting for Host...</h3>
              <p className="text-slate-400 text-sm mt-3 px-6 leading-relaxed">
                The host is selecting the movie file. Once they choose, 
                your player will automatically download and start playing.
              </p>
            </div>
          ) : !videoSrc && !isHost ? (
            /* Download Progress Screen for Guest during active transfer */
            <div className="w-full max-w-xl glass-panel p-10 rounded-2xl text-center flex flex-col items-center border border-slate-800 relative shadow-2xl">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 animate-pulse"></div>
              
              <div className="bg-indigo-600/10 p-6 rounded-full text-indigo-400 mb-6">
                <Download className="h-12 w-12 animate-bounce" />
              </div>
              
              <h3 className="text-2xl font-extrabold text-white tracking-tight">Downloading Movie...</h3>
              <p className="text-slate-400 text-sm mt-3 px-6 leading-relaxed truncate max-w-xs md:max-w-md">
                File: {videoName}
              </p>

              {/* Progress Bar Container */}
              <div className="w-full bg-slate-900 border border-slate-800 h-4 rounded-full mt-8 overflow-hidden relative shadow-inner">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-300 ease-out shadow-lg"
                  style={{ width: `${transferProgress}%` }}
                />
              </div>
              <span className="text-indigo-400 font-mono font-bold text-sm mt-3 inline-block">
                {transferProgress}%
              </span>
            </div>
          ) : (
            /* HTML5 Video Player View (Host & Guest) */
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

              <div className="flex items-center justify-between px-2 text-xs">
                <span className="text-slate-400 truncate max-w-xs md:max-w-md">Playing: <strong className="text-slate-200">{videoName}</strong></span>
                {isHost && (
                  <label className="cursor-pointer text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                    Change File
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleHostFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Presence Watchdog status list */}
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
            
            {Object.entries(usersList).some(([sid, up]) => up.status === 'Away' && up.name !== userName) && (
              <div className="mt-4 p-3 bg-amber-950/20 border border-amber-500/20 rounded-lg flex items-center gap-2 text-xs text-amber-300">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span>Partner is currently <strong>Away</strong> (Movie has been paused automatically).</span>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Chat */}
        {chatOpen && (
          <aside className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-slate-800 bg-[#0a101d]/60 backdrop-blur-md flex flex-col shadow-2xl relative z-10 h-[350px] md:h-auto">
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
                      <span className="text-[10px] text-slate-500 font-semibold mb-1 px-1">{msg.sender}</span>
                      
                      <div className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                        isMe 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50'
                      }`}>
                        {msg.text}
                      </div>

                      <span className="text-[9px] text-slate-600 mt-1 px-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

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
