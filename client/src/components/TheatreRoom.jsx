import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Play, Pause, Volume2, Users, Send, Video, 
  ArrowLeft, Copy, Check, MessageSquare, Monitor, ShieldAlert, X, Download, Sparkles,
  RotateCcw, RotateCw, Maximize2, Minimize2, Subtitles, ChevronLeft, ChevronRight,
  MoreVertical, ChevronUp, ChevronDown, Smile, Search
} from 'lucide-react';

function TheatreRoom({ roomCode: initialRoomCode, userName, roomAccess, deviceId, onLeave }) {
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
  const [hostId, setHostId] = useState('');
  const [isBanned, setIsBanned] = useState(false);
  const [isKicked, setIsKicked] = useState(false);
  const [joinRequestStatus, setJoinRequestStatus] = useState(null); // null, 'sending', 'sent', 'denied'
  const [joinRequests, setJoinRequests] = useState([]); // [{ name, requesterSocketId, roomCode }]
  const [usersExpanded, setUsersExpanded] = useState(false);
  const [bufferStatus, setBufferStatus] = useState('');
  const [transferProgress, setTransferProgress] = useState(0);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState('emojis'); // 'emojis', 'gifs'
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [gifsList, setGifsList] = useState([]);
  const [loadingGifs, setLoadingGifs] = useState(false);

  // Copy code feedback state
  const [copied, setCopied] = useState(false);
  const [showReadyModal, setShowReadyModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeInput, setYoutubeInput] = useState('');
  const youtubePlayerRef = useRef(null);
  const isRespondingToSocket = useRef(false);

  // Custom Player Controls State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef(null);

  const [guestProgress, setGuestProgress] = useState(0);
  const [isGuestReady, setIsGuestReady] = useState(false);

  const [activeToast, setActiveToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const [isR2Enabled, setIsR2Enabled] = useState(false);
  const [isUploadingCloud, setIsUploadingCloud] = useState(false);

  const [playerNotification, setPlayerNotification] = useState('');
  const playerNotificationTimeoutRef = useRef(null);
  const isSeekingFromSocket = useRef(false);

  const showPlayerNotification = (text) => {
    setPlayerNotification(text);
    if (playerNotificationTimeoutRef.current) {
      clearTimeout(playerNotificationTimeoutRef.current);
    }
    playerNotificationTimeoutRef.current = setTimeout(() => {
      setPlayerNotification('');
    }, 3000);
  };

  const initialVideoState = useRef(null);

  const [activeDropdownUser, setActiveDropdownUser] = useState(null);

  const getUserAvatarSVG = (name, index, customClass = "h-9 w-9") => {
    // Generate a simple hash from the username
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    // Dynamic distinct colors for premium look
    const colors = [
      { stroke: '#fda4af', eyes: '#f43f5e' }, // Pink
      { stroke: '#fde047', eyes: '#ea580c' }, // Orange/Amber
      { stroke: '#6ee7b7', eyes: '#059669' }, // Emerald/Teal
      { stroke: '#93c5fd', eyes: '#2563eb' }, // Blue
      { stroke: '#d8b4fe', eyes: '#7c3aed' }, // Purple
      { stroke: '#67e8f9', eyes: '#0891b2' }, // Cyan/Sky
      { stroke: '#f0abfc', eyes: '#c026d3' }, // Fuchsia
      { stroke: '#bef264', eyes: '#4d7c0f' }  // Lime
    ];

    // Use list index if provided, fallback to username hash to prevent collisions
    const activeIndex = index !== undefined && index !== -1 ? index : hash;
    const color = colors[activeIndex % colors.length];
    
    // Choose robot body/face style based on hash
    const bodyStyles = [
      // Style 0: Classic Square Face
      <g key="sq">
        <rect x="25" y="30" width="50" height="40" rx="8" fill="url(#bot-grad)" stroke={color.stroke} strokeWidth="3" />
        <rect x="35" y="42" width="10" height="10" rx="2" fill="#ffffff" />
        <rect x="55" y="42" width="10" height="10" rx="2" fill="#ffffff" />
        <circle cx="40" cy="47" r="3" fill={color.eyes} />
        <circle cx="60" cy="47" r="3" fill={color.eyes} />
        <path d="M 40 60 Q 50 66 60 60" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>,
      // Style 1: Cyber Visor Face
      <g key="cy">
        <rect x="25" y="30" width="50" height="40" rx="8" fill="url(#bot-grad)" stroke={color.stroke} strokeWidth="3" />
        <rect x="30" y="42" width="40" height="10" rx="3" fill="#0f172a" stroke={color.stroke} strokeWidth="1.5" />
        <line x1="34" y1="47" x2="66" y2="47" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
        <path d="M 44 60 H 56" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
      </g>,
      // Style 2: Cute Round Face
      <g key="rd">
        <circle cx="50" cy="50" r="22" fill="url(#bot-grad)" stroke={color.stroke} strokeWidth="3" />
        <ellipse cx="38" cy="46" rx="5" ry="7" fill="#ffffff" />
        <ellipse cx="62" cy="46" rx="5" ry="7" fill="#ffffff" />
        <circle cx="38" cy="46" r="2.5" fill={color.eyes} />
        <circle cx="62" cy="46" r="2.5" fill={color.eyes} />
        <path d="M 45 58 Q 50 62 55 58" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </g>,
      // Style 3: Vintage TV Screen
      <g key="tv">
        <rect x="22" y="32" width="56" height="36" rx="4" fill="url(#bot-grad)" stroke={color.stroke} strokeWidth="3" />
        <line x1="50" y1="32" x2="40" y2="18" stroke={color.stroke} strokeWidth="2" />
        <line x1="50" y1="32" x2="60" y2="18" stroke={color.stroke} strokeWidth="2" />
        <rect x="30" y="38" width="40" height="22" rx="2" fill="#0f172a" />
        <circle cx="40" cy="49" r="3.5" fill={color.eyes} />
        <circle cx="60" cy="49" r="3.5" fill={color.eyes} />
        <line x1="45" y1="50" x2="55" y2="50" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      </g>
    ];

    const bodyStyle = bodyStyles[activeIndex % bodyStyles.length];

    return (
      <svg className={`${customClass} rounded-lg bg-slate-950 border border-slate-800/80 p-0.5 shrink-0`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bot-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        
        {/* Antennas / Ears */}
        <circle cx="16" cy="50" r="3.5" fill={color.eyes} />
        <circle cx="84" cy="50" r="3.5" fill={color.eyes} />
        <line x1="16" y1="50" x2="26" y2="50" stroke={color.stroke} strokeWidth="2" />
        <line x1="84" y1="50" x2="74" y2="50" stroke={color.stroke} strokeWidth="2" />
        
        {bodyStyle}
      </svg>
    );
  };

  // References
  const socket = useRef(null);
  const videoRef = useRef(null);
  const isSyncing = useRef(false);
  const chatEndRef = useRef(null);
  
  // File Transfer References
  const fileRef = useRef(null);
  const receivedChunksMap = useRef({});
  const lastChunkTime = useRef(Date.now());
  const transferActive = useRef(false);
  const onAckChunk = useRef(null);
  const transferOffset = useRef(0);
  const ackedOffset = useRef(0);
  const guestReceivedBytes = useRef(0);

  // Debounced Giphy GIF search hook
  useEffect(() => {
    if (!showPicker || pickerTab !== 'gifs') return;
    
    const fetchGifs = async () => {
      setLoadingGifs(true);
      try {
        const query = gifSearchQuery.trim() || 'popcorn';
        const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=LiyvJg9tGxV4aRc8tsDc45ZpqoZ6x8Gc&q=${encodeURIComponent(query)}&limit=12&rating=g`);
        const data = await res.json();
        if (data && data.data) {
          const urls = data.data.map(g => g.images.fixed_height_small.url);
          setGifsList(urls);
        }
      } catch (err) {
        console.error('Error fetching GIFs from Giphy:', err);
      } finally {
        setLoadingGifs(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchGifs();
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [gifSearchQuery, pickerTab, showPicker]);

  // 1. Initialize Socket.io Connection & Handshake
  useEffect(() => {
    socket.current = io(backendUrl);

    socket.current.on('connect', () => {
      setSocketConnected(true);
      console.log('Connected to sync server socket');
      
      if (initialRoomCode === 'CREATE') {
        socket.current.emit('create-room', { name: userName, accessType: roomAccess });
      } else {
        socket.current.emit('join-room', {
          roomCode: initialRoomCode,
          name: userName,
          deviceId: deviceId
        });
      }
    });

    socket.current.on('room-created', ({ roomCode: code, users, hostId: serverHostId }) => {
      setRoomCode(code);
      setUsersList(users);
      setHostId(serverHostId);
      setIsHost(serverHostId === socket.current.id);
    });

    socket.current.on('chat-history', (history) => {
      setMessages(history);
    });

    socket.current.on('room-updated', ({ roomCode: code, users, hostId: serverHostId, videoState, fileName, fileSize, youtubeUrl: sharedYtUrl, cloudUrl }) => {
      setRoomCode(code);
      setUsersList(users);
      setHostId(serverHostId);
      const currentIsHost = serverHostId === socket.current.id;
      setIsHost(currentIsHost);
      
      // Host side readiness state management
      if (currentIsHost) {
        if (Object.keys(users).length < 2) {
          setIsGuestReady(false);
          setGuestProgress(0);
        } else if (fileName) {
          // Wait for guest if they haven't reported ready yet
          if (guestProgress < 100) {
            setIsGuestReady(false);
          }
        } else {
          setIsGuestReady(true);
          setGuestProgress(100);
        }
      }
      
      // Store initial videoState for late-joining Guest sync
      if (videoState) {
        initialVideoState.current = videoState;
      }
      
      // Guest side: If Host has already chosen a file or YouTube stream, start it!
      if (!currentIsHost && fileName && !videoSrcRef.current) {
        setVideoName(fileName);
        if (sharedYtUrl) {
          setYoutubeUrl(sharedYtUrl);
          updateVideoSrc('YOUTUBE');
          transferActive.current = false;
        } else if (cloudUrl) {
          setYoutubeUrl('');
          updateVideoSrc(cloudUrl);
          socket.current.emit('player-ready');
        } else if (fileSize && !transferActive.current) {
          startFileTransferDownload(fileName, fileSize);
        }
      }
    });

    socket.current.on('join-error', (errorMessage) => {
      alert(errorMessage);
      onLeave();
    });

    socket.current.on('banned-error', ({ message }) => {
      setIsBanned(true);
      setJoinRequestStatus(null);
    });

    socket.current.on('waiting-approval', () => {
      setJoinRequestStatus('waiting');
    });

    socket.current.on('join-request-approved', () => {
      setIsBanned(false);
      setJoinRequestStatus('approved');
      if (socket.current) {
        socket.current.emit('join-room', {
          roomCode: initialRoomCode,
          name: userName,
          deviceId: deviceId
        });
      }
    });

    socket.current.on('join-request-denied', () => {
      setJoinRequestStatus('denied');
    });

    socket.current.on('kicked-from-room', () => {
      setIsKicked(true);
    });

    socket.current.on('join-request-received', ({ name, requesterSocketId }) => {
      setJoinRequests(prev => {
        // Avoid duplicate requests in UI
        if (prev.some(r => r.requesterSocketId === requesterSocketId)) return prev;
        return [...prev, { name, requesterSocketId }];
      });
    });

    // Listen for Host sharing a movie file metadata
    socket.current.on('share-torrent', ({ fileName, fileSize, youtubeUrl: sharedYtUrl, cloudUrl }) => {
      const currentIsHost = socket.current && hostId === socket.current.id;
      if (!currentIsHost) {
        // Reset local stream transfer caches
        transferActive.current = false;
        receivedChunksMap.current = {};
        guestReceivedBytes.current = 0;
        setTransferProgress(0);
        
        setVideoName(fileName);
        if (sharedYtUrl) {
          setYoutubeUrl(sharedYtUrl);
          updateVideoSrc('YOUTUBE');
        } else if (cloudUrl) {
          setYoutubeUrl('');
          updateVideoSrc(cloudUrl);
          socket.current.emit('player-ready');
        } else {
          setYoutubeUrl('');
          startFileTransferDownload(fileName, fileSize);
        }
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
      
      receivedChunksMap.current[offset] = chunk;
      guestReceivedBytes.current += chunk.byteLength;
      
      // Acknowledge chunk receipt immediately with progress offset to slide the Host's window
      socket.current.emit('ack-chunk', { offset: guestReceivedBytes.current });
      
      // Calculate download speed
      const now = Date.now();
      const duration = (now - lastChunkTime.current) / 1000;
      lastChunkTime.current = now;
      
      const progress = Math.min(100, Math.round((guestReceivedBytes.current / fileSizeRef.current) * 100));
      setTransferProgress(progress);
      socket.current.emit('transfer-progress', { progress });

      const speed = duration > 0 ? (chunk.byteLength / 1024 / 1024 / duration).toFixed(1) : '0.0';
      setBufferStatus(`Receiving movie... (Progress: ${progress}%, Speed: ${speed} MB/s)`);
    });

    socket.current.on('file-stream-end', () => {
      if (isHost) return;
      console.log('File transfer complete. Compiling blob...');
      setBufferStatus('Compiling video file...');

      // Sort chunks by their offset to guarantee correct sequential assembly
      const sortedOffsets = Object.keys(receivedChunksMap.current).map(Number).sort((a, b) => a - b);
      const sortedChunks = sortedOffsets.map(off => receivedChunksMap.current[off]);

      const blob = new Blob(sortedChunks, { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      
      updateVideoSrc(url);
      setBufferStatus('Playback is ready!');
      transferActive.current = false;
      
      // Notify Host that Guest has completed local download and player is ready
      socket.current.emit('player-ready');
      
      // Trigger the premium Watch Now popup notification
      setShowReadyModal(true);
    });

    // Playback sync listeners
    socket.current.on('player-play', ({ currentTime, senderName }) => {
      showPlayerNotification(`${senderName || 'Someone'} played the video`);
      setIsPlaying(true);
      if (currentTime !== undefined) {
        setCurrentTime(currentTime);
      }
      if (youtubePlayerRef.current) {
        isRespondingToSocket.current = true;
        try {
          youtubePlayerRef.current.seekTo(currentTime, true);
          youtubePlayerRef.current.playVideo();
        } catch (e) {}
        setTimeout(() => { isRespondingToSocket.current = false; }, 300);
      } else if (videoRef.current) {
        isSyncing.current = true;
        isSeekingFromSocket.current = true;
        videoRef.current.currentTime = currentTime;
        videoRef.current.play().catch(err => console.warn(err));
        setTimeout(() => { isSyncing.current = false; }, 500);
      }
    });

    socket.current.on('player-pause', ({ currentTime, senderName }) => {
      showPlayerNotification(`${senderName || 'Someone'} paused the video`);
      setIsPlaying(false);
      if (currentTime !== undefined) {
        setCurrentTime(currentTime);
      }
      if (youtubePlayerRef.current) {
        isRespondingToSocket.current = true;
        try {
          youtubePlayerRef.current.pauseVideo();
          if (currentTime !== undefined) {
            youtubePlayerRef.current.seekTo(currentTime, true);
          }
        } catch (e) {}
        setTimeout(() => { isRespondingToSocket.current = false; }, 300);
      } else if (videoRef.current) {
        isSyncing.current = true;
        isSeekingFromSocket.current = true;
        videoRef.current.pause();
        if (currentTime !== undefined) {
          videoRef.current.currentTime = currentTime;
        }
        setTimeout(() => { isSyncing.current = false; }, 500);
      }
    });

    socket.current.on('player-seek', ({ currentTime, senderName }) => {
      if (currentTime !== undefined) {
        showPlayerNotification(`${senderName || 'Someone'} seeked to ${formatTime(currentTime)}`);
        setCurrentTime(currentTime);
      }
      if (youtubePlayerRef.current) {
        isRespondingToSocket.current = true;
        try {
          youtubePlayerRef.current.seekTo(currentTime, true);
        } catch (e) {}
        setTimeout(() => { isRespondingToSocket.current = false; }, 300);
      } else if (videoRef.current) {
        isSyncing.current = true;
        isSeekingFromSocket.current = true;
        videoRef.current.currentTime = currentTime;
        setTimeout(() => { isSyncing.current = false; }, 500);
      }
    });

    socket.current.on('chat-message', (msg) => {
      setMessages((prev) => [...prev, msg]);

      // Show toast if the message is from someone else
      if (msg.sender !== userName) {
        setActiveToast(msg);
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = setTimeout(() => {
          setActiveToast(null);
        }, 4000);
      }
    });

    socket.current.on('drift-sync', ({ currentTime }) => {
      if (isHost) return;
      
      if (youtubePlayerRef.current) {
        const ytTime = youtubePlayerRef.current.getCurrentTime();
        if (Math.abs(ytTime - currentTime) > 1.5) {
          isRespondingToSocket.current = true;
          youtubePlayerRef.current.seekTo(currentTime, true);
          setTimeout(() => { isRespondingToSocket.current = false; }, 300);
        }
      } else if (videoRef.current) {
        const vidTime = videoRef.current.currentTime;
        if (Math.abs(vidTime - currentTime) > 1.5) {
          isSyncing.current = true;
          isSeekingFromSocket.current = true;
          videoRef.current.currentTime = currentTime;
          setTimeout(() => { isSyncing.current = false; }, 500);
        }
      }
    });

    socket.current.on('transfer-progress', ({ progress }) => {
      setGuestProgress(progress);
    });

    socket.current.on('player-ready', () => {
      setIsGuestReady(true);
      setGuestProgress(100);
    });

    socket.current.on('guest-reset', () => {
      setIsGuestReady(false);
      setGuestProgress(0);
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [initialRoomCode, userName, onLeave]);

  // Query Cloudflare R2 configuration status on mount
  useEffect(() => {
    fetch(`${backendUrl}/api/r2-config`)
      .then(res => res.json())
      .then(data => {
        setIsR2Enabled(!!data.configured);
        console.log('[R2 Config] Cloudflare R2 Status:', data.configured ? 'ENABLED' : 'DISABLED (WebRTC Fallback Active)');
      })
      .catch(err => {
        console.error('[R2 Config] Failed to fetch R2 config status:', err);
        setIsR2Enabled(false);
      });
  }, [backendUrl]);

  // 2. Presence Watchdog
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!socket.current || !socketConnected) return;

      const status = document.visibilityState === 'hidden' ? 'Away' : 'Active';

      if (status === 'Away') {
        let time = 0;
        let wasPlaying = false;

        if (youtubePlayerRef.current) {
          try {
            const state = youtubePlayerRef.current.getPlayerState();
            if (state === 1) { // PLAYING
              wasPlaying = true;
              youtubePlayerRef.current.pauseVideo();
              time = youtubePlayerRef.current.getCurrentTime();
            }
          } catch (e) {}
        } else if (videoRef.current && !videoRef.current.paused) {
          wasPlaying = true;
          videoRef.current.pause();
          time = videoRef.current.currentTime;
        }

        if (wasPlaying) {
          socket.current.emit('presence-change', { status, currentTime: time });
          socket.current.emit('player-pause', { currentTime: time });
        } else {
          socket.current.emit('presence-change', { status });
        }
      } else {
        socket.current.emit('presence-change', { status });
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

  // YouTube URL extraction helper
  const extractYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Host YouTube loading handler
  const handleYoutubeLoad = (e) => {
    e.preventDefault();
    if (!youtubeInput.trim()) return;

    const videoId = extractYouTubeId(youtubeInput);
    if (!videoId) {
      alert('Please enter a valid YouTube URL.');
      return;
    }

    setIsGuestReady(false);
    setGuestProgress(0);
    socket.current.emit('guest-reset');

    setVideoName('YouTube Video');
    setYoutubeUrl(youtubeInput);
    updateVideoSrc('YOUTUBE');

    socket.current.emit('share-torrent', {
      magnetURI: '',
      fileName: 'YouTube Video',
      fileSize: 0,
      youtubeUrl: youtubeInput
    });
  };

  // Initialize YouTube Iframe Player API on-demand
  useEffect(() => {
    let checkInterval = null;

    if (youtubeUrl) {
      const videoId = extractYouTubeId(youtubeUrl);
      if (!videoId) return;

      const initPlayer = () => {
        if (youtubePlayerRef.current) {
          try {
            youtubePlayerRef.current.loadVideoById(videoId);
          } catch (err) {
            console.error('Failed to load video:', err);
          }
          return;
        }

        youtubePlayerRef.current = new window.YT.Player('yt-player', {
          videoId: videoId,
          playerVars: {
            rel: 0,
            showinfo: 0,
            controls: 0, // Disable native YouTube control overlay completely
            autoplay: 0,
            disablekb: 1, // Prevent keyboard shortcuts interfering
            cc_load_policy: 0, // Disable subtitles/captions by default on load
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              youtubePlayerRef.current = event.target;
              
              const isAlone = Object.keys(usersList).length < 2;

              // If there is a Guest in the room, pause the video immediately on ready load
              if (!isAlone || initialRoomCode !== 'CREATE') {
                try {
                  event.target.pauseVideo();
                } catch (err) {}
              }

              // Guest side: Notify Host that YouTube player is fully loaded & ready
              if (initialRoomCode !== 'CREATE') {
                socket.current.emit('player-ready');
              } else {
                // Host side: If alone, ready is true. If guest is here, wait for guest
                if (isAlone) {
                  setIsGuestReady(true);
                  setGuestProgress(100);
                } else {
                  setIsGuestReady(false);
                  setGuestProgress(0);
                }
              }

              // Sync initial time if Guest joins an ongoing playback room
              if (initialVideoState.current && initialRoomCode !== 'CREATE') {
                isRespondingToSocket.current = true;
                youtubePlayerRef.current.seekTo(initialVideoState.current.currentTime, true);
                if (initialVideoState.current.playing) {
                  youtubePlayerRef.current.playVideo();
                } else {
                  youtubePlayerRef.current.pauseVideo();
                }
                setTimeout(() => { isRespondingToSocket.current = false; }, 400);
              }
            },
            onStateChange: (event) => {
              if (isRespondingToSocket.current) return;
              
              const currentTime = event.target.getCurrentTime();
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                showPlayerNotification('You played the video');
                socket.current.emit('player-play', { currentTime });
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
                showPlayerNotification('You paused the video');
                socket.current.emit('player-pause', { currentTime });
              }
            }
          }
        });
      };

      // Inject YouTube script tag if not present
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        window.onYouTubeIframeAPIReady = () => {
          initPlayer();
        };
      } else {
        if (window.YT.Player) {
          initPlayer();
        } else {
          const interval = setInterval(() => {
            if (window.YT && window.YT.Player) {
              clearInterval(interval);
              initPlayer();
            }
          }, 100);
        }
      }

      // Check for manual seeks in the YouTube player
      let lastTime = 0;
      checkInterval = setInterval(() => {
        if (youtubePlayerRef.current && !isRespondingToSocket.current) {
          try {
            const state = youtubePlayerRef.current.getPlayerState();
            if (state === 1) { // PLAYING
              const curr = youtubePlayerRef.current.getCurrentTime();
              if (Math.abs(curr - lastTime) > 2) {
                socket.current.emit('player-seek', { currentTime: curr });
              }
              lastTime = curr;
            }
          } catch (e) {}
        }
      }, 1000);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (youtubePlayerRef.current && youtubePlayerRef.current.destroy) {
        try {
          youtubePlayerRef.current.destroy();
        } catch (e) {}
        youtubePlayerRef.current = null;
      }
    };
  }, [youtubeUrl]);

  // Custom Controls Helpers
  const renderProjectorIcon = () => (
    <svg className="w-24 h-24 mb-4 text-indigo-400 overflow-visible" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="projector-light" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.4" />
          <stop offset="30%" stopColor="#6366f1" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Light Beam (Pulse Glowing Animation) */}
      <polygon points="71,51 71,57 95,68 95,40" fill="url(#projector-light)" className="animate-[pulse_1.5s_ease-in-out_infinite]" />

      {/* Projector Body (Deep Slate/Black) */}
      <rect x="35" y="45" width="30" height="18" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="2" />
      <rect x="65" y="48" width="6" height="12" rx="1" fill="#fef08a" stroke="#334155" strokeWidth="1.5" className="animate-pulse" />
      <line x1="38" y1="58" x2="62" y2="58" stroke="#334155" strokeWidth="2" />
      
      {/* Tripod Stand */}
      <line x1="50" y1="63" x2="50" y2="85" stroke="#334155" strokeWidth="2" />
      <line x1="50" y1="63" x2="40" y2="85" stroke="#334155" strokeWidth="2" />
      <line x1="50" y1="63" x2="60" y2="85" stroke="#334155" strokeWidth="2" />
      <circle cx="50" cy="64" r="2" fill="#334155" />

      {/* Reel Arm Brackets */}
      <line x1="50" y1="46" x2="38" y2="34" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="46" x2="62" y2="34" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
      
      {/* Animated Reels */}
      <g className="animate-[spin_5s_linear_infinite]" style={{ transformOrigin: '38px 34px' }}>
        <circle cx="38" cy="34" r="12" fill="#1e293b" stroke="#334155" strokeWidth="2" />
        <circle cx="38" cy="34" r="9" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 2" />
        <circle cx="38" cy="27" r="1.5" fill="#020617" />
        <circle cx="38" cy="41" r="1.5" fill="#020617" />
        <circle cx="31" cy="34" r="1.5" fill="#020617" />
        <circle cx="45" cy="34" r="1.5" fill="#020617" />
        <circle cx="38" cy="34" r="2" fill="#94a3b8" />
      </g>
      
      <g className="animate-[spin_5s_linear_infinite]" style={{ transformOrigin: '62px 34px' }}>
        <circle cx="62" cy="34" r="12" fill="#1e293b" stroke="#334155" strokeWidth="2" />
        <circle cx="62" cy="34" r="9" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 2" />
        <circle cx="62" cy="27" r="1.5" fill="#020617" />
        <circle cx="62" cy="41" r="1.5" fill="#020617" />
        <circle cx="55" cy="34" r="1.5" fill="#020617" />
        <circle cx="69" cy="34" r="1.5" fill="#020617" />
        <circle cx="62" cy="34" r="2" fill="#94a3b8" />
      </g>
    </svg>
  );

  const handleHostReset = () => {
    setIsGuestReady(false);
    setGuestProgress(0);
    setVideoName('');
    setYoutubeUrl('');
    updateVideoSrc('');
    if (socket.current) {
      socket.current.emit('guest-reset');
      socket.current.emit('share-torrent', {
        magnetURI: '',
        fileName: '',
        fileSize: 0,
        youtubeUrl: '',
        cloudUrl: ''
      });
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === null) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const paddedSecs = secs < 10 ? `0${secs}` : secs;
    if (hrs > 0) {
      const paddedMins = mins < 10 ? `0${mins}` : mins;
      return `${hrs}:${paddedMins}:${paddedSecs}`;
    }
    return `${mins}:${paddedSecs}`;
  };

  const seekToTime = (time) => {
    isRespondingToSocket.current = true;
    if (youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.seekTo(time, true);
      } catch (err) {}
    } else if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    setCurrentTime(time);
    
    // Broadcast seek event
    socket.current.emit('player-seek', { currentTime: time });
    setTimeout(() => { isRespondingToSocket.current = false; }, 300);
  };

  const togglePlay = () => {
    const nextPlayState = !isPlaying;
    isRespondingToSocket.current = true;
    
    if (youtubePlayerRef.current) {
      try {
        if (nextPlayState) {
          youtubePlayerRef.current.playVideo();
          socket.current.emit('player-play', { currentTime: youtubePlayerRef.current.getCurrentTime() });
        } else {
          youtubePlayerRef.current.pauseVideo();
          socket.current.emit('player-pause', { currentTime: youtubePlayerRef.current.getCurrentTime() });
        }
      } catch (err) {}
    } else if (videoRef.current) {
      if (nextPlayState) {
        videoRef.current.play().catch(e => console.warn(e));
        socket.current.emit('player-play', { currentTime: videoRef.current.currentTime });
      } else {
        videoRef.current.pause();
        socket.current.emit('player-pause', { currentTime: videoRef.current.currentTime });
      }
    }
    
    setIsPlaying(nextPlayState);
    setTimeout(() => { isRespondingToSocket.current = false; }, 300);
  };

  const skipTime = (amount) => {
    let target = currentTime + amount;
    if (target < 0) target = 0;
    if (target > duration) target = duration;
    seekToTime(target);
  };

  const handleProgressClick = (e) => {
    if (!duration || (!videoRef.current && !youtubePlayerRef.current)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    const targetTime = percentage * duration;
    
    seekToTime(targetTime);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.setVolume(val * 100);
      } catch (err) {}
    } else if (videoRef.current) {
      videoRef.current.volume = val;
    }
  };

  const toggleFullscreen = () => {
    const container = document.getElementById('player-wrapper');
    if (!container) return;
    
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => console.warn(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Polling to keep the custom React controls synchronized with the YT video playback
  useEffect(() => {
    let trackingInterval = null;
    if (youtubeUrl) {
      trackingInterval = setInterval(() => {
        if (youtubePlayerRef.current) {
          try {
            const state = youtubePlayerRef.current.getPlayerState();
            if (state === 1) {
              setIsPlaying(true);
            } else {
              setIsPlaying(false);
            }
            
            const curr = youtubePlayerRef.current.getCurrentTime();
            const dur = youtubePlayerRef.current.getDuration();
            if (curr !== undefined) setCurrentTime(curr);
            if (dur !== undefined) setDuration(dur);
          } catch (e) {}
        }
      }, 250);
    }
    return () => {
      if (trackingInterval) clearInterval(trackingInterval);
    };
  }, [youtubeUrl]);

  const toggleSubtitles = () => {
    const nextState = !subtitlesEnabled;
    setSubtitlesEnabled(nextState);

    // HTML5 Video track toggle
    if (videoRef.current && videoRef.current.textTracks) {
      for (let i = 0; i < videoRef.current.textTracks.length; i++) {
        videoRef.current.textTracks[i].mode = nextState ? 'showing' : 'hidden';
      }
    }

    // YouTube captions toggle
    if (youtubePlayerRef.current) {
      try {
        if (nextState) {
          youtubePlayerRef.current.loadModule('captions');
        } else {
          youtubePlayerRef.current.unloadModule('captions');
        }
      } catch (err) {}
    }
  };

  const handleMouseMove = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // Only auto-hide controls if video is playing
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 2500); // Hide after 2.5 seconds of mouse inactivity
    }
  };

  // Reset controls visibility when play state changes
  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 2500);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // Host-side Periodic Drift Sync Heartbeat
  useEffect(() => {
    let driftInterval = null;
    if (isHost && socketConnected && isPlaying) {
      driftInterval = setInterval(() => {
        let time = 0;
        if (youtubePlayerRef.current) {
          try { time = youtubePlayerRef.current.getCurrentTime(); } catch(e){}
        } else if (videoRef.current) {
          time = videoRef.current.currentTime;
        }
        
        if (time > 0) {
          socket.current.emit('drift-sync', { currentTime: time });
        }
      }, 4000); // Send drift check every 4 seconds
    }
    return () => {
      if (driftInterval) clearInterval(driftInterval);
    };
  }, [isHost, socketConnected, isPlaying]);

  // Store file size reference for guest speed tracking
  const fileSizeRef = useRef(0);

  const uploadFileToR2 = async (file) => {
    try {
      setIsUploadingCloud(true);
      setBufferStatus('Requesting secure cloud upload URL...');
      setGuestProgress(0);

      const urlReq = `${backendUrl}/api/r2-upload-url?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type || 'video/mp4')}`;
      const res = await fetch(urlReq);
      if (!res.ok) {
        throw new Error('Failed to fetch presigned R2 upload URL');
      }

      const { uploadUrl, publicUrl } = await res.json();
      
      setBufferStatus('Uploading movie to Cloud (0%)...');
      
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setGuestProgress(progress);
          setBufferStatus(`Uploading movie to Cloud... (${progress}%)`);
        }
      };

      xhr.onload = () => {
        setIsUploadingCloud(false);
        if (xhr.status === 200) {
          setBufferStatus('Cloud upload complete! Streaming starts.');
          setIsGuestReady(true);
          setGuestProgress(100);

          // Play local file directly (0% download wait for Host)
          const url = URL.createObjectURL(file);
          updateVideoSrc(url);

          // Share details including cloudUrl with Guest
          socket.current.emit('share-torrent', {
            magnetURI: '',
            fileName: file.name,
            fileSize: file.size,
            cloudUrl: publicUrl
          });
        } else {
          console.warn('R2 upload failed. Falling back to local WebRTC.', xhr.status);
          fallbackToLocalSeeding(file);
        }
      };

      xhr.onerror = () => {
        setIsUploadingCloud(false);
        console.warn('R2 upload network error. Falling back to local WebRTC.');
        fallbackToLocalSeeding(file);
      };

      xhr.send(file);

    } catch (error) {
      setIsUploadingCloud(false);
      console.error('R2 upload initialization error:', error);
      fallbackToLocalSeeding(file);
    }
  };

  const fallbackToLocalSeeding = (file) => {
    fileRef.current = file;
    socket.current.emit('share-torrent', {
      magnetURI: '',
      fileName: file.name,
      fileSize: file.size
    });
    const url = URL.createObjectURL(file);
    updateVideoSrc(url);
    setBufferStatus('Hosting session active (P2P Mode). Playback is local.');
  };

  // 4. Host File Selection & Transfer Trigger
  // 4. Host File Handling (Drag & Drop + Traditional Input)
  const handleHostFileSelection = (file) => {
    if (file) {
      setIsGuestReady(false);
      setGuestProgress(0);
      socket.current.emit('guest-reset');

      setYoutubeUrl(''); // Clear YouTube URL when switching back to local files
      setVideoName(file.name);
      
      if (isR2Enabled) {
        uploadFileToR2(file);
      } else {
        fallbackToLocalSeeding(file);
      }
    }
  };

  const handleHostFileChange = (e) => {
    const file = e.target.files[0];
    handleHostFileSelection(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleHostFileSelection(e.dataTransfer.files[0]);
    }
  };

  // 5. Guest File Transfer Request
  const startFileTransferDownload = (name, size) => {
    transferActive.current = true;
    fileSizeRef.current = size;
    guestReceivedBytes.current = 0;
    receivedChunksMap.current = {};
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
      
      // Calculate progress on Host side based on Guest's acknowledged bytes
      const progress = Math.min(100, Math.round((guestOffset / file.size) * 100));
      setTransferProgress(progress);
      setBufferStatus(`Transferring movie... (Progress: ${progress}%)`);

      sendNext(); // Slide window and resume sending if paused
    };

    // Initial fill of the sliding window
    sendNext();
  };

  // 7. Video Control Hooks (Socket Sync Emits)
  const handleVideoMetadataLoaded = (e) => {
    if (initialVideoState.current && !isHost) {
      const elapsed = initialVideoState.current.playing 
        ? (Date.now() - initialVideoState.current.lastUpdated) / 1000 
        : 0;
      
      const targetTime = initialVideoState.current.currentTime + elapsed;
      console.log(`[Sync] Late-join auto sync: Seeking local HTML5 video to ${targetTime}s`);
      
      isSyncing.current = true;
      isSeekingFromSocket.current = true;
      e.target.currentTime = targetTime;
      if (initialVideoState.current.playing) {
        e.target.play().catch(err => console.warn(err));
        setIsPlaying(true);
      } else {
        e.target.pause();
        setIsPlaying(false);
      }
      setTimeout(() => { isSyncing.current = false; }, 500);
      initialVideoState.current = null;
    }
  };

  const handleLocalPlay = () => {
    setIsPlaying(true);
    if (isSyncing.current) {
      isSyncing.current = false;
      return;
    }
    showPlayerNotification('You played the video');
    if (socket.current && videoRef.current) {
      socket.current.emit('player-play', { currentTime: videoRef.current.currentTime });
    }
  };

  const handleLocalPause = () => {
    setIsPlaying(false);
    if (isSyncing.current) {
      isSyncing.current = false;
      return;
    }
    showPlayerNotification('You paused the video');
    if (socket.current && videoRef.current) {
      socket.current.emit('player-pause', { currentTime: videoRef.current.currentTime });
    }
  };

  const handleLocalSeeked = () => {
    if (isSeekingFromSocket.current) {
      isSeekingFromSocket.current = false;
      return;
    }
    if (isSyncing.current) {
      isSyncing.current = false;
      return;
    }
    if (videoRef.current) {
      showPlayerNotification(`You seeked to ${formatTime(videoRef.current.currentTime)}`);
      if (socket.current) {
        socket.current.emit('player-seek', { currentTime: videoRef.current.currentTime });
      }
    }
  };

  // 8. Chat Handler
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket.current) return;

    socket.current.emit('chat-message', chatInput.trim());
    setChatInput('');
    setShowPicker(false);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isBanned || isKicked || joinRequestStatus === 'waiting' || joinRequestStatus === 'denied') {
    const isWaiting = joinRequestStatus === 'waiting';
    const isDenied = joinRequestStatus === 'denied';

    return (
      <div className="min-h-screen bg-[#02040a] flex items-center justify-center p-6 relative">
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-20 flex justify-center items-center opacity-[0.15] select-none">
          <div className="w-[140%] h-[140%] grid grid-cols-5 gap-4 animate-cinematic-wall">
            <div className="bg-slate-900/30 rounded-xl animate-pulse" />
            <div className="bg-slate-900/30 rounded-xl" />
            <div className="bg-slate-900/30 rounded-xl animate-pulse" />
            <div className="bg-slate-900/30 rounded-xl" />
            <div className="bg-slate-900/30 rounded-xl animate-pulse" />
          </div>
        </div>
        
        <div className="w-full max-w-md bg-slate-950/60 border border-white/[0.04] backdrop-blur-xl p-8 rounded-3xl shadow-2xl text-center flex flex-col items-center gap-6 animate-scale-up">
          <div className={`p-4 rounded-2xl border ${
            isWaiting 
              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
          }`}>
            {isWaiting ? (
              <Users className="h-8 w-8 animate-pulse" />
            ) : (
              <ShieldAlert className="h-8 w-8" />
            )}
          </div>
          
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white mb-2">
              {isWaiting 
                ? 'Waiting for Approval' 
                : isDenied 
                ? 'Entry Denied' 
                : isKicked 
                ? 'Kicked from Room' 
                : 'Access Denied'}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {isWaiting
                ? 'The room host has been notified. You will be admitted automatically once approved.'
                : isDenied
                ? 'Your request to join this watch party was declined by the host.'
                : isKicked
                ? 'You have been kicked out of this watch party lounge.'
                : 'You have been blocked from this watch room by the host.'}
            </p>
          </div>

          <div className="w-full flex flex-col gap-3">
            {(isBanned || isKicked || isDenied) && joinRequestStatus !== 'sent' && joinRequestStatus !== 'sending' && (
              <button
                onClick={() => {
                  setJoinRequestStatus('sending');
                  socket.current.emit('request-join-approval', { 
                    roomCode: initialRoomCode, 
                    name: userName,
                    deviceId: deviceId
                  });
                  setJoinRequestStatus('sent');
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold transition-colors cursor-pointer"
              >
                {isDenied ? 'Request Again' : 'Request to Join'}
              </button>
            )}
            
            {(joinRequestStatus === 'sent' || isWaiting) && (
              <div className="w-full py-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 animate-pulse">
                <span>Waiting for host approval...</span>
              </div>
            )}

            <button
              onClick={onLeave}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-white/[0.06] text-slate-300 rounded-2xl font-semibold transition-colors cursor-pointer"
            >
              Exit Lounge
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02040a] flex flex-col text-slate-100 font-sans">
      {/* Room Header */}
      <header className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-b border-white/[0.04] bg-slate-950/45 backdrop-blur-xl gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button 
            onClick={onLeave}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-white">Movie Room</h2>
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
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            isHost && joinRequests.length > 0
              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
              : 'bg-slate-800/40 text-slate-300 border-slate-700/50'
          }`}>
            <Users className={`h-3.5 w-3.5 ${
              isHost && joinRequests.length > 0
                ? 'text-rose-400 animate-scale-pulse'
                : 'text-indigo-400'
            }`} />
            <span>{Object.keys(usersList).length} {Object.keys(usersList).length === 1 ? 'Viewer' : 'Viewers'}</span>
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
        <div className="flex-grow w-full flex flex-col p-4 md:p-6 items-center justify-start overflow-y-auto h-[calc(100vh-80px)] relative">
          
          {/* Floating pull tab if chat is closed */}
          {!chatOpen && (
            <button 
              onClick={() => setChatOpen(true)}
              className="fixed right-0 top-1/2 -translate-y-1/2 p-2.5 rounded-l-2xl bg-[#0a101d]/90 border-l border-y border-slate-800 text-indigo-400 hover:text-white shadow-2xl hover:bg-slate-900 transition-all z-40 flex items-center justify-center hover:pr-4"
              title="Expand Chat"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          <div className="w-full max-w-5xl flex-grow flex flex-col items-center justify-between min-h-full">
            {/* Status Bar */}
            {!isHost && bufferStatus && (
            <div className="w-full max-w-5xl mb-4 bg-indigo-950/20 border border-indigo-500/20 px-4 py-2.5 rounded-lg flex flex-col gap-2 text-xs text-indigo-300">
              <div className="flex items-center gap-2.5">
                <Download className="h-4 w-4 text-indigo-400 animate-bounce" />
                <span>{bufferStatus}</span>
              </div>
              {transferProgress > 0 && transferProgress < 100 && (
                <div className="w-full bg-indigo-950/40 h-1.5 rounded-full overflow-hidden border border-indigo-500/10">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${transferProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}

          {!videoName && isHost ? (
            /* File Selection Card (Host Only) with Drag & Drop */
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`w-full max-w-xl glass-panel p-6 sm:p-8 md:p-10 rounded-2xl text-center flex flex-col items-center border relative group overflow-visible shadow-2xl transition-all duration-200 ${
                dragActive 
                  ? 'border-indigo-500 bg-indigo-950/15 scale-[1.01]' 
                  : 'border-slate-800 bg-gradient-to-b from-[#0b0f19]/80 to-[#05070c]/90'
              }`}
            >
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600"></div>
              
              <div className={`p-4 md:p-6 rounded-full mb-4 md:mb-6 shadow-inner transition-all duration-300 ${
                dragActive ? 'bg-indigo-500/20 text-indigo-300 scale-110' : 'bg-indigo-600/10 text-indigo-400'
              }`}>
                <Video className="h-10 w-10 md:h-12 md:w-12" />
              </div>
              
              <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Select Movie to Host</h3>
              <p className="text-slate-400 text-xs sm:text-sm mt-2 md:mt-3 px-4 md:px-6 leading-relaxed">
                Drag and drop your movie file here, or click to choose from your computer. 
                Your guest will download it directly from you in real-time.
              </p>
 
              <label className="mt-5 md:mt-8 cursor-pointer group/btn inline-flex items-center justify-center py-3 px-6 md:py-3.5 md:px-7 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold tracking-wide shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:scale-[1.01]">
                <span>Choose Movie File</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleHostFileChange}
                  className="hidden"
                />
              </label>

              {/* YouTube Link Integration */}
              <div className="w-full mt-5 md:mt-8 border-t border-slate-900/60 pt-5 md:pt-8 text-left">
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
                  Or Stream from YouTube
                </label>
                <form onSubmit={handleYoutubeLoad} className="flex gap-2.5">
                  <input
                    type="text"
                    value={youtubeInput}
                    onChange={(e) => setYoutubeInput(e.target.value)}
                    className="flex-grow py-2.5 px-4 rounded-xl glass-input text-xs font-semibold border border-white/[0.06] bg-slate-950/30 text-white focus:border-indigo-500/50"
                    placeholder="Paste YouTube link here..."
                  />
                  <button
                    type="submit"
                    className="py-2.5 px-5 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-lg"
                  >
                    Stream
                  </button>
                </form>
              </div>
            </div>
          ) : !videoName && !isHost ? (
            /* Waiting screen (Guest only) */
            <div className="w-full max-w-xl glass-panel p-10 rounded-2xl text-center flex flex-col items-center border border-slate-800 relative shadow-2xl">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600"></div>
              
              {renderProjectorIcon()}
              
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
            /* Video Player View (HTML5 or YouTube with Custom Controls Overlay) */
            <div className="w-full max-w-5xl flex flex-col gap-4">
              <div 
                id="player-wrapper" 
                onMouseMove={handleMouseMove}
                className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800 group select-none"
              >
                {/* Temporary Playback Event Notification Overlay */}
                {playerNotification && (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none animate-slide-down">
                    <div className="px-4 py-2 bg-slate-950/80 border border-white/[0.08] backdrop-blur-md rounded-full shadow-lg flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                      <span className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider">{playerNotification}</span>
                    </div>
                  </div>
                )}

                {youtubeUrl ? (
                  <div className="w-full h-full pointer-events-none">
                    <div id="yt-player" className="w-full h-full"></div>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={togglePlay}
                    onPlay={handleLocalPlay}
                    onPause={handleLocalPause}
                    onSeeked={handleLocalSeeked}
                    onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                    onDurationChange={(e) => setDuration(e.target.duration)}
                    onLoadedMetadata={handleVideoMetadataLoaded}
                    playsInline
                    webkit-playsinline="true"
                    preload="auto"
                  />
                )}

                {/* Host Waiting Overlay for Guest Readiness */}
                {isHost && !isGuestReady && !isPlaying && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
                    {renderProjectorIcon()}
                    <h3 className="text-xl font-bold text-white tracking-tight">Syncing Session...</h3>
                    <p className="text-slate-400 text-sm mt-2 max-w-sm leading-relaxed">
                      {Object.keys(usersList).length < 2 ? (
                        "Waiting for a guest to join the room code..."
                      ) : isUploadingCloud ? (
                        `Uploading movie to Cloud... (${guestProgress}%)`
                      ) : youtubeUrl ? (
                        "Guest is loading the YouTube video player..."
                      ) : (
                        `Guest is downloading the movie: ${guestProgress}%`
                      )}
                    </p>
                    
                    {/* Visual Progress Bar for Host */}
                    {Object.keys(usersList).length >= 2 && !youtubeUrl && (guestProgress > 0 || isUploadingCloud) && (
                      <div className="w-64 bg-slate-900 border border-slate-800 h-2 rounded-full mt-5 overflow-hidden relative shadow-inner">
                        <div 
                          className="bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${guestProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Guest Standby Screen (Fully Loaded, waiting for Host start click) */}
                {!isHost && !isPlaying && currentTime === 0 && (
                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center select-none">
                    {renderProjectorIcon()}
                    <h3 className="text-xl font-bold text-white tracking-tight">Ready & Synced!</h3>
                    <p className="text-slate-400 text-sm mt-2 max-w-sm leading-relaxed">
                      Waiting for the Host to start the movie... Get your popcorn! 🍿
                    </p>
                  </div>
                )}

                {/* Custom Overlay Controls - Visible on Hover or when Paused */}
                <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-3 transition-opacity duration-300 z-30 ${
                  (!isPlaying || controlsVisible) ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}>
                  
                  {/* Time Progress Scrubber */}
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-[10px] font-mono text-slate-300 min-w-[40px] text-right">
                      {formatTime(currentTime)}
                    </span>
                    <div 
                      onClick={handleProgressClick}
                      className="flex-grow h-1.5 bg-slate-800/80 rounded-full cursor-pointer relative hover:h-2 transition-all"
                    >
                      <div 
                        className="bg-indigo-500 h-full rounded-full"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      />
                      <div 
                        className="absolute h-3 w-3 bg-white border border-indigo-600 rounded-full -top-[3px] shadow hover:scale-110 transition-transform"
                        style={{ left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 6px)` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-300 min-w-[40px]">
                      {formatTime(duration)}
                    </span>
                  </div>

                  {/* Control Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Rewind 10s */}
                      <button 
                        onClick={() => skipTime(-10)} 
                        className="p-1 rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                        title="Rewind 10s"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      
                      {/* Play/Pause */}
                      <button 
                        onClick={togglePlay} 
                        className="p-2 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all"
                        title={isPlaying ? "Pause" : "Play"}
                      >
                        {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current pl-0.5" />}
                      </button>

                      {/* Fast Forward 10s */}
                      <button 
                        onClick={() => skipTime(10)} 
                        className="p-1 rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                        title="Fast Forward 10s"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Subtitles Toggle CC Button */}
                      <button 
                        onClick={toggleSubtitles} 
                        className={`p-1 rounded-md transition-colors ${
                          subtitlesEnabled 
                            ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                        title="Toggle Subtitles"
                      >
                        <Subtitles className="h-4 w-4" />
                      </button>

                      {/* Volume Control */}
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-slate-400" />
                        <input 
                          type="range" 
                          min={0} 
                          max={1} 
                          step={0.05} 
                          value={volume}
                          onChange={handleVolumeChange}
                          className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>

                      {/* Fullscreen */}
                      <button 
                        onClick={toggleFullscreen} 
                        className="p-1 rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                        title="Toggle Fullscreen"
                      >
                        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Active Toast Message Popup */}
                {activeToast && (
                  <div className="absolute bottom-20 right-4 max-w-xs md:max-w-sm bg-slate-950/95 border border-indigo-500/40 text-white rounded-xl p-3.5 shadow-2xl flex flex-col gap-1 backdrop-blur-md animate-fade-in z-45 transition-all duration-300">
                    <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">
                        New Message from {activeToast.sender}
                      </span>
                      <button 
                        onClick={() => setActiveToast(null)}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-200 break-words leading-relaxed pt-1 font-medium">
                      {activeToast.text}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-2 text-xs">
                <span className="text-slate-400 truncate max-w-xs md:max-w-md">Playing: <strong className="text-slate-200">{videoName}</strong></span>
                {isHost && (
                  <button 
                    onClick={handleHostReset}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors bg-transparent border-none cursor-pointer p-0"
                  >
                    {youtubeUrl ? "Change Video" : "Change File"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Presence Watchdog status list */}
          <div className="w-full max-w-5xl mt-6 border-t border-slate-800/80 pt-6">
            <div className="text-xs uppercase font-bold tracking-widest text-slate-500 mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Monitor className="h-3.5 w-3.5 text-slate-500" />
                <span>Viewer Status & Presence</span>
              </div>
              {Object.entries(usersList).length > 2 && (
                <button
                  type="button"
                  onClick={() => setUsersExpanded(!usersExpanded)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] text-[9px] font-black text-indigo-400 hover:text-indigo-300 rounded-lg transition-all cursor-pointer select-none uppercase tracking-wider"
                >
                  <span>{usersExpanded ? 'Show Less' : `Show All (${Object.entries(usersList).length})`}</span>
                  {usersExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(() => {
                const sortedUsersList = Object.entries(usersList).sort((a, b) => a[0].localeCompare(b[0]));
                const visibleUsers = usersExpanded ? sortedUsersList : sortedUsersList.slice(0, 2);
                
                return visibleUsers.map(([sid, uProfile]) => {
                  const isUserAway = uProfile.status === 'Away';
                  const isUserOffline = uProfile.status === 'Offline';
                  const isCurrentUser = uProfile.name === userName;
                  const userIdx = sortedUsersList.findIndex(([sId]) => sId === sid);
                  
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
                          {getUserAvatarSVG(uProfile.name, userIdx)}
                          <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#02040a] ${
                            isUserAway ? 'bg-amber-500' : isUserOffline ? 'bg-slate-600' : 'bg-emerald-500'
                          }`} />
                        </div>
                      <div>
                        <div className="font-semibold text-sm text-slate-200 flex items-center flex-wrap">
                          <span>{uProfile.name}</span>
                          {isCurrentUser && <span className="text-slate-500 ml-1">(You)</span>}
                          {sid === hostId && (
                            <span className="text-[9px] uppercase font-extrabold tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded ml-1.5">
                              Host
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">Status: {uProfile.status}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isUserAway 
                          ? 'bg-amber-500/10 text-amber-400' 
                          : isUserOffline 
                          ? 'bg-slate-800 text-slate-400' 
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {uProfile.status}
                      </span>
                      
                      {/* Host Actions (3-dot Dropdown) */}
                      {isHost && sid !== socket.current?.id && (
                        <div className="relative">
                          <button 
                            onClick={() => setActiveDropdownUser(activeDropdownUser === sid ? null : sid)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {activeDropdownUser === sid && (
                            <div className="absolute right-0 mt-1 w-32 bg-slate-950/95 border border-white/[0.08] backdrop-blur-md rounded-xl py-1.5 shadow-xl z-50 animate-scale-up">
                              <button
                                onClick={() => {
                                  socket.current.emit('make-host', { targetSocketId: sid });
                                  setActiveDropdownUser(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Users className="h-3.5 w-3.5 text-indigo-400" />
                                Make Host
                              </button>
                              <button
                                onClick={() => {
                                  socket.current.emit('kick-user', { targetSocketId: sid });
                                  setActiveDropdownUser(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5 text-rose-500" />
                                Kick Out
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                });
              })()}
            </div>
            
            {Object.entries(usersList).some(([sid, up]) => up.status === 'Away' && up.name !== userName) && (
              <div className="mt-4 p-3 bg-amber-950/20 border border-amber-500/20 rounded-lg flex items-center gap-2 text-xs text-amber-300">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span>Partner is currently <strong>Away</strong> (Movie has been paused automatically).</span>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Collapsible Chat */}
        {chatOpen && (
          <aside className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-white/[0.04] bg-slate-950/60 backdrop-blur-xl flex flex-col shadow-2xl relative z-10 h-[350px] md:h-auto">
            <div className="px-4 py-3.5 border-b border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-400" />
                <span className="font-bold text-sm text-white">Live Theatre Chat</span>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                title="Minimize Chat"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-3">
              {messages.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <MessageSquare className="h-8 w-8 text-slate-700 mb-2" />
                  <p className="text-xs font-bold text-slate-400">No messages yet</p>
                  <p className="text-[10px] text-slate-500/90 mt-1">Start chatting with your friends!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender === userName;
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                    >
                      <div className={`flex items-center gap-1 mb-1 px-1 select-none ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {(() => {
                          const senderProfileEntry = Object.entries(usersList).find(([sid, up]) => up.name === msg.sender);
                          const senderSid = senderProfileEntry ? senderProfileEntry[0] : '';
                          const sortedUsersList = Object.entries(usersList).sort((a, b) => a[0].localeCompare(b[0]));
                          const senderIdx = sortedUsersList.findIndex(([sid]) => sid === senderSid);
                          return getUserAvatarSVG(msg.sender, senderIdx !== -1 ? senderIdx : undefined, 'h-4 w-4');
                        })()}
                        <span className="text-[9px] text-slate-500 font-bold">{msg.sender}</span>
                      </div>
                      
                      {msg.text.startsWith('gif:') ? (
                        <div className="rounded-xl overflow-hidden border border-white/[0.08] shadow-lg max-w-[200px] bg-slate-900">
                          <img 
                            src={msg.text.substring(4)} 
                            alt="GIF" 
                            className="w-full h-auto object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          isMe 
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-md shadow-indigo-600/5' 
                            : 'bg-[#0f1422]/80 text-slate-200 rounded-tl-none border border-white/[0.05] backdrop-blur-sm shadow-sm'
                        }`}>
                          {msg.text}
                        </div>
                      )}

                      <span className="text-[8px] text-slate-600 mt-1 px-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Premium Emoji & GIF Picker Popover */}
            {showPicker && (
              <div className="mx-4 mb-2 bg-[#0a0f1d]/95 border border-white/[0.08] backdrop-blur-xl rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2 relative z-50 animate-scale-up select-none">
                
                {/* Popover Header / Tabs */}
                <div className="flex bg-[#02040a]/65 p-0.5 rounded-xl border border-white/[0.04]">
                  <button
                    type="button"
                    onClick={() => setPickerTab('emojis')}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      pickerTab === 'emojis'
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Emojis
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerTab('gifs')}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      pickerTab === 'gifs'
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    GIFs
                  </button>
                </div>

                {/* Emojis Tab Content */}
                {pickerTab === 'emojis' && (
                  <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1 text-center scrollbar-none">
                    {['🍿', '🎬', '🎥', '😂', '😍', '🔥', '👏', '🎉', '🚀', '😭', '😱', '😡', '💯', '👍', '👎', '💖', '🤔', '😴', '💀', '🤩', '👀', '🥳', '💩', '🤝'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setChatInput(prev => prev + emoji);
                        }}
                        className="text-lg hover:scale-125 transition-transform p-1 rounded hover:bg-white/[0.04] cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* GIFs Tab Content */}
                {pickerTab === 'gifs' && (
                  <div className="flex flex-col gap-2 text-left">
                    {/* GIF Search Bar */}
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400">
                        <Search className="h-3 w-3" />
                      </div>
                      <input
                        type="text"
                        value={gifSearchQuery}
                        onChange={(e) => setGifSearchQuery(e.target.value)}
                        placeholder="Search Giphy..."
                        className="w-full py-1.5 pl-8 pr-3 rounded-lg text-[10px] text-slate-100 border border-white/[0.04] bg-slate-900/40 focus:bg-slate-950/60 focus:border-indigo-500/60 placeholder:text-slate-600 outline-none transition-all duration-200"
                      />
                    </div>

                    {/* GIF Scroll Grid */}
                    <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto scrollbar-none p-0.5">
                      {loadingGifs ? (
                        <div className="col-span-3 text-center py-6 text-[10px] text-slate-500 animate-pulse">
                          Searching Giphy...
                        </div>
                      ) : gifsList.length === 0 ? (
                        <div className="col-span-3 text-center py-6 text-[10px] text-slate-600">
                          No GIFs found.
                        </div>
                      ) : (
                        gifsList.map((gifUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              socket.current.emit('chat-message', `gif:${gifUrl}`);
                              // Add to local message list immediately for local feedback
                              const localMsg = {
                                id: Math.random().toString(36).substr(2, 9),
                                sender: userName,
                                text: `gif:${gifUrl}`,
                                timestamp: Date.now()
                              };
                              setMessages(prev => [...prev, localMsg]);
                              setShowPicker(false);
                            }}
                            className="aspect-square rounded-lg overflow-hidden border border-white/[0.04] hover:border-indigo-500/40 hover:scale-105 transition-all bg-slate-950 cursor-pointer"
                          >
                            <img 
                              src={gifUrl} 
                              alt="GIF" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSendChat} className="p-4 border-t border-white/[0.04] bg-slate-950/20">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPicker(!showPicker)}
                  className={`p-2.5 rounded-xl border transition-all active:scale-95 flex items-center justify-center cursor-pointer select-none ${
                    showPicker
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-indigo-500/30'
                  }`}
                >
                  <Smile className="h-4.5 w-4.5" />
                </button>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Say something to the lounge..."
                  className="flex-grow py-2.5 px-4 rounded-xl text-xs text-slate-100 tracking-wide border border-white/[0.06] bg-slate-900/40 focus:bg-slate-950/60 focus:border-indigo-500/60 focus:shadow-[0_0_12px_rgba(99,102,241,0.12)] placeholder:text-slate-500 transition-all duration-300 outline-none"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 disabled:pointer-events-none rounded-xl text-white transition-all shadow-md shadow-indigo-600/10 active:scale-95 flex items-center justify-center cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>

      {/* Ready Watch Now Modal Notification */}
      {showReadyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-md bg-gradient-to-b from-[#0b0f19] to-[#05070c] border border-white/[0.04] p-8 rounded-3xl shadow-2xl relative text-center">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-t-3xl"></div>
            <div className="h-14 w-14 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Movie is Ready!</h3>
            <p className="text-xs text-slate-400 mb-8">The file has been successfully downloaded. You can start watching now.</p>
            <button
              onClick={() => {
                setShowReadyModal(false);
                if (videoRef.current) {
                  videoRef.current.play().catch(e => console.warn(e));
                }
              }}
              className="w-full py-3 px-5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 flex items-center justify-center gap-1.5"
            >
              <Play className="h-4 w-4 fill-current pl-0.5" />
              <span>Watch Now</span>
            </button>
          </div>
        </div>
      )}
      {/* Pending Join Requests (Host perspective) */}
      {isHost && joinRequests.length > 0 && (
        <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-3 max-w-md w-full">
          {joinRequests.map((req) => (
            <div key={req.requesterSocketId} className="bg-slate-950/95 border-2 border-indigo-500/40 text-white p-5 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-4 animate-slide-up">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-500/10 p-3 rounded-xl text-indigo-400">
                  <Users className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h4 className="font-extrabold text-base text-slate-200">Join Request Pending</h4>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">"<span className="text-indigo-400 font-bold">{req.name}</span>" is waiting to join the lounge.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    socket.current.emit('approve-join-request', { roomCode, requesterSocketId: req.requesterSocketId, name: req.name, approved: true });
                    setJoinRequests(prev => prev.filter(r => r.requesterSocketId !== req.requesterSocketId));
                  }}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    socket.current.emit('approve-join-request', { roomCode, requesterSocketId: req.requesterSocketId, name: req.name, approved: false });
                    setJoinRequests(prev => prev.filter(r => r.requesterSocketId !== req.requesterSocketId));
                  }}
                  className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-white/[0.06] rounded-xl text-xs font-bold text-slate-300 transition-colors cursor-pointer"
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TheatreRoom;
