#!/usr/bin/env python3
import os
import sys
import json
import shutil
import urllib.request
import urllib.parse
import subprocess
import webbrowser
import http.server
import socketserver
import re
from urllib.parse import parse_qs, urlparse
from pathlib import Path

# Auto-install dependencies helper (uses --break-system-packages for macOS compliance)
try:
    from telethon import TelegramClient
    import dotenv
except ImportError:
    print("Installing required packages (telethon, python-dotenv)...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "--break-system-packages", "telethon", "python-dotenv"], check=True)
    except subprocess.CalledProcessError:
        # Fallback without flag if it's an older python version
        subprocess.run([sys.executable, "-m", "pip", "install", "telethon", "python-dotenv"])
    from telethon import TelegramClient
    import dotenv

# Load environment configuration
current_dir = Path(__file__).parent.resolve()
env_path = current_dir / "server" / ".env"
dotenv.load_dotenv(env_path)

PORT = 5005
CHANNEL_ID = -1004329714585
api_id = os.getenv("TELEGRAM_API_ID")
api_hash = os.getenv("TELEGRAM_API_HASH")
session_str = os.getenv("TELEGRAM_SESSION")

if session_str and "," in session_str:
    session_str = session_str.split(",")[0].strip()

catalog_path = current_dir / "server" / "moviesCatalog.json"
posters_dir = current_dir / "client" / "public" / "posters"
os.makedirs(posters_dir, exist_ok=True)

# Global state to track progress
upload_status = {
    "status": "idle",
    "progress": 0,
    "message": ""
}

# Helper to clean HTML tags from API responses
def clean_html(raw_html):
    if not raw_html:
        return ""
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    return cleantext.strip()

# Helper to fetch metadata from Free Keyless APIs
def fetch_api_metadata(title, category):
    try:
        title_encoded = urllib.parse.quote(title)
        if category in ["anime", "series"]:
            # Query TVMaze API (Excellent for shows & anime)
            url = f"https://api.tvmaze.com/singlesearch/shows?q={title_encoded}"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode('utf-8'))
                return {
                    "title": data.get("name", title),
                    "genre": " / ".join(data.get("genres", ["General"])),
                    "rating": str(data.get("rating", {}).get("average", "8.0")),
                    "poster": data.get("image", {}).get("original", ""),
                    "description": clean_html(data.get("summary", "No description available."))
                }
        else:
            # Query iTunes Search API (Excellent for movies)
            url = f"https://itunes.apple.com/search?term={title_encoded}&media=movie&limit=1"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode('utf-8'))
                results = data.get("results", [])
                if results:
                    movie = results[0]
                    return {
                        "title": movie.get("trackName", title),
                        "genre": movie.get("primaryGenreName", "Drama"),
                        "rating": "8.0", # iTunes doesn't have 10-scale ratings, default to 8.0
                        "poster": movie.get("artworkUrl100", "").replace("100x100bb", "600x600bb"),
                        "description": movie.get("longDescription", movie.get("shortDescription", "No description available."))
                    }
    except Exception as e:
        print(f"Error fetching metadata: {e}")
    return {"title": title, "genre": "", "rating": "8.0", "poster": "", "description": ""}

