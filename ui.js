// UI Module - Display functions with lazy loading optimization

import { rgbToHex, calculateColorDistance, getShimmerInfo as getShimmerInfoFromMath, calculateSimilarity, getSimilarityClass } from './colorMath.js';

// State
let currentPage = 1;
let itemsPerPage = 20;
let factorInShimmer = false;
let isLazyLoading = false;

// Lazy loading observer
let lazyLoadObserver = null;

// Initialize lazy loading
export function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        lazyLoadObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    if (card.dataset.lazyLoad === 'true') {
                        renderColorCard(card);
                        lazyLoadObserver.unobserve(card);
                    }
                }
            });
        }, {
            rootMargin: '50px'
        });
    }
}

// Render individual color card (called when it enters viewport)
function renderColorCard(cardElement) {
    const colorData = JSON.parse(cardElement.dataset.colorData);
    cardElement.innerHTML = generateColorCardHTML(colorData);
    cardElement.dataset.lazyLoad = 'false';

    // Add event listeners after rendering
    attachAlternativeClickListeners(cardElement);
}

// Generate HTML for a color card
function generateColorCardHTML(color) {
    const colorRGB = `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`;
    const hexColor = rgbToHex(color.rgb);

    const matchHTML = color.matchCode ? generateMatchHTML(color) : '';
    const alternativesHTML = color.alternativeMatches && color.alternativeMatches.length > 0 ?
        generateAlternativesHTML(color) : '';

    return `
        <div class="color-swatches-container">
            <div class="color-swatch" style="background-color: ${colorRGB}">
                <div class="color-swatch-label">${getColorTypeLabel(color.type)}</div>
            </div>
            ${color.matchCode ? `
                <div class="color-divider"></div>
                <div class="color-swatch" style="background-color: rgb(${color.matchRgb.r}, ${color.matchRgb.g}, ${color.matchRgb.b})">
                    <div class="color-swatch-label">${color.matchType === 'pantone' ? 'Pantone' : 'Thread'}</div>
                </div>
            ` : ''}
        </div>
        <div class="color-info">
            <div class="color-name">
                ${color.code}
                <span class="color-type">${getColorTypeLabel(color.type)}</span>
            </div>
            <div class="color-details">
                <div class="rgb-value">RGB: ${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}</div>
                <div class="hex-value">Hex: ${hexColor}</div>
                ${factorInShimmer ? getShimmerInfo(color.rgb) : ''}
            </div>
            ${matchHTML}
            ${alternativesHTML}
        </div>
    `;
}

// Generate match HTML
function generateMatchHTML(color) {
    const matchRGB = `rgb(${color.matchRgb.r}, ${color.matchRgb.g}, ${color.matchRgb.b})`;
    const matchHex = rgbToHex(color.matchRgb);
    const matchType = color.matchType === 'pantone' ? 'Pantone' : 'Thread';

    const similarityPercentage = calculateSimilarity(color.distance, color.matchMethod || 'rgb');
    const similarityClass = getSimilarityClass(similarityPercentage);

    const matchMethodInfo = color.matchMethod ?
        `<div class="match-method">Method: ${getMethodLabel(color.matchMethod)}</div>` : '';

    const matchShimmerInfo = factorInShimmer ? getShimmerInfo(color.matchRgb) : '';

    return `
        <div class="color-match primary">
            <div class="match-header">
                <div class="return-to-best">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 12h18M3 12l6-6M3 12l6 6"/>
                    </svg>
                    Return to Best Match
                </div>
                <span class="match-title">Best ${matchType} Match:</span>
                <span class="match-code">${color.matchCode}</span>
            </div>
            <div class="match-details">
                <div class="match-color-preview" style="background-color: ${matchRGB}"></div>
                <div class="match-info">
                    <div class="match-rgb">RGB: ${color.matchRgb.r}, ${color.matchRgb.g}, ${color.matchRgb.b}</div>
                    <div class="match-hex">Hex: ${matchHex}</div>
                    <div class="match-similarity ${similarityClass}">
                        <span class="similarity-label">Similarity:</span>
                        <span class="similarity-value">${similarityPercentage}%</span>
                    </div>
                    ${matchMethodInfo}
                    ${matchShimmerInfo}
                </div>
            </div>
        </div>
    `;
}

