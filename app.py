import os
import time
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION = 300  # 5 minutes in seconds

def clean_html_content(html_str):
    """
    Cleans HTML strings and formats them.
    Makes sure links open in a new tab by adding target="_blank" and rel="noopener noreferrer".
    """
    if not html_str:
        return ""
    soup = BeautifulSoup(html_str, 'html.parser')
    for a in soup.find_all('a'):
        a['target'] = '_blank'
        a['rel'] = 'noopener noreferrer'
    return str(soup)

def parse_release_notes():
    """
    Fetches the BigQuery XML feed and parses it.
    Splits feed entries (which are aggregated by day) into individual updates.
    """
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        # Parse XML using feedparser
        feed = feedparser.parse(response.content)
        
        parsed_entries = []
        
        for entry_idx, entry in enumerate(feed.entries):
            title_date = entry.get('title', 'Unknown Date')
            entry_id = entry.get('id', f"entry-{entry_idx}")
            link = entry.get('link', '')
            
            # Content can be in 'summary' or 'content'
            content_html = entry.get('summary', '')
            if not content_html and 'content' in entry and entry.content:
                content_html = entry.content[0].value
                
            if not content_html:
                continue
                
            soup = BeautifulSoup(content_html, 'html.parser')
            
            updates = []
            current_type = None
            current_elements = []
            
            # Helper to commit current update
            def add_current_update(u_type, u_elements, sub_idx):
                if not u_type:
                    return
                html_content = "".join(str(e) for e in u_elements)
                cleaned_html = clean_html_content(html_content)
                text_content = "".join(e.get_text() for e in u_elements).strip()
                
                updates.append({
                    "id": f"{entry_id}-sub-{sub_idx}",
                    "type": u_type,
                    "html": cleaned_html,
                    "text": text_content
                })

            sub_idx = 0
            for child in soup.contents:
                if isinstance(child, str) and not child.strip():
                    continue
                    
                if child.name == 'h3':
                    add_current_update(current_type, current_elements, sub_idx)
                    sub_idx += 1
                    current_type = child.get_text().strip()
                    current_elements = []
                else:
                    if current_type is not None:
                        current_elements.append(child)
                    else:
                        # Fallback if text appears before the first <h3>
                        current_type = "Update"
                        current_elements.append(child)
                        
            # Add final update
            add_current_update(current_type, current_elements, sub_idx)
            
            parsed_entries.append({
                "date": title_date,
                "id": entry_id,
                "link": link,
                "updates": updates
            })
            
        return {
            "success": True,
            "entries": parsed_entries,
            "updated_at": feed.feed.get('updated', ''),
            "source": "live"
        }
        
    except Exception as e:
        print(f"Error parsing release notes: {e}")
        return {
            "success": False,
            "error": str(e),
            "entries": []
        }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    if force_refresh or not cache["data"] or (current_time - cache["last_fetched"] > CACHE_DURATION):
        print("Fetching fresh data from BigQuery Release Notes RSS Feed...")
        result = parse_release_notes()
        if result["success"]:
            cache["data"] = result
            cache["last_fetched"] = current_time
        else:
            # If fetch fails but we have cached data, return cached with warning
            if cache["data"]:
                cached_res = cache["data"].copy()
                cached_res["source"] = "cached (fallback due to error)"
                cached_res["warning"] = f"Failed to refresh: {result['error']}"
                return jsonify(cached_res)
            return jsonify(result), 502
            
    # Return cached data
    res = cache["data"].copy()
    res["source"] = "cache"
    res["cache_age_seconds"] = int(current_time - cache["last_fetched"])
    return jsonify(res)

if __name__ == '__main__':
    # Verify templates directory exists
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static/css', exist_ok=True)
    os.makedirs('static/js', exist_ok=True)
    
    print("Starting BigQuery Release Notes Web App on http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=True)
