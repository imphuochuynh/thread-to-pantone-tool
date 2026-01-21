// Main Application Module
import { hexToRgb, calculateColorDistance, findClosestColors, rgbToLab } from './colorMath.js';
import { getTheme, setTheme, addRecentMatch, getPinnedSwatches } from './storage.js';
import {
    displayColors,
    showStatus,
    showLoading,
    showNoResults,
    setFactorInShimmer,
    initLazyLoading,
    getCurrentPage
} from './ui.js';
import {
    debounce,
    filterColors,
    findSimilarColors,
    initSuggestions,
    createSearchHandler,
    batchProcessColors,
    buildColorMaps
} from './search.js';

// Global state
let threadData = [];
let pantoneData = [];
let pantoneToThreadData = [];
let allColors = [];
let filteredColors = [];
let colorMatchMethod = 'rgb';
let factorInShimmer = false;
let colorWorker = null;

// Initialize Web Worker
function initWorker() {
    if (window.Worker) {
        try {
            colorWorker = new Worker('colorWorker.js');
            colorWorker.addEventListener('error', (e) => {
                console.error('Worker error:', e);
                colorWorker = null; // Fallback to main thread
            });
            console.log('Web Worker initialized for color calculations');
        } catch (e) {
            console.warn('Failed to initialize Web Worker, using main thread:', e);
        }
    }
}

// DOMContentLoaded initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Web Worker
    initWorker();

    // Initialize lazy loading
    initLazyLoading();

    // Theme management
    initTheme();

    // Load color data
    loadColorData();

    // Initialize event listeners
    initEventListeners();
});

// Theme initialization
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = getTheme();
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const userTime = new Date().toLocaleString('en-US', { timeZone: userTimezone, hour: 'numeric', hour12: false });
    const userHour = parseInt(userTime);
    const isDayTime = userHour >= 6 && userHour < 18;

    if (savedTheme) {
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.checked = true;
        }
    } else {
        if (!isDayTime) {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.checked = true;
            setTheme('dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            themeToggle.checked = false;
            setTheme('light');
        }
    }

    themeToggle.addEventListener('change', function() {
        if (this.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            setTheme('dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            setTheme('light');
        }
    });
}

// Load color data
async function loadColorData() {
    showStatus('Loading thread data...', true);
    try {
        // Load thread data
        const threadResponse = await fetch('Reformatted_Embroidery_Thread_Data.csv');
        const threadCsvText = await threadResponse.text();

        Papa.parse(threadCsvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                threadData = results.data.map(row => {
                    const rgb = {
                        r: parseInt(row['R']),
                        g: parseInt(row['G']),
                        b: parseInt(row['B'])
                    };
                    return {
                        type: 'thread',
                        code: row['Thread Code'],
                        rgb: rgb,
                        lab: rgbToLab(rgb) // Pre-compute LAB values
                    };
                });
                console.log(`Loaded ${threadData.length} thread colors (with pre-computed LAB)`);
                showStatus(`Loaded ${threadData.length} thread colors`, false);
                loadPantoneData();
            },
            error: function(error) {
                console.error('Error parsing thread data:', error);
                document.getElementById('results').innerHTML =
                    `<div class="no-results">Error loading thread data: ${error.message}</div>`;
                showStatus('Error loading thread data', false);
            }
        });
    } catch (error) {
        console.error('Error loading color data:', error);
        document.getElementById('results').innerHTML =
            `<div class="no-results">Error loading color data: ${error.message}</div>`;
        showStatus('Error loading color data', false);
    }
}

async function loadPantoneData() {
    try {
        const pantoneResponse = await fetch('all_pantone_colors_with_rgb.json');
        const pantoneJson = await pantoneResponse.json();

        pantoneData = pantoneJson.pantone_colors.map(color => {
            const rgb = {
                r: color.rgb.r,
                g: color.rgb.g,
                b: color.rgb.b
            };
            return {
                type: 'pantone',
                code: color.name.trim(),
                rgb: rgb,
                lab: rgbToLab(rgb) // Pre-compute LAB values
            };
        });
        console.log(`Loaded ${pantoneData.length} Pantone colors (with pre-computed LAB)`);
        loadMatchData();
    } catch (error) {
        console.error('Error loading Pantone data:', error);
        document.getElementById('results').innerHTML =
            `<div class="no-results">Error loading Pantone data: ${error.message}</div>`;
    }
}

