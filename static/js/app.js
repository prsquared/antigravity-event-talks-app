// Global state
let releaseEntries = [];
let activeFilter = 'all';
let searchQuery = '';
let selectedUpdate = null;

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const typeFilters = document.getElementById('type-filters');
const skeletonLoader = document.getElementById('skeleton-loader');
const emptyState = document.getElementById('empty-state');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const feedStream = document.getElementById('feed-stream');
const connectionStatus = document.getElementById('connection-status');
const warningBanner = document.getElementById('warning-banner');
const warningText = document.getElementById('warning-text');
const alertClose = document.querySelector('.alert-close');

// Stats elements
const statDays = document.getElementById('stat-days');
const statUpdates = document.getElementById('stat-updates');
const lastFetchedTime = document.getElementById('last-fetched-time');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCountText = document.getElementById('char-count');
const progressCircle = document.getElementById('progress-ring-circle');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const postTweetBtn = document.getElementById('post-tweet-btn');
const previewTitle = document.getElementById('preview-title');

// Toast Element
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Constants for character counter (Twitter Web Intent details)
const MAX_TWEET_CHARS = 280;
const TWITTER_SHORT_URL_LENGTH = 23; // Twitter counts all URLs as 23 chars

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Fetch release notes on load
    fetchReleases();

    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        renderFeed();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        renderFeed();
    });

    typeFilters.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        
        // Update active class
        document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
        pill.classList.add('active');
        
        activeFilter = pill.getAttribute('data-type');
        renderFeed();
    });

    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.filter-pill[data-type="all"]').classList.add('active');
        
        activeFilter = 'all';
        renderFeed();
    });

    // Alert banner close
    if (alertClose) {
        alertClose.addEventListener('click', () => {
            warningBanner.style.display = 'none';
        });
    }

    // Modal Close listeners
    closeModalBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });
    
    // Close on ESC
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('open')) {
            closeTweetModal();
        }
    });

    // Textarea input event for Twitter character counting
    tweetTextarea.addEventListener('input', updateCharCounter);

    // Clipboard copy action
    copyTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        navigator.clipboard.writeText(text)
            .then(() => showToast('Copied tweet to clipboard!'))
            .catch(() => showToast('Failed to copy. Please copy manually.', true));
    });

    // Twitter sharing action
    postTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const encodedText = encodeURIComponent(text);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        closeTweetModal();
    });
});

// Fetch Release Notes from API
async function fetchReleases(forceRefresh = false) {
    // Set loading states
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;
    connectionStatus.className = 'status-badge loading-status';
    connectionStatus.querySelector('.status-text').textContent = 'Fetching...';
    
    skeletonLoader.style.display = 'flex';
    feedStream.style.display = 'none';
    emptyState.style.display = 'none';
    warningBanner.style.display = 'none';

    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch release notes.');
        }

        // Store globally
        releaseEntries = data.entries || [];
        
        // Check warnings
        if (data.warning) {
            warningText.textContent = data.warning;
            warningBanner.style.display = 'flex';
        }

        // Update Stats
        updateStats(data);
        
        // Render Notes
        renderFeed();

        // Update status UI
        connectionStatus.className = 'status-badge connected';
        connectionStatus.querySelector('.status-text').textContent = 'Connected';
        
    } catch (error) {
        console.error("Error fetching release notes:", error);
        
        connectionStatus.className = 'status-badge disconnected';
        connectionStatus.querySelector('.status-text').textContent = 'Offline';
        
        warningText.textContent = `Error loading release notes: ${error.message}. Please try again later.`;
        warningBanner.style.display = 'flex';
        
        // Render empty feed with skeleton hidden
        skeletonLoader.style.display = 'none';
        feedStream.innerHTML = '';
        emptyState.style.display = 'block';
    } finally {
        refreshBtn.classList.remove('loading');
        refreshBtn.disabled = false;
    }
}

