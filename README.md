# BigQuery Release Notes Explorer & Tweet Composer

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/prsquared/antigravity-event-talks-app)
[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue)](https://www.python.org/)
[![Flask Version](https://img.shields.io/badge/flask-3.0%2B-green)](https://flask.palletsprojects.com/)

A sleek, modern web application built using Python Flask, plain HTML, CSS, and JavaScript. It fetches the latest Google Cloud BigQuery release notes, parses them into granular updates, allows keyword searching and category filtering, and integrates a customized Tweet Composer with character-count analytics to draft and post updates on X (Twitter).

The repository has been successfully pushed and is hosted on GitHub at:
👉 **[https://github.com/prsquared/antigravity-event-talks-app](https://github.com/prsquared/antigravity-event-talks-app)**

## Features

- **Automatic XML Feed Parsing**: Fetches the official [BigQuery Release Notes RSS/Atom Feed](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml) and splits daily-aggregated logs into distinct, easy-to-read cards.
- **Client-Side Filters & Search**: 
  - Real-time text search across all release dates, update contents, and type categories.
  - Category filter pills (e.g., Features, Issues, Deprecations, Changes) with corresponding color-coded visual indicator badges.
- **Robust In-Memory Caching**: Implements a 5-minute cache TTL on feed fetches to guarantee fast load times and avoid rate-limiting or overloading the Google feeds server. Supports force-refreshing via the frontend refresh button.
- **Interactive Tweet Composer**:
  - Automatically drafts a formatted tweet when clicking the X/Twitter button on any release card.
  - Dynamically calculates the tweet length using Twitter rules (treating all URLs as 23 characters).
  - Displays a visual SVG progress ring and color warnings as you approach or exceed the 280-character limit.
  - Quick buttons to copy text to clipboard or post directly on X via Web Intents.
- **Modern Glow Aesthetics**: A responsive, custom dark mode layout utilizing a curated slate/blue color scheme, custom typography (Outfit), shimmer skeleton loading screens, and smooth micro-animations.

## Project Structure

- `app.py`: Flask application server with caching, XML parsing, and JSON API routing.
- `templates/index.html`: Dashboard template containing HTML structures, filters, lists, and the modal dialog.
- `static/css/styles.css`: CSS styles defining CSS color variables, grids, badging, overlays, progress rings, and animations.
- `static/js/app.js`: Client-side logic for fetching, rendering, filtering, searching, and managing the Tweet composer.

---

## Technical Details

For a deeper look into the code, architecture, and step-by-step request-response flow of this application, please refer to our internal [Technical Architecture Guide](file:///C:/Users/geetu/.gemini/antigravity-cli/brain/cf158af9-1659-46af-a2b1-5a4443366aa7/project_architecture_guide.md).

---

## How to Run It

### The Server is Already Running!
The application server has already been started as a background process during this session and is currently running at:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

You can open this URL in your web browser to interact with the application.

---

### Running Manually

If you need to restart the server or run it manually in the future, follow these steps:

#### 1. Activate the Virtual Environment
Open a terminal in the project directory (`C:\kaggle\agy-cli-projects`) and run:

**For PowerShell:**
```powershell
.\.venv\Scripts\Activate.ps1
```

**For Command Prompt / CMD:**
```cmd
.venv\Scripts\activate.bat
```

#### 2. Install Dependencies (If needed)
If you are moving the project to another workspace:
```bash
pip install flask requests feedparser beautifulsoup4
```

#### 3. Run the Flask Server
Run the Flask server script:
```bash
python app.py
```
This will host the dashboard at `http://127.0.0.1:5000`.