// Generate alternatives HTML
function generateAlternativesHTML(color) {
    const matchType = color.matchType ?
        (color.matchType === 'pantone' ? 'Pantone' : 'Thread') :
        (color.type === 'pantone' ? 'Thread' : 'Pantone');

    const alternativesItems = color.alternativeMatches.map(alt => {
        const altRGB = `rgb(${alt.rgb.r}, ${alt.rgb.g}, ${alt.rgb.b})`;
        const altHex = rgbToHex(alt.rgb);

        const distance = calculateColorDistance(color.rgb, alt.rgb, color.matchMethod || 'rgb', factorInShimmer);
        const similarityPercentage = calculateSimilarity(distance, color.matchMethod || 'rgb');
        const similarityClass = getSimilarityClass(similarityPercentage);

        return `
            <div class="color-match alternative"
                data-alt-code="${alt.code}"
                data-alt-type="${alt.type}"
                data-alt-r="${alt.rgb.r}"
                data-alt-g="${alt.rgb.g}"
                data-alt-b="${alt.rgb.b}"
                data-original-color-r="${color.rgb.r}"
                data-original-color-g="${color.rgb.g}"
                data-original-color-b="${color.rgb.b}"
                data-match-method="${color.matchMethod || 'rgb'}">
                <div class="match-header">
                    <span class="match-code">${alt.code}</span>
                </div>
                <div class="match-details">
                    <div class="match-color-preview" style="background-color: ${altRGB}"></div>
                    <div class="match-info">
                        <div class="match-rgb">RGB: ${alt.rgb.r}, ${alt.rgb.g}, ${alt.rgb.b}</div>
                        <div class="match-hex">Hex: ${altHex}</div>
                        <div class="match-similarity ${similarityClass}">
                            <span class="similarity-label">Similarity:</span>
                            <span class="similarity-value">${similarityPercentage}%</span>
                        </div>
                        ${factorInShimmer ? getShimmerInfo(alt.rgb) : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="alternatives-section">
            <div class="alternatives-title">Alternative ${matchType} Matches:</div>
            <div class="alternative-matches-container">
                ${alternativesItems}
            </div>
        </div>
    `;
}

// Display colors with lazy loading
export function displayColors(colors, page = 1) {
    const resultsDiv = document.getElementById('results');
    const resultsContainer = document.getElementById('results-container');
    resultsDiv.innerHTML = '';

    // Remove any existing banner
    const existingBanner = document.querySelector('.banner-container');
    if (existingBanner) {
        existingBanner.remove();
    }

    if (colors.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results">No colors found</div>';
        document.getElementById('pagination').style.display = 'none';
        return;
    }

    // Calculate pagination
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, colors.length);
    const pageColors = colors.slice(startIndex, endIndex);

    // Update pagination controls
    document.getElementById('pagination').style.display = 'flex';
    document.getElementById('prevPage').disabled = page === 1;
    document.getElementById('nextPage').disabled = endIndex >= colors.length;

    // Show status with count
    showStatus(`Showing ${startIndex + 1}-${endIndex} of ${colors.length} colors`, false);

    // Show method banner if applicable
    if (pageColors.length > 0 && pageColors[0].matchMethod) {
        showMethodBanner(pageColors[0].matchMethod, pageColors.length === 1 && pageColors[0].type === 'custom');
    }

    // Create color cards with lazy loading
    const fragment = document.createDocumentFragment();
    pageColors.forEach(color => {
        const colorDiv = document.createElement('div');
        colorDiv.className = 'color-card';
        colorDiv.dataset.colorCode = color.code;
        colorDiv.dataset.colorType = color.type;
        colorDiv.dataset.lazyLoad = 'true';
        colorDiv.dataset.colorData = JSON.stringify(color);

        // Add placeholder content
        colorDiv.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

        fragment.appendChild(colorDiv);

        // Observe for lazy loading
        if (lazyLoadObserver) {
            lazyLoadObserver.observe(colorDiv);
        } else {
            // Fallback: render immediately if IntersectionObserver not supported
            renderColorCard(colorDiv);
        }
    });

    resultsDiv.appendChild(fragment);
    currentPage = page;
}

// Attach event listeners for alternative matches
function attachAlternativeClickListeners(colorCard) {
    const alternatives = colorCard.querySelectorAll('.color-match.alternative');
    alternatives.forEach(altMatch => {
        altMatch.addEventListener('click', function() {
            handleAlternativeClick(this, colorCard);
        });
    });
}

// Handle alternative match click
function handleAlternativeClick(altMatch, colorCard) {
    const colorCode = colorCard.dataset.colorCode;
    const colorType = colorCard.dataset.colorType;

    // Store current best match
    const currentBestMatch = colorCard.querySelector('.color-match.primary');
    const bestMatchData = extractBestMatchData(currentBestMatch);
    colorCard.dataset.bestMatchData = JSON.stringify(bestMatchData);

    // Get alternative data
    const altData = {
        code: altMatch.dataset.altCode,
        type: altMatch.dataset.altType,
        r: parseInt(altMatch.dataset.altR),
        g: parseInt(altMatch.dataset.altG),
        b: parseInt(altMatch.dataset.altB)
    };

    const originalData = {
        r: parseInt(altMatch.dataset.originalColorR),
        g: parseInt(altMatch.dataset.originalColorG),
        b: parseInt(altMatch.dataset.originalColorB)
    };

    const matchMethod = altMatch.dataset.matchMethod;

    // Update the display
    updateColorCardWithAlternative(colorCard, colorType, originalData, altData, matchMethod);

    showStatus(`Showing ${altData.type === 'pantone' ? 'Pantone' : 'Thread'} ${altData.code} in side-by-side view`, false, 3000);
}

// Extract best match data
function extractBestMatchData(matchElement) {
    return {
        code: matchElement.querySelector('.match-code').textContent,
        rgb: matchElement.querySelector('.match-rgb').textContent.match(/RGB: (\d+), (\d+), (\d+)/).slice(1).map(Number),
        hex: matchElement.querySelector('.match-hex').textContent.replace('Hex: ', ''),
        similarity: matchElement.querySelector('.similarity-value').textContent,
        type: matchElement.querySelector('.match-title').textContent.includes('Pantone') ? 'pantone' : 'thread'
    };
}

// Update color card with alternative
function updateColorCardWithAlternative(colorCard, colorType, originalData, altData, matchMethod) {
    const swatchesContainer = colorCard.querySelector('.color-swatches-container');
    const matchInfoContainer = colorCard.querySelector('.color-match.primary');

    // Calculate distance and similarity
    const distance = calculateColorDistance(
        { r: originalData.r, g: originalData.g, b: originalData.b },
        { r: altData.r, g: altData.g, b: altData.b },
        matchMethod,
        factorInShimmer
    );

    const similarityPercentage = calculateSimilarity(distance, matchMethod);
    const similarityClass = getSimilarityClass(similarityPercentage);

    // Update swatches
    swatchesContainer.innerHTML = `
        <div class="color-swatch" style="background-color: rgb(${originalData.r}, ${originalData.g}, ${originalData.b})">
            <div class="color-swatch-label">${getColorTypeLabel(colorType)}</div>
        </div>
        <div class="color-divider"></div>
        <div class="color-swatch" style="background-color: rgb(${altData.r}, ${altData.g}, ${altData.b})">
            <div class="color-swatch-label">${altData.type === 'pantone' ? 'Pantone' : 'Thread'}</div>
        </div>
    `;

    // Update match info
    const altRGB = `rgb(${altData.r}, ${altData.g}, ${altData.b})`;
    const altHex = rgbToHex({ r: altData.r, g: altData.g, b: altData.b });
    const altShimmerInfo = factorInShimmer ? getShimmerInfo({ r: altData.r, g: altData.g, b: altData.b }) : '';

    matchInfoContainer.innerHTML = `
        <div class="match-header">
            <div class="return-to-best visible">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12h18M3 12l6-6M3 12l6 6"/>
                </svg>
                Return to Best Match
            </div>
            <span class="match-title">Selected ${altData.type === 'pantone' ? 'Pantone' : 'Thread'} Match:</span>
            <span class="match-code">${altData.code}</span>
        </div>
        <div class="match-details">
            <div class="match-color-preview" style="background-color: ${altRGB}"></div>
            <div class="match-info">
                <div class="match-rgb">RGB: ${altData.r}, ${altData.g}, ${altData.b}</div>
                <div class="match-hex">Hex: ${altHex}</div>
                <div class="match-similarity ${similarityClass}">
                    <span class="similarity-label">Similarity:</span>
                    <span class="similarity-value">${similarityPercentage}%</span>
                </div>
                ${altShimmerInfo}
            </div>
        </div>
    `;

    // Add return button listener
    const returnButton = matchInfoContainer.querySelector('.return-to-best');
    returnButton.addEventListener('click', function(e) {
        e.stopPropagation();
        returnToBestMatch(colorCard, colorType, originalData);
    });
}

// Return to best match
function returnToBestMatch(colorCard, colorType, originalData) {
    const bestMatchData = JSON.parse(colorCard.dataset.bestMatchData);
    const swatchesContainer = colorCard.querySelector('.color-swatches-container');
    const matchInfoContainer = colorCard.querySelector('.color-match.primary');

    // Update swatches
    swatchesContainer.innerHTML = `
        <div class="color-swatch" style="background-color: rgb(${originalData.r}, ${originalData.g}, ${originalData.b})">
            <div class="color-swatch-label">${getColorTypeLabel(colorType)}</div>
        </div>
        <div class="color-divider"></div>
        <div class="color-swatch" style="background-color: rgb(${bestMatchData.rgb[0]}, ${bestMatchData.rgb[1]}, ${bestMatchData.rgb[2]})">
            <div class="color-swatch-label">${bestMatchData.type === 'pantone' ? 'Pantone' : 'Thread'}</div>
        </div>
    `;

    // Update match info
    matchInfoContainer.innerHTML = `
        <div class="match-header">
            <span class="match-title">Best ${bestMatchData.type === 'pantone' ? 'Pantone' : 'Thread'} Match:</span>
            <span class="match-code">${bestMatchData.code}</span>
        </div>
        <div class="match-details">
            <div class="match-color-preview" style="background-color: rgb(${bestMatchData.rgb[0]}, ${bestMatchData.rgb[1]}, ${bestMatchData.rgb[2]})"></div>
            <div class="match-info">
                <div class="match-rgb">RGB: ${bestMatchData.rgb.join(', ')}</div>
                <div class="match-hex">Hex: ${bestMatchData.hex}</div>
                <div class="match-similarity ${getSimilarityClass(bestMatchData.similarity)}">
                    <span class="similarity-label">Similarity:</span>
                    <span class="similarity-value">${bestMatchData.similarity}</span>
                </div>
                ${factorInShimmer ? getShimmerInfo({ r: bestMatchData.rgb[0], g: bestMatchData.rgb[1], b: bestMatchData.rgb[2] }) : ''}
            </div>
        </div>
    `;

    showStatus(`Returned to best ${bestMatchData.type === 'pantone' ? 'Pantone' : 'Thread'} match`, false, 3000);
}

// Show method banner
function showMethodBanner(method, isCustomColor) {
    const resultsContainer = document.getElementById('results-container');
    const resultsDiv = document.getElementById('results');
    const methodLabel = getMethodLabel(method);

    const bannerContainer = document.createElement('div');
    bannerContainer.className = 'banner-container';
    bannerContainer.innerHTML = `
        <div class="method-banner">
            <div class="method-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <div class="method-text">
                Using <strong>${methodLabel}</strong> color matching method ${isCustomColor ? '' : 'for all results'}
            </div>
        </div>
    `;

    resultsContainer.insertBefore(bannerContainer, resultsDiv);
}

// Helper functions
function getColorTypeLabel(type) {
    if (type === 'thread') return 'Thread';
    if (type === 'custom') return 'Custom';
    return 'Pantone';
}

function getMethodLabel(method) {
    if (method === 'rgb') return 'RGB (Basic)';
    if (method === 'lab') return 'CIELAB (Perceptual)';
    return 'Delta E 2000 (Advanced)';
}

function getShimmerInfo(rgb) {
    const info = getShimmerInfoFromMath(rgb);
    return info.html;
}

// Status indicator
export function showStatus(message, isLoading = false, duration = 3000) {
    const statusIndicator = document.querySelector('.status-indicator');
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusText = statusIndicator.querySelector('.status-text');

    statusText.textContent = message;

    if (isLoading) {
        statusDot.classList.add('loading');
    } else {
        statusDot.classList.remove('loading');
    }

    statusIndicator.classList.add('visible');

    if (!isLoading) {
        setTimeout(() => {
            statusIndicator.classList.remove('visible');
        }, duration);
    }
}

// Loading state
export function showLoading(progress = 0) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <div class="loading-text">Searching for matches...</div>
            <div class="loading-progress">
                <div class="loading-progress-bar" style="width: ${progress}%"></div>
            </div>
        </div>
    `;
}

// No results state
export function showNoResults(searchTerm, suggestions = []) {
    const resultsDiv = document.getElementById('results');

    const suggestionsHTML = suggestions.length > 0 ? `
        <div class="no-results-suggestions">
            <div class="no-results-suggestions-title">Did you mean:</div>
            <div class="no-results-suggestions-list">
                ${suggestions.map(s => `
                    <div class="no-results-suggestion" data-code="${s.code}">
                        <div class="no-results-suggestion-color" style="background-color: rgb(${s.rgb.r}, ${s.rgb.g}, ${s.rgb.b})"></div>
                        <div class="no-results-suggestion-text">${s.code}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    resultsDiv.innerHTML = `
        <div class="no-results">
            <div class="no-results-icon">🔍</div>
            <div class="no-results-text">
                No colors found matching "${searchTerm}"
            </div>
            ${suggestionsHTML}
        </div>
    `;

    // Add click handlers for suggestions
    document.querySelectorAll('.no-results-suggestion').forEach(item => {
        item.addEventListener('click', () => {
            const code = item.dataset.code;
            document.getElementById('colorSearch').value = code;
            document.getElementById('colorSearch').dispatchEvent(new Event('input'));
        });
    });
}

// Set shimmer factor
export function setFactorInShimmer(value) {
    factorInShimmer = value;
}

// Set items per page
export function setItemsPerPage(value) {
    itemsPerPage = value;
}

// Get current page
export function getCurrentPage() {
    return currentPage;
}