# Helpers to get existing catalog shows
def get_existing_shows():
    if not catalog_path.exists():
        return []
    try:
        with open(catalog_path, 'r', encoding='utf-8') as f:
            catalog = json.load(f)
            # Filter only series and anime
            return [{"id": item["id"], "title": item["title"], "category": item.get("category", "movies")} 
                    for item in catalog if item.get("category") in ["series", "anime"]]
    except Exception as e:
        print(f"Error reading catalog: {e}")
        return []

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Movie Dekhba Uploader</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #080b11;
            --card-bg: rgba(20, 26, 40, 0.4);
            --border-color: rgba(255, 255, 255, 0.05);
            --primary: #6366f1;
            --primary-hover: #4f46e5;
            --text: #f1f5f9;
            --text-secondary: #94a3b8;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Outfit', sans-serif;
            -webkit-font-smoothing: antialiased;
        }

        body {
            background-color: var(--bg-color);
            background-image: radial-gradient(circle at top right, rgba(99, 102, 241, 0.05), transparent 400px);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 2rem;
        }

        .container {
            width: 100%;
            max-width: 650px;
            background: var(--card-bg);
            backdrop-filter: blur(16px);
            border: 1px solid var(--border-color);
            border-radius: 24px;
            padding: 2.5rem;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }

        h1 {
            font-weight: 800;
            font-size: 1.8rem;
            text-align: center;
            margin-bottom: 2rem;
            background: linear-gradient(135deg, #a5b4fc, var(--primary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.5px;
        }

        .form-group {
            margin-bottom: 1.25rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            text-align: left;
        }

        label {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        input[type="text"], select, textarea {
            width: 100%;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 0.75rem 1rem;
            color: var(--text);
            font-size: 0.95rem;
            outline: none;
            transition: all 0.2s;
        }

        input[type="text"]:focus, select:focus, textarea:focus {
            border-color: var(--primary);
            box-shadow: 0 0 10px rgba(99, 102, 241, 0.15);
        }

        .grid-2 {
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 1rem;
        }

        .browse-group {
            display: flex;
            gap: 0.5rem;
        }

        .btn {
            background: var(--primary);
            border: none;
            border-radius: 12px;
            padding: 0.75rem 1.5rem;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .btn:hover {
            background: var(--primary-hover);
            transform: translateY(-1px);
        }

        .btn-browse {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-color);
            color: var(--text);
        }

        .btn-browse:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .btn-fetch {
            background: #10b981;
        }

        .btn-fetch:hover {
            background: #059669;
        }

        .btn-submit {
            width: 100%;
            margin-top: 1.5rem;
            padding: 0.9rem;
            font-size: 1rem;
        }

        .status-container {
            margin-top: 1.5rem;
            padding: 1rem;
            background: rgba(255,255,255,0.02);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            display: none;
        }

        .status-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
            font-size: 0.9rem;
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(255,255,255,0.05);
            border-radius: 4px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, var(--primary), #a5b4fc);
            transition: width 0.3s;
        }

        #statusText {
            font-weight: 600;
            color: var(--text);
        }

        #progressPercent {
            font-weight: 600;
            color: var(--primary);
        }

        #statusMsg {
            font-size: 0.8rem;
            color: var(--text-secondary);
            margin-top: 0.5rem;
            text-align: center;
        }

        .meta-fields-block {
            border: 1px solid rgba(255,255,255,0.03);
            background: rgba(255,255,255,0.01);
            padding: 1.25rem;
            border-radius: 16px;
            margin-bottom: 1.25rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Movie Dekhba Desktop Uploader</h1>
        <form id="uploadForm">
            <div class="form-group">
                <label for="category">Category</label>
                <select id="category" onchange="onCategoryChange()">
                    <option value="movies">Movie</option>
                    <option value="anime_movie">Anime Movie (Standalone)</option>
                    <option value="anime_series">Anime Series (Episodes)</option>
                    <option value="series">TV Series (Episodes)</option>
                </select>
            </div>

            <!-- Series Selection Block -->
            <div class="form-group" id="seriesSelectBlock" style="display: none;">
                <label for="seriesSelect">Select Show / Series Folder</label>
                <select id="seriesSelect" onchange="onSeriesSelectChange()">
                    <!-- Populated dynamically -->
                </select>
            </div>

            <!-- Episode Details (Shows only when Series is selected) -->
            <div class="grid-2" id="episodeBlock" style="display: none;">
                <div class="form-group">
                    <label for="season">Season Number</label>
                    <input type="text" id="season" placeholder="e.g. 1" value="1">
                </div>
                <div class="form-group">
                    <label for="episode">Episode Number</label>
                    <input type="text" id="episode" placeholder="e.g. 12">
                </div>
            </div>

            <!-- Metadata Info Block (Auto-hidden for existing shows) -->
            <div class="meta-fields-block" id="metadataBlock">
                <div class="form-group">
                    <label for="title">Title / Name</label>
                    <div class="browse-group">
                        <input type="text" id="title" required placeholder="e.g. Interstellar">
                        <button type="button" class="btn btn-fetch" onclick="autoFetchMetadata()">Auto Fetch</button>
                    </div>
                </div>

                <div class="grid-2">
                    <div class="form-group">
                        <label for="genre">Genre</label>
                        <input type="text" id="genre" required placeholder="e.g. Sci-Fi / Adventure">
                    </div>
                    <div class="form-group">
                        <label for="rating">Rating</label>
                        <input type="text" id="rating" placeholder="e.g. 8.7" value="8.0">
                    </div>
                </div>

                <!-- Poster selection (Internal browse or URL) -->
                <div class="form-group">
                    <label for="poster">Poster (Local File or URL)</label>
                    <div class="browse-group">
                        <input type="text" id="poster" placeholder="Select local image file or paste web URL...">
                        <button type="button" class="btn btn-browse" onclick="browsePoster()">Browse Poster</button>
                    </div>
                </div>

                <div class="form-group">
                    <label for="description">Description</label>
                    <textarea id="description" rows="3" placeholder="Enter short synopsis..."></textarea>
                </div>
            </div>

            <!-- Main Video File browse -->
            <div class="form-group">
                <label for="filePath">Video File Path</label>
                <div class="browse-group">
                    <input type="text" id="filePath" required placeholder="Select video file...">
                    <button type="button" class="btn btn-browse" onclick="browseVideo()">Browse Video</button>
                </div>
            </div>

            <button type="submit" class="btn btn-submit" id="submitBtn">Process & Upload to Telegram</button>
        </form>

        <div class="status-container" id="statusContainer">
            <div class="status-header">
                <span id="statusText">Preparing...</span>
                <span id="progressPercent">0%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            <div id="statusMsg">Starting video conversion job...</div>
        </div>
    </div>

    <script>
        let existingShows = [];

        // Load existing shows list from server
        async function loadShows() {
            try {
                const res = await fetch('/api/shows');
                existingShows = await res.json();
                populateShowsDropdown();
            } catch(e) {
                console.error("Error loading shows list:", e);
            }
        }

        function populateShowsDropdown() {
            const dropdown = document.getElementById('seriesSelect');
            const cat = document.getElementById('category').value;
            
            // Map the selected UI category option to catalog schema category
            const catalogCat = (cat === 'anime_series') ? 'anime' : 'series';
            const filtered = existingShows.filter(s => s.category === catalogCat);
            
            dropdown.innerHTML = `<option value="new">+ Create New ${cat === 'anime_series' ? 'Anime' : 'Series'} Folder</option>`;
            filtered.forEach(s => {
                dropdown.innerHTML += `<option value="${s.id}">${s.title}</option>`;
            });
            
            onSeriesSelectChange();
        }

        function onCategoryChange() {
            const cat = document.getElementById('category').value;
            const selectBlock = document.getElementById('seriesSelectBlock');
            
            if (cat === 'movies' || cat === 'anime_movie') {
                selectBlock.style.display = 'none';
                document.getElementById('episodeBlock').style.display = 'none';
                document.getElementById('metadataBlock').style.display = 'block';
                toggleInputsRequired(true);
            } else {
                selectBlock.style.display = 'block';
                populateShowsDropdown();
            }
        }

        function onSeriesSelectChange() {
            const selectVal = document.getElementById('seriesSelect').value;
            const episodeBlock = document.getElementById('episodeBlock');
            const metadataBlock = document.getElementById('metadataBlock');
            
            if (selectVal === 'new') {
                episodeBlock.style.display = 'none';
                metadataBlock.style.display = 'block';
                toggleInputsRequired(true);
            } else {
                episodeBlock.style.display = 'grid';
                metadataBlock.style.display = 'none'; // Hide metadata fields for existing shows!
                toggleInputsRequired(false);
            }
        }

        function toggleInputsRequired(isRequired) {
            document.getElementById('title').required = isRequired;
            document.getElementById('genre').required = isRequired;
        }

        async function autoFetchMetadata() {
            const title = document.getElementById('title').value;
            const cat = document.getElementById('category').value;
            if (!title) {
                alert("Please enter a Title first!");
                return;
            }
            updateStatus('Fetching Metadata...', 5, 'Searching public databases...');
            document.getElementById('statusContainer').style.display = 'block';
            
            try {
                const res = await fetch(`/api/fetch-metadata?title=${encodeURIComponent(title)}&category=${cat}`);
                const data = await res.json();
                
                document.getElementById('genre').value = data.genre || "";
                document.getElementById('rating').value = data.rating || "8.0";
                document.getElementById('poster').value = data.poster || "";
                document.getElementById('description').value = data.description || "";
                
                document.getElementById('statusContainer').style.display = 'none';
            } catch(e) {
                alert("Auto fetch failed. Please enter details manually.");
                document.getElementById('statusContainer').style.display = 'none';
            }
        }

        async function browseVideo() {
            const res = await fetch('/api/browse?type=video');
            const data = await res.json();
            if (data.filePath) {
                document.getElementById('filePath').value = data.filePath;
            }
        }

        async function browsePoster() {
            const res = await fetch('/api/browse?type=image');
            const data = await res.json();
            if (data.filePath) {
                document.getElementById('poster').value = data.filePath;
            }
        }

        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.innerText = "Processing...";
            submitBtn.style.opacity = 0.5;

            const payload = {
                category: document.getElementById('category').value,
                seriesId: document.getElementById('seriesSelect').value,
                season: document.getElementById('season').value,
                episode: document.getElementById('episode').value,
                title: document.getElementById('title').value,
                genre: document.getElementById('genre').value,
                rating: document.getElementById('rating').value,
                poster: document.getElementById('poster').value,
                description: document.getElementById('description').value,
                filePath: document.getElementById('filePath').value
            };

            document.getElementById('statusContainer').style.display = 'block';
            updateStatus('Processing Video...', 5, 'Remuxing MKV / Compressing using macOS GPU...');

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await res.json();
                if (data.error) {
                    alert("Error: " + data.error);
                    resetForm();
                    return;
                }
                pollProgress();
            } catch (err) {
                alert("Upload request failed.");
                resetForm();
            }
        });

        function updateStatus(text, percent, msg) {
            document.getElementById('statusText').innerText = text;
            document.getElementById('progressPercent').innerText = percent + '%';
            document.getElementById('progressFill').style.width = percent + '%';
            document.getElementById('statusMsg').innerText = msg;
        }

        function resetForm() {
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = false;
            submitBtn.innerText = "Process & Upload to Telegram";
            submitBtn.style.opacity = 1;
            loadShows(); // Reload shows list in case a new folder was created
        }

        let pollInterval;
        function pollProgress() {
            pollInterval = setInterval(async () => {
                try {
                    const res = await fetch('/api/progress');
                    const data = await res.json();
                    
                    updateStatus(
                        data.status.toUpperCase(),
                        data.progress,
                        data.message
                    );

                    if (data.status === 'completed') {
                        clearInterval(pollInterval);
                        alert("Successfully Uploaded to Telegram! Remember to click Sync Telegram in the website room.");
                        resetForm();
                        document.getElementById('statusContainer').style.display = 'none';
                    } else if (data.status === 'error') {
                        clearInterval(pollInterval);
                        alert("Error: " + data.message);
                        resetForm();
                    }
                } catch (err) {
                    console.error("Progress poll failed:", err);
                }
            }, 1500);
        }

        // Run on load
        loadShows();
    </script>