// Update Stats UI
function updateStats(data) {
    const totalDays = releaseEntries.length;
    let totalUpdates = 0;
    
    releaseEntries.forEach(entry => {
        totalUpdates += (entry.updates || []).length;
    });

    statDays.textContent = totalDays;
    statUpdates.textContent = totalUpdates;

    // Format last fetched time
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    lastFetchedTime.textContent = timeString;
}

// Client-side filtering & rendering of feed
function renderFeed() {
    skeletonLoader.style.display = 'none';
    
    // Filter the dataset
    const filteredEntries = [];
    
    releaseEntries.forEach(entry => {
        const matchingUpdates = (entry.updates || []).filter(update => {
            // Filter by Badge Type
            const typeMatch = activeFilter === 'all' || update.type.toLowerCase() === activeFilter;
            
            // Filter by Search Text
            const textMatch = !searchQuery || 
                              update.text.toLowerCase().includes(searchQuery) || 
                              update.type.toLowerCase().includes(searchQuery) ||
                              entry.date.toLowerCase().includes(searchQuery);
                              
            return typeMatch && textMatch;
        });

        if (matchingUpdates.length > 0) {
            filteredEntries.push({
                ...entry,
                updates: matchingUpdates
            });
        }
    });

    // Handle empty states
    if (filteredEntries.length === 0) {
        feedStream.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    feedStream.style.display = 'flex';
    feedStream.innerHTML = '';

    // Render grouped date entries
    filteredEntries.forEach(entry => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';

        // Header Date row
        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-header';
        dateHeader.innerHTML = `<h2>${entry.date}</h2>`;
        dateGroup.appendChild(dateHeader);

        // Sub updates container
        const updatesList = document.createElement('div');
        updatesList.className = 'updates-list';

        entry.updates.forEach(update => {
            const card = document.createElement('div');
            card.className = 'update-card';
            
            const badgeClass = update.type.toLowerCase();
            
            card.innerHTML = `
                <div class="card-header-row">
                    <span class="badge ${badgeClass}">${update.type}</span>
                    <div class="card-actions">
                        <button class="btn-icon-tweet" title="Select and Tweet this update">
                            <i class="fa-brands fa-x-twitter"></i>
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    ${update.html}
                </div>
            `;

            // Bind Event to Tweet Button
            const tweetBtn = card.querySelector('.btn-icon-tweet');
            tweetBtn.addEventListener('click', () => openTweetModal(entry, update));

            updatesList.appendChild(card);
        });

        dateGroup.appendChild(updatesList);
        feedStream.appendChild(dateGroup);
    });
}

// Open Tweet Composer Modal
function openTweetModal(entry, update) {
    selectedUpdate = { entry, update };
    
    // Update preview link details
    previewTitle.textContent = `BigQuery Release Notes (${entry.date})`;
    
    // Construct initial tweet text
    let typeEmoji = "📋";
    const typeLower = update.type.toLowerCase();
    if (typeLower.includes('feat')) typeEmoji = "🚀 New Feature";
    else if (typeLower.includes('issue') || typeLower.includes('bug')) typeEmoji = "⚠️ Note";
    else if (typeLower.includes('deprecat')) typeEmoji = "🛑 Deprecation";
    else if (typeLower.includes('chang')) typeEmoji = "⚙️ Change";

    // Clean text to avoid extra whitespace/newlines
    let cleanedText = update.text.replace(/\s+/g, ' ').trim();
    
    // Format: "🚀 New Feature on #BigQuery: Use Gemini Cloud Assist to analyze your SQL queries... \n\nDetails: https://docs.cloud.google.com/..."
    const link = update.update_link || entry.link;
    
    // Let's create a template
    const header = `${typeEmoji} on #BigQuery: `;
    const footer = `\n\nRead more: ${link} #GCP`;
    
    // Calculate space for text content. 
    // In Twitter, URLs are replaced by t.co (counts as 23 characters regardless of size)
    const mockFooterLength = `\n\nRead more: `.length + TWITTER_SHORT_URL_LENGTH + ` #GCP`.length;
    const reservedChars = header.length + mockFooterLength;
    const maxTextLength = MAX_TWEET_CHARS - reservedChars;
    
    if (cleanedText.length > maxTextLength) {
        cleanedText = cleanedText.substring(0, maxTextLength - 3) + "...";
    }

    const initialTweet = `${header}"${cleanedText}"${footer}`;
    
    tweetTextarea.value = initialTweet;
    
    // Update verification timestamp
    document.getElementById('mock-tweet-time').textContent = 'Just now';
    
    // Show Modal
    tweetModal.classList.add('open');
    tweetModal.style.display = 'flex';
    
    // Initial counter evaluation
    updateCharCounter();
    
    // Auto-focus textarea
    setTimeout(() => {
        tweetTextarea.focus();
        tweetTextarea.setSelectionRange(header.length + 1, header.length + 1 + Math.min(cleanedText.length, 30));
    }, 150);
}

