# 🎬 Movie Dekhba (মুভি দেখবা) — Real-Time Synchronized Watch Party & Streaming Ecosystem

![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite%208-blue?style=for-the-badge&logo=react)
![Tailwind CSS](https://img.shields.io/badge/UI-Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green?style=for-the-badge&logo=node.js)
![Socket.io](https://img.shields.io/badge/Realtime-Socket.io-black?style=for-the-badge&logo=socket.io)
![WebRTC Voice](https://img.shields.io/badge/Voice-WebRTC%20Discord--Style-purple?style=for-the-badge)
![Storage](https://img.shields.io/badge/Storage-Cloudflare%20R2%20%2B%20Telegram-orange?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-red?style=for-the-badge)

**Movie Dekhba (মুভি দেখবা)** is a high-performance, real-time synchronized virtual cinema and watch party platform. It enables friends and communities anywhere in the world to stream movies, anime, and series together in perfect sync while enjoying Discord-style real-time WebRTC voice chat, Messenger-style text messaging, and automated Telegram channel video streaming.

---

## 📸 Application Showcase

````carousel
![Theatre Room - Synchronized Video Player, Sidebar Chat & WebRTC Voice Controls](/Users/md.shifatreza/.gemini/antigravity/brain/fca16c7d-2866-4fce-b9dd-d473b2b09518/movie_dekhba_app_1.png)
<!-- slide -->
![Movies & Series Catalog - Dynamic Search, Categories & Metadata Filters](/Users/md.shifatreza/.gemini/antigravity/brain/fca16c7d-2866-4fce-b9dd-d473b2b09518/movie_dekhba_app_2.png)
<!-- slide -->
![Viewers & Room Moderation - Per-User Volume Sliders & Host Approvals](/Users/md.shifatreza/.gemini/antigravity/brain/fca16c7d-2866-4fce-b9dd-d473b2b09518/movie_dekhba_app_3.png)
````

> [!NOTE]
> **Key Experience Highlights:**
> - **Zero Video-Chat Page Scrolling**: Sidebars are strictly constrained (`md:h-[calc(100vh-65px)]`) so video playback remains locked in place during active chatting.
> - **10ms Ultra-Low Latency Voice**: Built-in SDP tuning and Web Audio API GainNode amplification (up to 250% volume boost).
> - **Automated Telegram Sync**: Push videos directly from Telegram channels to the website catalog with zero manual database entries.

---

## 🔥 Key Features & Technological Highlights

### 🎙️ 1. Real-Time Discord-Style WebRTC Voice Chat
- **Mesh P2P Audio Streaming**: Direct browser-to-browser voice streaming configured with Google STUN servers (`stun:stun.l.google.com:19302`).
- **Header Control Bar**:
  - **`Join Voice` / `Voice Connected`**: One-click microphone activation.
  - **`Self Mute / Unmute`** (`Mic` / `MicOff`): Instant local track mute control.
  - **`Deafen / Undeafen`** (`Headphones` / `VolumeX`): Mutes all incoming peer audio streams.
  - **`Host Mute All`**: Host moderation trigger to silence all participant microphones simultaneously.
- **Per-User Volume Regulator Sliders**:
  - Individual volume sliders (**0% to 250% Boost**) next to each viewer in the room list using Web Audio API `GainNode` amplification.
- **Active Speaker Detection (Discord-Style Green Pulse Glow)**:
  - Real-time Web Audio API `AnalyserNode` frequency detection highlights speaking avatars with an animated glowing ring (`shadow-[0_0_12px_rgba(16,185,129,0.6)] animate-speaking-pulse`).
- **Strict Acoustic Echo Cancellation (AEC) & System Sound Isolation**:
  - Enforces `echoCancellation`, `googEchoCancellation`, `googNoiseSuppression`, and `suppressLocalAudioPlayback` so movie audio from speakers **never loops back into the mic**.
- **10ms Low-Latency Opus HD Audio**:
  - SDP munging enforces `ptime=10`, `maxptime=20`, `stereo=1`, and `useinbandfec=1` (Forward Error Correction) for stutter-free 128kbps HD voice clarity.

### ⚡ 2. Synchronized Video Engine & Multi-Source Streaming
- **Frame-Accurate Synchronization**: Real-time play, pause, and seek events synced across all viewers via Socket.io with latency drift compensation.
- **Multi-Source Support**:
  - **Telegram Cloud Streams**: High-speed direct streaming from Telegram channels via MTProto.
  - **Cloudflare R2 Storage**: Presigned URL edge caching for fast global streaming (`r2Service.js`, `lruCache.js`).
  - **BitTorrent P2P Magnet Streaming**: Integrated WebSockets BitTorrent tracker (`bittorrent-tracker`) for peer-to-peer video delivery.
  - **Direct YouTube Embeds**: Native YouTube player integration.

### 💬 3. Messenger-Style Realtime Text & GIF Chat
- **Non-Distracting Layout**: Sidebar chat height is locked to the viewport (`md:h-[calc(100vh-65px)]`) with `min-h-0` flex scrolling, eliminating page/video scrolling bugs.
- **Floating "New Messages ↓" Pill**: Animated floating button appears when incoming chat arrives while reading past history.
- **Giphy GIF Search**: Built-in Giphy API picker for instant animated GIF messaging.
- **Glassmorphism Design**: Dark translucent UI bubbles with avatar indicators.

### 📡 4. Telegram Channel Auto-Sync & Metadata Parser
- **Automated Caption Parsing**: Extracts metadata keys (`Title:`, `Genre:`, `Rating:`, `Poster:`, `Description:`, `Season:`, `Episode:`, `#movie`, `#series`, `#anime`) from Telegram channel posts.
- **Instant Web Catalog Sync**: `/api/sync-telegram` endpoint parses channel media and updates `moviesCatalog.json` instantly.

### 🖥️ 5. Native macOS Desktop Uploader GUI App
- **`Movie Dekhba Uploader.command` & `local_uploader.py`**:
  - Python GUI desktop application utilizing Pyrogram / Telethon.
  - Auto-splits, formats, uploads heavy video files to Telegram channels, and triggers the `/api/sync-telegram` webhook automatically.

### 🔒 6. Room Security & Moderation
- **Public & Restricted Access Modes**: Hosts can set rooms to require manual join approval.
- **Host Join Requests Modal**: Interactive modal for approving/rejecting pending viewers.
- **Moderation Actions**: Transfer Host role or Kick Out problem users.
- **Sanitization & Anti-Scripting**: Input sanitization against XSS and ban enforcement by Name, IP, and Device ID.

---

## 🏗️ System Architecture & Data Flow

```mermaid
flowchart TB
    subgraph Clients["🌐 Client Ecosystem (Web & Desktop)"]
        Browser["React 18 Web App (Vite + Tailwind)"]
        MacApp["macOS Desktop Uploader (Python Pyrogram)"]
    end

    subgraph Backend["🚀 Server Infrastructure (Node.js + Express)"]
        SocketServer["Socket.io Realtime Sync & Signaling"]
        CatalogAPI["Express Catalog & Stream API (/api)"]
        Tracker["BitTorrent WebSockets Tracker (/tracker)"]
    end

    subgraph AudioEngine["🎙️ WebRTC Peer-to-Peer Voice Mesh"]
        Voice1["Peer A (Microphone)"]
        Voice2["Peer B (Microphone)"]
        AudioCtx["AudioContext + GainNode (250% Boost)"]
    end

    subgraph Storage["💾 Video Storage & CDN Layer"]
        R2["Cloudflare R2 Bucket"]
        Telegram["Telegram Channel (MTProto Stream)"]
    end

    Browser <-->|WebSocket Realtime Sync| SocketServer
    Browser <-->|HTTP API / Presigned URLs| CatalogAPI
    MacApp -->|Upload & Auto Sync Webhook| CatalogAPI
    MacApp -->|Direct MTProto Upload| Telegram

    CatalogAPI <-->|Presigned Download Token| R2
    CatalogAPI <-->|Stream Relay / Subtitles| Telegram

    Voice1 <-->|WebRTC Peer Connection (STUN)| Voice2
    Voice1 --> AudioCtx
    AudioCtx --> Voice2
```

---

## 🛠️ Tech Stack & Dependencies

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend UI** | React 18, Vite 8, Tailwind CSS, Lucide React Icons |
| **Real-Time Communication** | Socket.io Client, WebRTC Native API (`RTCPeerConnection`), Web Audio API |
| **Backend Framework** | Node.js, Express.js, Socket.io Server, BitTorrent Tracker (`bittorrent-tracker`) |
| **Security & Middleware** | Helmet, Express Rate Limit, CORS, Input Sanitizer |
| **Cloud & Storage** | Cloudflare R2 (`@aws-sdk/client-s3`), Telegram MTProto (`telegram` / Telethon), LRU Cache |
| **Desktop Automation** | Python 3, Pyrogram, Telethon, Tkinter, macOS Shell Command Scripting |

---

## 📂 Project Directory Structure

```
Movie Dekhba/
├── client/                      # React 18 + Vite Frontend Application
│   ├── public/                  # Static assets & movie poster cache
│   └── src/
│       ├── components/
│       │   └── TheatreRoom.jsx  # Main Theatre Room, Sync Engine, Chat & Voice Module
│       ├── App.jsx              # Main App Container & Landing Page
│       └── index.css            # Custom CSS animations & Tailwind utilities
├── server/                      # Node.js + Express + Socket.io Server
│   ├── routes/
│   │   ├── catalog.js           # Movies/Series Catalog API & Telegram Sync Endpoint
│   │   └── stream.js            # Video Streaming & Subtitle Proxy Routes
│   ├── moviesCatalog.json       # Dynamic Catalog Database Store
│   ├── r2Service.js             # Cloudflare R2 S3 SDK Integration
│   ├── telegramService.js       # Telegram MTProto Stream Fetcher
│   ├── lruCache.js              # High-performance LRU Memory Caching Layer
│   └── server.js                # Primary HTTP Server, Socket.io & Tracker Dispatcher
├── local_uploader.py            # Desktop macOS Telegram Video Auto-Uploader App
├── Movie Dekhba Uploader.command# One-click macOS Desktop Executable Launcher
└── README.md                    # Project Documentation
```

---

## 🚀 Quick Start & Installation Guide

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Python**: `v3.10` or higher (for Desktop Uploader)

---

### 1. Clone Repository & Setup Environment

```bash
git clone https://github.com/reza-05/Movie_Dekhba-.git
cd "Movie Dekhba"
```

Create a `.env` file inside the `server/` directory:

```env
PORT=5001
VITE_BACKEND_URL=http://localhost:5001

# Cloudflare R2 Credentials (Optional)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name

# Telegram MTProto Credentials (Optional)
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_CHANNEL_ID=your_channel_id
```

---

### 2. Start Backend Server

```bash
cd server
npm install
npm start
```
*Server will start running at `http://localhost:5001`.*

---

### 3. Start Frontend Client

In a new terminal window:

```bash
cd client
npm install
npm run dev
```
*Client will open at `http://localhost:5173`.*

---

### 4. Run macOS Desktop Uploader (Optional)

Double click `Movie Dekhba Uploader.command` or launch via terminal:

```bash
python3 local_uploader.py
```

---

## 📡 API Endpoints Reference

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/catalog` | `GET` | Returns list of all available movies, series, and anime in the catalog. |
| `/api/sync-telegram` | `POST` | Webhook triggered by uploader to scan Telegram channel posts and auto-sync catalog. |
| `/api/stream/video/:key` | `GET` | Streams video from Cloudflare R2 or Telegram storage with byte-range support. |
| `/api/stream/subtitles` | `GET` | Fetches active subtitle track files for the current room. |

---

## 📜 License & Credits

Designed and developed by **Md Shifat Reza** for **Movie Dekhba**.

- **Author**: Md Shifat Reza ([@reza-05](https://github.com/reza-05))
- **Repository**: [github.com/reza-05/Movie_Dekhba-](https://github.com/reza-05/Movie_Dekhba-)
- **License**: [MIT License](LICENSE)

*Enjoy watching movies together in perfect real-time sync!* 🎬🍿✨
