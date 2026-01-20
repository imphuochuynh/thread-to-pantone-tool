// Storage Module - localStorage operations

// Theme management
export function getTheme() {
    return localStorage.getItem('theme');
}

export function setTheme(theme) {
    localStorage.setItem('theme', theme);
}

// Pinned swatches management
export function getPinnedSwatches() {
    const saved = localStorage.getItem('pinnedPantoneSwatches');
    return saved ? JSON.parse(saved) : [];
}

export function setPinnedSwatches(swatches) {
    localStorage.setItem('pinnedPantoneSwatches', JSON.stringify(swatches));
}

export function addPinnedSwatch(swatch) {
    const pinned = getPinnedSwatches();
    // Avoid duplicates
    if (!pinned.some(s => s.code === swatch.code)) {
        pinned.push(swatch);
        setPinnedSwatches(pinned);
    }
}

export function removePinnedSwatch(code) {
    const pinned = getPinnedSwatches();
    const filtered = pinned.filter(s => s.code !== code);
    setPinnedSwatches(filtered);
}

export function isPinned(code) {
    const pinned = getPinnedSwatches();
    return pinned.some(s => s.code === code);
}

// Recent matches management
const MAX_RECENT_MATCHES = 10;

export function getRecentMatches() {
    const saved = localStorage.getItem('recentMatches');
    return saved ? JSON.parse(saved) : [];
}

export function setRecentMatches(matches) {
    localStorage.setItem('recentMatches', JSON.stringify(matches));
}

export function addRecentMatch(sourceColor, matchedColor) {
    const recent = getRecentMatches();

    const matchData = {
        sourceCode: sourceColor.code,
        sourceType: sourceColor.type,
        sourceRgb: sourceColor.rgb,
        matchCode: matchedColor.code || matchedColor.matchCode,
        matchType: matchedColor.type || matchedColor.matchType,
        matchRgb: matchedColor.rgb || matchedColor.matchRgb,
        distance: matchedColor.distance,
        method: matchedColor.matchMethod || 'rgb',
        timestamp: Date.now()
    };

    // Check if this exact match already exists
    const existingIndex = recent.findIndex(m =>
        m.sourceCode === matchData.sourceCode && m.matchCode === matchData.matchCode
    );

    if (existingIndex !== -1) {
        // Update timestamp and move to front
        recent.splice(existingIndex, 1);
    }

    // Add to front of array
    recent.unshift(matchData);

    // Keep only the most recent matches
    const trimmed = recent.slice(0, MAX_RECENT_MATCHES);
    setRecentMatches(trimmed);
}

export function clearRecentMatches() {
    localStorage.removeItem('recentMatches');
}

// Preferences management
export function getPreference(key, defaultValue = null) {
    const value = localStorage.getItem(key);
    return value !== null ? value : defaultValue;
}

export function setPreference(key, value) {
    localStorage.setItem(key, value);
}

export function removePreference(key) {
    localStorage.removeItem(key);
}

// Clear all app data
export function clearAllData() {
    localStorage.removeItem('pinnedPantoneSwatches');
    localStorage.removeItem('recentMatches');
}

// Export all data for backup
export function exportData() {
    return {
        theme: getTheme(),
        pinnedSwatches: getPinnedSwatches(),
        recentMatches: getRecentMatches(),
        timestamp: Date.now()
    };
}

// Import data from backup
export function importData(data) {
    if (data.theme) setTheme(data.theme);
    if (data.pinnedSwatches) setPinnedSwatches(data.pinnedSwatches);
    if (data.recentMatches) setRecentMatches(data.recentMatches);
}