// Close Tweet Composer Modal
function closeTweetModal() {
    tweetModal.classList.remove('open');
    setTimeout(() => {
        tweetModal.style.display = 'none';
        selectedUpdate = null;
    }, 250);
}

// Calculate Twitter Character Length
// Standard text length except links which always count as 23 chars
function calculateTwitterLength(text) {
    // Regex to match URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    // Subtract all URLs character lengths, then add 23 for each URL
    let textWithoutUrls = text;
    urls.forEach(url => {
        textWithoutUrls = textWithoutUrls.replace(url, '');
    });
    
    return textWithoutUrls.length + (urls.length * TWITTER_SHORT_URL_LENGTH);
}

// Update Twitter character progress indicator
function updateCharCounter() {
    const text = tweetTextarea.value;
    const charCount = calculateTwitterLength(text);
    const remaining = MAX_TWEET_CHARS - charCount;
    
    charCountText.textContent = remaining;
    
    // Color states for warnings
    if (remaining < 0) {
        charCountText.className = 'char-count-text danger';
        postTweetBtn.disabled = true;
        postTweetBtn.style.opacity = '0.5';
        postTweetBtn.style.cursor = 'not-allowed';
    } else if (remaining <= 20) {
        charCountText.className = 'char-count-text warning';
        postTweetBtn.disabled = false;
        postTweetBtn.style.opacity = '1';
        postTweetBtn.style.cursor = 'pointer';
    } else {
        charCountText.className = 'char-count-text';
        postTweetBtn.disabled = false;
        postTweetBtn.style.opacity = '1';
        postTweetBtn.style.cursor = 'pointer';
    }
    
    // SVG Progress ring details
    // r = 12, circumference = 2 * Math.PI * 12 = 75.398
    const circumference = 75.4;
    const percentage = Math.min(100, (charCount / MAX_TWEET_CHARS) * 100);
    const strokeOffset = circumference - (percentage / 100) * circumference;
    
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = strokeOffset;
    
    // Progress circle color alerts
    if (remaining < 0) {
        progressCircle.style.stroke = '#ef4444'; // Red
    } else if (remaining <= 20) {
        progressCircle.style.stroke = '#f59e0b'; // Amber
    } else {
        progressCircle.style.stroke = '#1d9bf0'; // Twitter Blue
    }
}

// Show Alert Toast
function showToast(message, isError = false) {
    toastMessage.textContent = message;
    toast.style.display = 'flex';
    
    if (isError) {
        toast.style.borderColor = '#ef4444';
        toast.querySelector('i').className = 'fa-solid fa-circle-xmark';
        toast.querySelector('i').style.color = '#ef4444';
    } else {
        toast.style.borderColor = '#10b981';
        toast.querySelector('i').className = 'fa-solid fa-circle-check';
        toast.querySelector('i').style.color = '#10b981';
    }
    
    // Delay to add class for animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto hide
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.style.display = 'none';
        }, 300);
    }, 3000);
}