async function loadMatchData() {
    try {
        const matchesResponse = await fetch('matched_Pantone_to_embroidery_threads.csv');
        const matchesCsvText = await matchesResponse.text();

        Papa.parse(matchesCsvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                pantoneToThreadData = results.data.map(row => {
                    const pantoneRgbStr = row['Pantone RGB'].replace(/[()"\s]/g, '').split(',');
                    const threadRgbStr = row['Matched RGB'].replace(/[()"\s]/g, '').split(',');

                    return {
                        pantoneCode: row['Pantone Color'].trim(),
                        pantoneRgb: {
                            r: parseInt(pantoneRgbStr[0]),
                            g: parseInt(pantoneRgbStr[1]),
                            b: parseInt(pantoneRgbStr[2])
                        },
                        threadCode: row['Matched Thread Code'].trim(),
                        threadRgb: {
                            r: parseInt(threadRgbStr[0]),
                            g: parseInt(threadRgbStr[1]),
                            b: parseInt(threadRgbStr[2])
                        },
                        distance: parseFloat(row['Distance'])
                    };
                }).filter(item => item !== null);

                console.log(`Loaded ${pantoneToThreadData.length} Pantone to thread matches`);
                processAndDisplayData();
            },
            error: function(error) {
                console.error('Error parsing match data:', error);
                document.getElementById('results').innerHTML =
                    `<div class="no-results">Error loading match data: ${error.message}</div>`;
            }
        });
    } catch (error) {
        console.error('Error loading match data:', error);
        document.getElementById('results').innerHTML =
            `<div class="no-results">Error loading match data: ${error.message}</div>`;
    }
}

function processAndDisplayData() {
    allColors = [...threadData, ...pantoneData];
    console.log(`Combined ${allColors.length} total colors`);

    // Build hash maps for O(1) lookups
    buildColorMaps(allColors);

    const selectedMethod = document.querySelector('input[name="searchColorMatchMethod"]:checked')?.value || 'rgb';

    // Use batch processing with Web Worker if available
    if (colorWorker) {
        processWithWorker(selectedMethod);
    } else {
        processWithMainThread(selectedMethod);
    }
}

function processWithWorker(method) {
    showStatus('Processing color matches (using Web Worker)...', true);

    // Process in batches
    const batchSize = 50;
    let processed = 0;

    function processBatch(start) {
        const end = Math.min(start + batchSize, threadData.length);
        const batch = threadData.slice(start, end);

        colorWorker.postMessage({
            type: 'batchProcess',
            data: {
                sourceColors: batch,
                targetColors: pantoneData,
                method: method,
                factorInShimmer: factorInShimmer
            }
        });

        colorWorker.addEventListener('message', function handler(e) {
            if (e.data.type === 'result') {
                // Apply results to thread data
                e.data.result.forEach((result, index) => {
                    const thread = batch[index];
                    if (result.matches.length > 0) {
                        const bestMatch = result.matches[0];
                        thread.matchCode = bestMatch.code;
                        thread.matchRgb = bestMatch.rgb;
                        thread.distance = bestMatch.distance;
                        thread.matchMethod = method;
                        thread.matchType = 'pantone';

                        if (result.matches.length > 1) {
                            thread.alternativeMatches = result.matches.slice(1, 4);
                        }
                    }
                });

                processed += batch.length;

                if (end < threadData.length) {
                    processBatch(end);
                } else {
                    // Process pantone data similarly
                    processPantoneWithMainThread(method);
                }

                colorWorker.removeEventListener('message', handler);
            }
        });
    }

    processBatch(0);
}

function processWithMainThread(method) {
    showStatus('Processing color matches...', true);

    // Enhance thread data with pantone matches
    batchProcessColors(threadData, 100, (thread) => {
        const matches = pantoneToThreadData
            .filter(m => m.threadCode === thread.code)
            .sort((a, b) => a.distance - b.distance);

        const additionalMatches = findClosestColors(thread.rgb, pantoneData, 3, method, factorInShimmer, matches.map(m => m.pantoneCode));

        const allMatches = [
            ...matches.map(m => ({
                code: m.pantoneCode,
                rgb: m.pantoneRgb,
                distance: m.distance,
                type: 'pantone'
            })),
            ...additionalMatches
        ].sort((a, b) => a.distance - b.distance);

        if (allMatches.length > 0) {
            const bestMatch = allMatches[0];
            thread.matchCode = bestMatch.code;
            thread.matchRgb = bestMatch.rgb;
            thread.distance = bestMatch.distance;
            thread.matchMethod = method;
            thread.matchType = 'pantone';

            if (allMatches.length > 1) {
                thread.alternativeMatches = allMatches.slice(1, 4);
            }
        }
    }, () => {
        processPantoneWithMainThread(method);
    });
}

function processPantoneWithMainThread(method) {
    // Enhance pantone data with thread matches
    pantoneData.forEach(pantone => {
        const allThreads = threadData.map(thread => ({
            code: thread.code,
            rgb: thread.rgb,
            type: 'thread'
        }));

        const allThreadsWithDistance = allThreads.map(thread => ({
            ...thread,
            distance: calculateColorDistance(pantone.rgb, thread.rgb, method, factorInShimmer)
        }));

        const sortedThreads = allThreadsWithDistance.sort((a, b) => a.distance - b.distance);
        const bestMatches = sortedThreads.slice(0, 4);

        if (bestMatches.length > 0) {
            const bestMatch = bestMatches[0];
            pantone.matchCode = bestMatch.code;
            pantone.matchRgb = bestMatch.rgb;
            pantone.distance = bestMatch.distance;
            pantone.matchMethod = method;
            pantone.matchType = 'thread';

            if (bestMatches.length > 1) {
                pantone.alternativeMatches = bestMatches.slice(1);
            }
        }
    });

    filteredColors = allColors;
    displayColors(filteredColors, 1);
    showStatus('Ready', false, 2000);
}

// Initialize event listeners
function initEventListeners() {
    // Search
    const searchBox = document.getElementById('colorSearch');
    initSuggestions(searchBox, allColors, (code) => {
        const event = new Event('input');
        searchBox.dispatchEvent(event);
    });

    const searchHandler = createSearchHandler(allColors, threadData, pantoneData, displayColors, colorMatchMethod, factorInShimmer);
    searchBox.addEventListener('input', debounce((e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (searchTerm.trim() === '') {
            filteredColors = allColors;
            displayColors(filteredColors, 1);
        } else {
            const filtered = filterColors(allColors, searchTerm);
            if (filtered.length === 0) {
                const suggestions = findSimilarColors(allColors, searchTerm, 5);
                showNoResults(searchTerm, suggestions);
            } else {
                filteredColors = filtered;
                displayColors(filteredColors, 1);
            }
        }
    }, 500));

    // Pagination
    document.getElementById('prevPage').addEventListener('click', () => {
        const currentPage = getCurrentPage();
        if (currentPage > 1) {
            displayColors(filteredColors, currentPage - 1);
        }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
        const currentPage = getCurrentPage();
        displayColors(filteredColors, currentPage + 1);
    });

    // Color matching method
    document.querySelectorAll('input[name="searchColorMatchMethod"]').forEach(radio => {
        radio.addEventListener('change', function() {
            colorMatchMethod = this.value;
            updateResults();
        });
    });

    // Shimmer checkbox
    document.getElementById('factorInShimmer').addEventListener('change', function() {
        factorInShimmer = this.checked;
        setFactorInShimmer(this.checked);
        updateResults();
    });

    // Color picker
    initColorPicker();

    // Reset button
    document.getElementById('resetColors').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('colorSearch').value = '';
        document.getElementById('hexInput').value = '';
        document.querySelector('.hex-preview').style.backgroundColor = 'transparent';
        document.getElementById('hexSubmit').disabled = true;

        filteredColors = allColors;
        displayColors(filteredColors, 1);
        showStatus('Colors reset to default view', false);
    });

    // Mobile alternatives sections
    document.addEventListener('click', function(e) {
        if (e.target.closest('.alternatives-title') && window.innerWidth <= 600) {
            const alternativesSection = e.target.closest('.alternatives-section');
            alternativesSection.classList.toggle('collapsed');

            const isCollapsed = alternativesSection.classList.contains('collapsed');
            showStatus(`Alternative matches ${isCollapsed ? 'collapsed' : 'expanded'}`, false, 2000);
        }
    });

    // Initialize alternatives as collapsed on mobile
    function initializeAlternativesSections() {
        if (window.innerWidth <= 600) {
            document.querySelectorAll('.alternatives-section').forEach(section => {
                section.classList.add('collapsed');
            });
        }
    }

    initializeAlternativesSections();
    window.addEventListener('resize', debounce(initializeAlternativesSections, 250));
}

