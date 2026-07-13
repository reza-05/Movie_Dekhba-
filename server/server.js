import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as TrackerServer } from 'bittorrent-tracker';
import { checkR2Status, generateUploadUrl } from './r2Service.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Cloudflare R2 Upload Endpoints
app.get('/api/r2-config', (req, res) => {
  res.json({ configured: checkR2Status() });
});

app.get('/api/r2-upload-url', async (req, res) => {
  const { fileName, fileType } = req.query;
  if (!fileName || !fileType) {
    return res.status(400).json({ error: 'fileName and fileType query params are required.' });
  }

  try {
    const urls = await generateUploadUrl(fileName, fileType);
    res.json(urls);
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: 'Failed to generate presigned upload URL.' });
  }
});

const server = createServer(app);

// Initialize Private WebSockets Bittorrent Tracker for WebRTC signaling
const tracker = new TrackerServer({
  http: false,
  udp: false,
  ws: true,
  stats: false
});

tracker.on('error', (err) => {
  console.error('Tracker error:', err.message);
});

const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for the MVP
    methods: ['GET', 'POST'],
  },
});

// Master Upgrade Dispatcher to prevent Socket.io from destroying tracker WebSocket connections
const upgradeListeners = server.listeners('upgrade').slice();
server.removeAllListeners('upgrade');
server.on('upgrade', (request, socket, head) => {
  if (request.url && request.url.includes('/tracker')) {
    tracker.ws.handleUpgrade(request, socket, head, (ws) => {
      tracker.ws.emit('connection', ws, request);
    });
    console.log('Master Dispatcher: Handled upgrade for local WebSockets Tracker connection');
  } else {
    for (const listener of upgradeListeners) {
      listener(request, socket, head);
    }
  }
});

// In-memory room store
const rooms = new Map();

