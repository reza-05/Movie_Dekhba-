# Movie Dekhba 🍿🎬

A custom, real-time synchronized video streaming platform designed for private screening sessions. It allows two users to join a shared lobby, load the same local movie file, and watch it in perfect sync with real-time controls, live chat, and presence tracking.

## Core Features

- **Zero-Upload Synced Playback:** Both users select the movie file locally. The HTML5 File API loads the video instantly using a local memory object URL (`URL.createObjectURL`), bypassing server uploads and saving internet bandwidth.
- **Real-Time Control Syncing:** Playback actions (Play, Pause, Seek/Scrub) synchronize instantly between viewers using Socket.io.
- **Presence Watchdog:** Tracks tab focus and visibility using the Page Visibility API. If any viewer minimizes the browser or switches tabs, the movie automatically pauses for both and updates their status to `Away` to ensure no scenes are missed.
- **In-App Live Chat:** Glassmorphic sidebar for text conversations during screening.
- **Lobby Room Codes:** Unique 6-character room codes generated per session. Room codes automatically expire when both users disconnect.

---

## Directory Structure

```
Movie Dekhba/
├── client/          # Vite + React + Tailwind v4 Frontend
├── server/          # Node.js + Express + Socket.io Server
└── movies/          # Local directory to store movies for convenience
```

---

## Local Setup & Development

### 1. Backend Server
Navigate to the server directory, install dependencies, and run the development server:
```bash
cd server
npm install
npm run dev
```
*The server will run on `http://localhost:5001`.*

### 2. Frontend Client
Open a new terminal window, navigate to the client directory, install dependencies, and start Vite:
```bash
cd client
npm install
npm run dev
```
*Vite will host the app on `http://localhost:5173` (or `http://localhost:5174` if 5173 is in use).*

---

## How to Deploy

### Backend (e.g. Render / Railway)
1. Deploy the `server/` directory.
2. Ensure you configure the `PORT` environment variable.

### Frontend (e.g. Vercel / Netlify)
1. Deploy the `client/` directory.
2. Set the environment variable `VITE_BACKEND_URL` to point to your deployed backend server address.

---

## How to push to GitHub

To store this repository on your GitHub account, run these commands from the root directory:

```bash
git init
git add .
git commit -m "Initialize Movie Dekhba MVP"
# Rename branch to main
git branch -M main
# Add your GitHub repository URL and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```
