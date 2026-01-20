// Search Module - Search and filter logic with aggressive debouncing

import { calculateColorDistance } from './colorMath.js';

// Aggressive debounce function (500ms delay)
export function debounce(func, delay = 500) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// String similarity calculation (Levenshtein distance)
export function calculateStringSimilarity(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Quick exact match check
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    const len1 = s1.length;
    const len2 = s2.length;

    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    const matrix = [];

    for (let i = 0; i <= len2; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
        for (let j = 1; j <= len1; j++) {
            if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    const distance = matrix[len2][len1];
    const maxLen = Math.max(len1, len2);
    return 1 - (distance / maxLen);
}

// Filter colors by search term
export function filterColors(allColors, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        return allColors;
    }

    const term = searchTerm.toLowerCase().trim();

    return allColors.filter(color => {
        const codeMatch = color.code.toLowerCase().includes(term);
        const matchCodeMatch = color.matchCode && color.matchCode.toLowerCase().includes(term);
        return codeMatch || matchCodeMatch;
    });
}

// Find similar colors for suggestions
export function findSimilarColors(allColors, searchTerm, limit = 5) {
    return allColors
        .map(color => ({
            ...color,
            similarity: calculateStringSimilarity(searchTerm, color.code)
        }))
        .filter(color => color.similarity > 0.3)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
}

// Search suggestions with debouncing
export function createSuggestionsHandler(allColors, suggestionsContainer, searchBox) {
    const SUGGESTIONS_DELAY = 300; // Faster for autocomplete
    const MIN_SEARCH_LENGTH = 2;
    const MAX_SUGGESTIONS = 10;

    const debouncedSuggest = debounce((searchTerm) => {
        if (searchTerm.length < MIN_SEARCH_LENGTH) {
            suggestionsContainer.classList.remove('visible');
            return;
        }

        const suggestions = allColors
            .filter(color =>
                color.code.toLowerCase().includes(searchTerm) ||
                (color.matchCode && color.matchCode.toLowerCase().includes(searchTerm))
            )
            .slice(0, MAX_SUGGESTIONS);

        if (suggestions.length > 0) {
            suggestionsContainer.innerHTML = suggestions.map(color => `
                <div class="suggestion-item" data-code="${color.code}">
                    <div class="suggestion-color" style="background-color: rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})"></div>
                    <div class="suggestion-text">
                        <div>${color.code}</div>
                        <div class="suggestion-type">${color.type === 'thread' ? 'Thread' : 'Pantone'}</div>
                    </div>
                </div>
            `).join('');
            suggestionsContainer.classList.add('visible');
        } else {
            suggestionsContainer.classList.remove('visible');
        }
    }, SUGGESTIONS_DELAY);

    return (e) => {
        const searchTerm = e.target.value.toLowerCase();
        debouncedSuggest(searchTerm);
    };
}

// Initialize suggestions container
export function initSuggestions(searchBox, allColors, onSelect) {
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'suggestions-container';
    searchBox.parentNode.appendChild(suggestionsContainer);

    // Add input listener
    const suggestionsHandler = createSuggestionsHandler(allColors, suggestionsContainer, searchBox);
    searchBox.addEventListener('input', suggestionsHandler);

    // Add click listener for suggestions
    suggestionsContainer.addEventListener('click', (e) => {
        const suggestionItem = e.target.closest('.suggestion-item');
        if (suggestionItem) {
            const code = suggestionItem.dataset.code;
            searchBox.value = code;
            suggestionsContainer.classList.remove('visible');
            onSelect(code);
        }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchBox.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.classList.remove('visible');
        }
    });

    return suggestionsContainer;
}

// Main search function with aggressive debouncing
export function createSearchHandler(allColors, threadData, pantoneData, displayFunction, method = 'rgb', factorInShimmer = false) {
    const SEARCH_DELAY = 500; // Aggressive debouncing

    const performSearch = debounce((searchTerm, matchMethod) => {
        if (searchTerm.trim() === '') {
            displayFunction(allColors, 1);
            return;
        }

        // Filter colors
        const filtered = filterColors(allColors, searchTerm);

        if (filtered.length === 0) {
            // Show suggestions
            const suggestions = findSimilarColors(allColors, searchTerm, 5);
            const noResultsEvent = new CustomEvent('no-results', {
                detail: { searchTerm, suggestions }
            });
            document.dispatchEvent(noResultsEvent);
            return;
        }

        // Update matches for pantone colors in results
        filtered.forEach(color => {
            if (color.type === 'pantone') {
                updatePantoneMatches(color, threadData, matchMethod, factorInShimmer);
            }
        });

        displayFunction(filtered, 1);
    }, SEARCH_DELAY);

    return performSearch;
}

// Update pantone matches
function updatePantoneMatches(pantoneColor, threadData, matchMethod, factorInShimmer) {
    const allThreads = threadData.map(thread => ({
        code: thread.code,
        rgb: thread.rgb,
        type: 'thread'
    }));

    const threadsWithDistance = allThreads.map(thread => ({
        ...thread,
        distance: calculateColorDistance(pantoneColor.rgb, thread.rgb, matchMethod, factorInShimmer)
    }));

    const sortedThreads = threadsWithDistance.sort((a, b) => a.distance - b.distance);
    const bestMatches = sortedThreads.slice(0, 4);

    if (bestMatches.length > 0) {
        const bestMatch = bestMatches[0];
        pantoneColor.matchCode = bestMatch.code;
        pantoneColor.matchRgb = bestMatch.rgb;
        pantoneColor.distance = bestMatch.distance;
        pantoneColor.matchMethod = matchMethod;
        pantoneColor.matchType = 'thread';

        if (bestMatches.length > 1) {
            pantoneColor.alternativeMatches = bestMatches.slice(1);
        }
    }
}

// Batch search optimization - process colors in batches
export function batchProcessColors(colors, batchSize = 100, processor, onComplete) {
    let index = 0;

    function processBatch() {
        const batch = colors.slice(index, index + batchSize);
        batch.forEach(processor);
        index += batchSize;

        if (index < colors.length) {
            // Use requestIdleCallback if available, otherwise setTimeout
            if ('requestIdleCallback' in window) {
                requestIdleCallback(processBatch);
            } else {
                setTimeout(processBatch, 0);
            }
        } else {
            onComplete();
        }
    }

    processBatch();
}

// Throttle function for high-frequency events
export function throttle(func, limit = 100) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