// Helper to generate a random 6-character room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  let currentRoomCode = null;
  let userProfile = null;

  // Handle room creation
  socket.on('create-room', ({ name }) => {
    let roomCode = generateRoomCode();
    // Ensure uniqueness
    while (rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    userProfile = { name, status: 'Active' };
    const roomData = {
      code: roomCode,
      videoState: { playing: false, currentTime: 0, lastUpdated: Date.now() },
      users: {
        [socket.id]: userProfile,
      },
      magnetURI: null,
      fileName: null,
      fileSize: 0,
      youtubeUrl: null,
      cloudUrl: null,
    };

    rooms.set(roomCode, roomData);
    currentRoomCode = roomCode;

    socket.join(roomCode);
    console.log(`Room created: ${roomCode} by ${name}`);

    // Acknowledge creation
    socket.emit('room-created', { roomCode, users: roomData.users });
  });

  // Handle room joining
  socket.on('join-room', ({ roomCode, name }) => {
    const code = roomCode.trim().toUpperCase();
    if (!rooms.has(code)) {
      socket.emit('join-error', 'Room not found.');
      return;
    }

    const room = rooms.get(code);

    // Clean up any offline users or duplicate names to prevent double counting / dead sockets
    for (const id of Object.keys(room.users)) {
      if (room.users[id].status === 'Offline' || room.users[id].name === name) {
        delete room.users[id];
      }
    }

    const numUsers = Object.keys(room.users).length;

    // Limit to 2 users for the MVP
    if (numUsers >= 2) {
      socket.emit('join-error', 'Room is full (max 2 users).');
      return;
    }

    userProfile = { name, status: 'Active' };
    room.users[socket.id] = userProfile;
    currentRoomCode = code;

    socket.join(code);
    console.log(`User ${name} joined room: ${code}`);

    // Notify the room about the new user and state
    io.to(code).emit('room-updated', {
      roomCode: code,
      users: room.users,
      videoState: room.videoState,
      magnetURI: room.magnetURI,
      fileName: room.fileName,
      fileSize: room.fileSize,
      youtubeUrl: room.youtubeUrl,
      cloudUrl: room.cloudUrl,
    });
  });

  // Handle sharing of the torrent magnet URI
  socket.on('share-torrent', ({ magnetURI, fileName, fileSize, youtubeUrl, cloudUrl }) => {
    if (!currentRoomCode || !rooms.has(currentRoomCode)) return;
    const room = rooms.get(currentRoomCode);

    room.magnetURI = magnetURI;
    room.fileName = fileName;
    room.fileSize = fileSize;
    room.youtubeUrl = youtubeUrl;
    room.cloudUrl = cloudUrl;
    
    // Broadcast magnet to other users in the room
    socket.to(currentRoomCode).emit('share-torrent', { magnetURI, fileName, fileSize, youtubeUrl, cloudUrl });
    console.log(`[${currentRoomCode}] Shared Torrent Magnet / YouTube / Cloud: ${youtubeUrl || cloudUrl || magnetURI}`);
  });

  // Socket streaming fallback events (for localhost loopback / strict NAT environments)
  socket.on('request-file-stream', (data) => {
    if (!currentRoomCode) return;
    socket.to(currentRoomCode).emit('request-file-stream', data);
  });

  socket.on('file-stream-chunk', (data) => {
    if (!currentRoomCode) return;
    socket.to(currentRoomCode).emit('file-stream-chunk', data);
  });

  socket.on('file-stream-end', () => {
    if (!currentRoomCode) return;
    socket.to(currentRoomCode).emit('file-stream-end');
  });

  socket.on('ack-chunk', (data) => {
    if (!currentRoomCode) return;
    socket.to(currentRoomCode).emit('ack-chunk', data);
  });

  socket.on('drift-sync', (data) => {
    if (!currentRoomCode) return;
    socket.to(currentRoomCode).emit('drift-sync', data);
  });

  socket.on('transfer-progress', (data) => {
    if (!currentRoomCode) return;
    socket.to(currentRoomCode).emit('transfer-progress', data);
  });

  socket.on('player-ready', () => {
    if (!currentRoomCode) return;
    socket.to(currentRoomCode).emit('player-ready');
  });

  socket.on('guest-reset', () => {
    if (!currentRoomCode) return;
    socket.to(currentRoomCode).emit('guest-reset');
  });

  // Handle play event
  socket.on('player-play', ({ currentTime }) => {
    if (!currentRoomCode || !rooms.has(currentRoomCode)) return;
    const room = rooms.get(currentRoomCode);

    room.videoState.playing = true;
    room.videoState.currentTime = currentTime;
    room.videoState.lastUpdated = Date.now();

    // Broadcast to other client in the room
    socket.to(currentRoomCode).emit('player-play', { currentTime });
    console.log(`[${currentRoomCode}] Play at ${currentTime} by ${userProfile?.name}`);
  });

  // Handle pause event
  socket.on('player-pause', ({ currentTime }) => {
    if (!currentRoomCode || !rooms.has(currentRoomCode)) return;
    const room = rooms.get(currentRoomCode);

    room.videoState.playing = false;
    room.videoState.currentTime = currentTime;
    room.videoState.lastUpdated = Date.now();

    // Broadcast to other client in the room
    socket.to(currentRoomCode).emit('player-pause', { currentTime });
    console.log(`[${currentRoomCode}] Pause at ${currentTime} by ${userProfile?.name}`);
  });

  // Handle seek event
  socket.on('player-seek', ({ currentTime }) => {
    if (!currentRoomCode || !rooms.has(currentRoomCode)) return;
    const room = rooms.get(currentRoomCode);

    room.videoState.currentTime = currentTime;
    room.videoState.lastUpdated = Date.now();

    // Broadcast to other client in the room
    socket.to(currentRoomCode).emit('player-seek', { currentTime });
    console.log(`[${currentRoomCode}] Seek to ${currentTime} by ${userProfile?.name}`);
  });

  // Handle chat message
  socket.on('chat-message', (messageText) => {
    if (!currentRoomCode || !userProfile) return;

    const message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: userProfile.name,
      text: messageText,
      timestamp: Date.now(),
    };

    io.to(currentRoomCode).emit('chat-message', message);
    console.log(`[${currentRoomCode}] Message from ${userProfile.name}: ${messageText}`);
  });

  // Handle presence/visibility updates (Active/Away)
  socket.on('presence-change', ({ status }) => {
    if (!currentRoomCode || !rooms.has(currentRoomCode) || !userProfile) return;
    
    const room = rooms.get(currentRoomCode);
    if (!room.users[socket.id]) return;

    userProfile.status = status;
    room.users[socket.id].status = status;

    console.log(`[${currentRoomCode}] User ${userProfile.name} is now ${status}`);

    // Presence rules: If someone goes "Away", pause the movie for the room
    if (status === 'Away' && room.videoState.playing) {
      room.videoState.playing = false;
      room.videoState.lastUpdated = Date.now();
      // Pause everyone in the room
      io.to(currentRoomCode).emit('player-pause', { currentTime: room.videoState.currentTime });
      console.log(`[${currentRoomCode}] Paused movie because user went Away`);
    }

    // Broadcast status change to everyone in the room
    io.to(currentRoomCode).emit('room-updated', {
      roomCode: currentRoomCode,
      users: room.users,
      videoState: room.videoState,
      magnetURI: room.magnetURI,
      fileName: room.fileName,
      fileSize: room.fileSize,
      youtubeUrl: room.youtubeUrl,
      cloudUrl: room.cloudUrl,
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (currentRoomCode && rooms.has(currentRoomCode)) {
      const room = rooms.get(currentRoomCode);
      
      // Update status to Offline instead of immediate delete to allow recovery/presence listing
      if (room.users[socket.id]) {
        const disconnectedUser = room.users[socket.id];
        disconnectedUser.status = 'Offline';
        
        console.log(`[${currentRoomCode}] User ${disconnectedUser.name} went Offline`);

        // If they were playing, pause the video
        if (room.videoState.playing) {
          room.videoState.playing = false;
          room.videoState.lastUpdated = Date.now();
          io.to(currentRoomCode).emit('player-pause', { currentTime: room.videoState.currentTime });
        }

        // Check if there's any active/away user left. If everyone is offline/gone, clean up
        const anyOnline = Object.values(room.users).some(u => u.status !== 'Offline');
        if (!anyOnline) {
          rooms.delete(currentRoomCode);
          console.log(`Room ${currentRoomCode} deleted and expired (all users disconnected).`);
        } else {
          // Send update that user went offline
          io.to(currentRoomCode).emit('room-updated', {
            roomCode: currentRoomCode,
            users: room.users,
            videoState: room.videoState,
            magnetURI: room.magnetURI,
            fileName: room.fileName,
            fileSize: room.fileSize,
            youtubeUrl: room.youtubeUrl,
            cloudUrl: room.cloudUrl,
          });
        }
      }
    }
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Movie Dekhba server running on port ${PORT}`);
});