// Color picker
function initColorPicker() {
    const colorPreview = document.getElementById('colorPreview');
    const colorPicker = document.getElementById('colorPicker');
    const hexInput = document.getElementById('hexInput');
    const hexSubmit = document.getElementById('hexSubmit');

    colorPreview.addEventListener('click', () => {
        colorPicker.click();
    });

    colorPicker.addEventListener('input', (e) => {
        const hexValue = e.target.value;
        hexInput.value = hexValue;
        colorPreview.style.backgroundColor = hexValue;
        hexSubmit.disabled = false;
    });

    hexInput.addEventListener('input', (e) => {
        let value = e.target.value.trim();
        if (!value.startsWith('#')) {
            value = '#' + value;
        }

        if (/^#[0-9A-F]{6}$/i.test(value)) {
            colorPreview.style.backgroundColor = value;
            colorPicker.value = value;
            hexSubmit.disabled = false;
        } else {
            hexSubmit.disabled = true;
        }
    });

    hexSubmit.addEventListener('click', () => {
        const hexValue = hexInput.value.trim();
        const rgb = hexToRgb(hexValue);

        if (rgb) {
            const closest = findClosestColors(rgb, pantoneData, 1, colorMatchMethod, factorInShimmer);
            const closestThreads = findClosestColors(rgb, threadData, 3, colorMatchMethod, factorInShimmer);

            if (closest.length > 0) {
                const customColor = {
                    type: 'custom',
                    code: hexValue,
                    rgb: rgb,
                    matchCode: closest[0].code,
                    matchRgb: closest[0].rgb,
                    distance: closest[0].distance,
                    matchMethod: colorMatchMethod,
                    matchType: 'pantone',
                    alternativeMatches: closestThreads
                };

                addRecentMatch(customColor, closest[0]);
                displayColors([customColor], 1);
                showStatus(`Found match for ${hexValue}`, false, 3000);
            }
        }
    });
}

// Update results when method changes
function updateResults() {
    processAndDisplayData();
}

// Load on window load
window.addEventListener('load', () => {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading color data...</div>
            <div class="loading-progress">
                <div class="loading-progress-bar"></div>
            </div>
        </div>
    `;
});