</body>
</html>
"""

# Native AppleScript dialog file picker (supports choosing video files or image files)
def select_file_via_applescript(file_type="video"):
    if file_type == "image":
        prompt_text = "Select Poster Image File:"
        file_types_text = 'of type {"public.image", "jpeg", "png"}'
    else:
        prompt_text = "Select Video File for Movie Dekhba:"
        file_types_text = 'of type {"public.movie", "mp4", "mkv", "avi"}'
        
    script = f'POSIX path of (choose file with prompt "{prompt_text}" {file_types_text})'
    try:
        proc = subprocess.run(
            ['osascript', '-e', script],
            capture_output=True,
            text=True,
            check=True
        )
        return proc.stdout.strip()
    except subprocess.CalledProcessError:
        return ""

class LocalServerHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        parsed_url = urlparse(self.path)
        query = parse_qs(parsed_url.query)

        if parsed_url.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(HTML_TEMPLATE.encode('utf-8'))
        elif parsed_url.path == "/api/shows":
            shows = get_existing_shows()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(shows).encode('utf-8'))
        elif parsed_url.path == "/api/browse":
            browse_type = query.get("type", ["video"])[0]
            file_path = select_file_via_applescript(browse_type)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"filePath": file_path}).encode('utf-8'))
        elif parsed_url.path == "/api/fetch-metadata":
            title = query.get("title", [""])[0]
            category = query.get("category", ["movies"])[0]
            meta = fetch_api_metadata(title, category)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(meta).encode('utf-8'))
        elif parsed_url.path == "/api/progress":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(upload_status).encode('utf-8'))
        else:
            self.send_error(404, "File not found")

    def do_POST(self):
        parsed_url = urlparse(self.path)
        if parsed_url.path == "/api/upload":
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))

            import threading
            threading.Thread(target=process_and_upload, args=(payload,)).start()

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "initiated"}).encode('utf-8'))

def process_and_upload(payload):
    global upload_status
    try:
        ui_category = payload.get("category")
        series_id = payload.get("seriesId")
        season_val = payload.get("season")
        episode_val = payload.get("episode")
        title = payload.get("title")
        genre = payload.get("genre")
        rating = payload.get("rating", "8.0")
        poster = payload.get("poster", "")
        description = payload.get("description", "")
        file_path_str = payload.get("filePath")

        # 1. Input Check & File Verification
        local_file_path = Path(file_path_str).expanduser().resolve()
        if not local_file_path.exists():
            upload_status = {"status": "error", "progress": 0, "message": "Selected video file path not found."}
            return

        file_size_gb = local_file_path.stat().st_size / (1024 * 1024 * 1024)
        file_ext = local_file_path.suffix.lower()

        upload_file_path = local_file_path
        temp_file_path = None

        # 2. Local Poster Copy Logic (If poster is local file path)
        if poster and not poster.startswith("http") and Path(poster).exists():
            poster_path = Path(poster)
            dest_filename = f"poster_{poster_path.name}"
            dest_path = posters_dir / dest_filename
            shutil.copy(poster_path, dest_path)
            # Web URL becomes absolute public reference served by Vite
            poster = f"/posters/{dest_filename}"
            print(f"[Poster] Local image copied to client public folder: {poster}")

        # 3. Processing Phase
        upload_status = {
            "status": "processing",
            "progress": 20,
            "message": "Analyzing file container and size..."
        }

        needs_compression = file_size_gb > 1.2
        needs_remux = file_ext == ".mkv"

        if needs_compression:
            upload_status = {
                "status": "processing",
                "progress": 40,
                "message": "Large file detected (>1.2GB). Compressing using macOS GPU (H.265/HEVC)..."
            }
            temp_file_path = current_dir / f"temp_compressed_{local_file_path.stem}.mp4"
            cmd = [
                "ffmpeg", "-y", "-i", str(local_file_path),
                "-c:v", "hevc_videotoolbox", "-q:v", "65",
                "-c:a", "aac", "-b:a", "128k",
                str(temp_file_path)
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            upload_file_path = temp_file_path
        elif needs_remux:
            upload_status = {
                "status": "processing",
                "progress": 45,
                "message": "MKV file detected. Instantly remuxing to MP4 container..."
            }
            temp_file_path = current_dir / f"temp_remuxed_{local_file_path.stem}.mp4"
            cmd = [
                "ffmpeg", "-y", "-i", str(local_file_path),
                "-c:v", "copy",
                "-c:a", "aac", "-b:a", "128k",
                str(temp_file_path)
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            upload_file_path = temp_file_path

        # 4. Uploading Phase
        upload_status = {
            "status": "uploading",
            "progress": 60,
            "message": "Connecting to Telegram session..."
        }

        # Resolve DB category, tag and episode mode
        if ui_category == "anime_movie":
            category = "anime"
            hashtag = "#anime"
            is_episode = False
        elif ui_category == "anime_series":
            category = "anime"
            hashtag = "#anime"
            is_episode = True
        elif ui_category == "series":
            category = "series"
            hashtag = "#series"
            is_episode = True
        else:
            category = "movies"
            hashtag = "#movie"
            is_episode = False

        # Determine output variables based on folder hierarchy
        final_show_id = ""
        final_episode = ""
        final_season = ""
        
        if is_episode and series_id != "new":
            # EXISTING SERIES EPISODE
            final_show_id = series_id
            final_episode = episode_val
            final_season = season_val
            # Title inherits file name or standard Episode tag
            title_text = f"Episode {episode_val}"
            caption_parts = [
                f"Title: {title_text}",
                f"Show_ID: {final_show_id}"
            ]
            if final_season:
                caption_parts.append(f"Season: {final_season}")
            caption_parts.append(f"Episode: {final_episode}")
        else:
            # MOVIE OR NEW SERIES FOLDER CARD
            final_show_id = re.sub(r'[^a-zA-Z0-9-]', '', title.lower().replace(" ", "-")) if is_episode else ""
            caption_parts = [
                f"Title: {title}",
                f"Genre: {genre}",
                f"Rating: {rating}",
                f"Poster: {poster}",
                f"Description: {description}"
            ]
            if final_show_id:
                caption_parts.append(f"Show_ID: {final_show_id}")

        caption_parts.append(f"\n{hashtag}")
        caption_text = "\n".join(caption_parts)

        # Upload (using local session database file)
        client = TelegramClient(str(current_dir / "movie_dekhba_uploader"), int(api_id), api_hash)
        
        async def upload_task():
            await client.connect()
            
            def progress_callback(current, total):
                global upload_status
                fraction = current / total
                percent = int(60 + (fraction * 35))
                upload_status = {
                    "status": "uploading",
                    "progress": percent,
                    "message": f"Uploading: {current / 1024 / 1024:.1f}/{total / 1024 / 1024:.1f} MB"
                }

            await client.send_file(
                entity=CHANNEL_ID,
                file=upload_file_path,
                caption=caption_text,
                progress_callback=progress_callback,
                supports_streaming=True
            )
            await client.disconnect()

        with client:
            client.loop.run_until_complete(upload_task())

        # Cleanup
        if temp_file_path and temp_file_path.exists():
            temp_file_path.unlink()

        # Trigger automatic website catalog sync from Telegram
        try:
            sync_url = "http://localhost:5001/api/sync-telegram"
            req = urllib.request.Request(sync_url, method="POST")
            with urllib.request.urlopen(req) as resp:
                print("[Sync] Automatically triggered website Telegram sync: success!")
        except Exception as e:
            print(f"[Sync] Auto-sync trigger failed: {e}")

        upload_status = {
            "status": "completed",
            "progress": 100,
            "message": "Successfully uploaded to Telegram and automatically synced with website!"
        }

    except Exception as e:
        upload_status = {
            "status": "error",
            "progress": 0,
            "message": f"Upload failed: {str(e)}"
        }

if __name__ == "__main__":
    print("==================================================")
    print("Connecting and verifying Telegram session...")
    print("==================================================")
    print("If this is your first run, please check this terminal")
    print("window to enter your phone number and login code.")
    print("==================================================")

    # Initialize client and start it (triggers interactive terminal prompt if unauthorized)
    client = TelegramClient(str(current_dir / "movie_dekhba_uploader"), int(api_id), api_hash)
    try:
        client.start()
        print("\n[Telegram] Authenticated successfully!")
        client.disconnect()
    except Exception as e:
        print(f"\n[Telegram] Authentication failed: {e}")
        sys.exit(1)

    print(f"\nStarting Local Uploader Server on http://localhost:{PORT}")
    webbrowser.open(f"http://localhost:{PORT}")
    
    with socketserver.TCPServer(("", PORT), LocalServerHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            sys.exit(0)
