// Search Module - Search and filter logic with aggressive debouncing

import { calculateColorDistance } from './colorMath.js';

// Hash maps for O(1) color code lookups
let colorCodeMap = new Map();
let matchCodeMap = new Map();

// Prefix tree (Trie) for fast autocomplete
class TrieNode {
    constructor() {
        this.children = new Map();
        this.colors = [];
        this.isEndOfWord = false;
    }
}

class PrefixTrie {
    constructor() {
        this.root = new TrieNode();
    }

    insert(word, color) {
        let node = this.root;
        const lowerWord = word.toLowerCase();

        for (const char of lowerWord) {
            if (!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }
            node = node.children.get(char);
            // Store color at each node for prefix matching
            if (node.colors.length < 10) {
                node.colors.push(color);
            }
        }
        node.isEndOfWord = true;
        node.colors.push(color);
    }

    search(prefix, limit = 10) {
        let node = this.root;
        const lowerPrefix = prefix.toLowerCase();

        // Traverse to the end of prefix
        for (const char of lowerPrefix) {
            if (!node.children.has(char)) {
                return [];
            }
            node = node.children.get(char);
        }

        // Collect all colors with this prefix
        const results = new Set();
        this._collectColors(node, results, limit);
        return Array.from(results).slice(0, limit);
    }

    _collectColors(node, results, limit) {
        if (results.size >= limit) return;

        // Add colors from current node
        for (const color of node.colors) {
            if (results.size >= limit) return;
            results.add(color);
        }

        // Recursively collect from children
        for (const child of node.children.values()) {
            if (results.size >= limit) return;
            this._collectColors(child, results, limit);
        }
    }

    clear() {
        this.root = new TrieNode();
    }
}

let colorTrie = new PrefixTrie();

// Build hash maps and trie from color data
export function buildColorMaps(allColors) {
    colorCodeMap.clear();
    matchCodeMap.clear();
    colorTrie.clear();

    allColors.forEach(color => {
        const lowerCode = color.code.toLowerCase();
        colorCodeMap.set(lowerCode, color);
        colorTrie.insert(lowerCode, color);

        if (color.matchCode) {
            const lowerMatchCode = color.matchCode.toLowerCase();
            if (!matchCodeMap.has(lowerMatchCode)) {
                matchCodeMap.set(lowerMatchCode, []);
            }
            matchCodeMap.get(lowerMatchCode).push(color);
            colorTrie.insert(lowerMatchCode, color);
        }
    });

    console.log(`Built search indexes: ${colorCodeMap.size} codes, ${matchCodeMap.size} match codes, trie ready`);
}

// Clear hash maps and trie (for memory cleanup if needed)
export function clearColorMaps() {
    colorCodeMap.clear();
    matchCodeMap.clear();
    colorTrie.clear();
}

// Aggressive debounce function (500ms delay)
export function debounce(func, delay = 500) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// String similarity calculation (Levenshtein distance) - optimized with early termination
export function calculateStringSimilarity(str1, str2, threshold = 0.3) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Quick exact match check
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    const len1 = s1.length;
    const len2 = s2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Early termination: if length difference is too large, similarity will be below threshold
    const maxLen = Math.max(len1, len2);
    const minLen = Math.min(len1, len2);
    if ((maxLen - minLen) / maxLen > (1 - threshold)) {
        return 0;
    }

    // Use single array instead of 2D matrix for better memory efficiency
    let prevRow = new Array(len1 + 1);
    let currRow = new Array(len1 + 1);

    // Initialize first row
    for (let j = 0; j <= len1; j++) {
        prevRow[j] = j;
    }

    // Calculate distance with early termination
    const maxDistance = Math.floor(maxLen * (1 - threshold));

    for (let i = 1; i <= len2; i++) {
        currRow[0] = i;
        let minInRow = i;

        for (let j = 1; j <= len1; j++) {
            if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
                currRow[j] = prevRow[j - 1];
            } else {
                currRow[j] = Math.min(
                    prevRow[j - 1] + 1,  // substitution
                    currRow[j - 1] + 1,  // insertion
                    prevRow[j] + 1       // deletion
                );
            }
            minInRow = Math.min(minInRow, currRow[j]);
        }

        // Early termination: if minimum in this row exceeds threshold, bail out
        if (minInRow > maxDistance) {
            return 0;
        }

        // Swap rows
        [prevRow, currRow] = [currRow, prevRow];
    }

    const distance = prevRow[len1];
    return 1 - (distance / maxLen);
}

// Filter colors by search term (optimized with hash map)
export function filterColors(allColors, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        return allColors;
    }

    const term = searchTerm.toLowerCase().trim();

    // Fast path: exact match using hash map
    const exactMatch = colorCodeMap.get(term);
    if (exactMatch) {
        return [exactMatch];
    }

    // Check match code map
    const matchCodeMatches = matchCodeMap.get(term);
    if (matchCodeMatches && matchCodeMatches.length > 0) {
        return matchCodeMatches;
    }

    // Fall back to substring search for partial matches
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

// Search suggestions with debouncing (optimized with Trie)
export function createSuggestionsHandler(allColors, suggestionsContainer, searchBox) {
    const SUGGESTIONS_DELAY = 300; // Faster for autocomplete
    const MIN_SEARCH_LENGTH = 2;
    const MAX_SUGGESTIONS = 10;

    const debouncedSuggest = debounce((searchTerm) => {
        if (searchTerm.length < MIN_SEARCH_LENGTH) {
            suggestionsContainer.classList.remove('visible');
            return;
        }

        // Use trie for prefix search (much faster than filtering entire array)
        let suggestions = colorTrie.search(searchTerm, MAX_SUGGESTIONS);

        // If trie doesn't yield enough results, fall back to substring search
        if (suggestions.length < MAX_SUGGESTIONS) {
            const additionalSuggestions = allColors
                .filter(color => {
                    const inResults = suggestions.some(s => s.code === color.code);
                    if (inResults) return false;
                    return color.code.toLowerCase().includes(searchTerm) ||
                           (color.matchCode && color.matchCode.toLowerCase().includes(searchTerm));
                })
                .slice(0, MAX_SUGGESTIONS - suggestions.length);

            suggestions = [...suggestions, ...additionalSuggestions];
        }

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
