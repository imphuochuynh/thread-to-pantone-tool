// Color Math Module - All color distance calculations and conversions

// LRU Cache for color distance calculations
class ColorDistanceCache {
    constructor(maxSize = 5000) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    createKey(color1, color2, method, factorInShimmer) {
        // Create a unique cache key based on RGB values and parameters
        const rgb1 = color1.rgb || color1;
        const rgb2 = color2.rgb || color2;
        // Order colors consistently to ensure cache hits regardless of order
        const [c1, c2] = rgb1.r < rgb2.r || (rgb1.r === rgb2.r && rgb1.g < rgb2.g) || (rgb1.r === rgb2.r && rgb1.g === rgb2.g && rgb1.b <= rgb2.b)
            ? [rgb1, rgb2]
            : [rgb2, rgb1];
        return `${c1.r},${c1.g},${c1.b}|${c2.r},${c2.g},${c2.b}|${method}|${factorInShimmer}`;
    }

    get(color1, color2, method, factorInShimmer) {
        const key = this.createKey(color1, color2, method, factorInShimmer);
        if (this.cache.has(key)) {
            // Move to end (most recently used)
            const value = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, value);
            return value;
        }
        return null;
    }

    set(color1, color2, method, factorInShimmer, distance) {
        const key = this.createKey(color1, color2, method, factorInShimmer);

        // Remove oldest entry if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, distance);
    }

    clear() {
        this.cache.clear();
    }

    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize
        };
    }
}

// Global cache instance
const distanceCache = new ColorDistanceCache();

// RGB to Hex conversion
export function rgbToHex(r, g, b) {
    // Handle both RGB object and individual components
    if (typeof r === 'object' && r !== null) {
        const rgb = r;
        r = rgb.r;
        g = rgb.g;
        b = rgb.b;
    }

    // Convert to hex
    r = Math.max(0, Math.min(255, r)).toString(16).padStart(2, '0');
    g = Math.max(0, Math.min(255, g)).toString(16).padStart(2, '0');
    b = Math.max(0, Math.min(255, b)).toString(16).padStart(2, '0');

    return `#${r}${g}${b}`.toUpperCase();
}

// Hex to RGB conversion
export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// RGB to XYZ conversion
function rgbToXyz(rgb) {
    // Convert RGB to normalized values
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    // Apply gamma correction
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    // Convert to XYZ color space
    const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
    const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

    return { x: x * 100, y: y * 100, z: z * 100 };
}

// XYZ to LAB conversion
function xyzToLab(xyz) {
    // Reference values for D65 standard illuminant
    const xRef = 95.047;
    const yRef = 100.0;
    const zRef = 108.883;

    // Normalize XYZ values
    let x = xyz.x / xRef;
    let y = xyz.y / yRef;
    let z = xyz.z / zRef;

    // Apply transformation
    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16 / 116);
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16 / 116);
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16 / 116);

    const L = (116 * y) - 16;
    const a = 500 * (x - y);
    const b = 200 * (y - z);

    return { L, a, b };
}

// RGB to CIELAB conversion
export function rgbToLab(rgb) {
    const xyz = rgbToXyz(rgb);
    return xyzToLab(xyz);
}

// Calculate LAB distance (Delta E 1976)
export function calculateLabDistance(lab1, lab2) {
    const dL = lab1.L - lab2.L;
    const da = lab1.a - lab2.a;
    const db = lab1.b - lab2.b;
    return Math.sqrt(dL * dL + da * da + db * db);
}

// Pre-computed conversion constants
const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

function rad2deg(rad) {
    return rad * RAD_TO_DEG;
}

function deg2rad(deg) {
    return deg * DEG_TO_RAD;
}

// Calculate Delta E 2000 (most accurate perceptual color difference)
export function calculateDeltaE2000(lab1, lab2) {
    const c1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
    const c2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
    const c_bar = (c1 + c2) / 2;

    const c_bar7 = c_bar * c_bar * c_bar * c_bar * c_bar * c_bar * c_bar;
    const G = 0.5 * (1 - Math.sqrt(c_bar7 / (c_bar7 + 6103515625))); // 25^7 = 6103515625

    const a1_prime = (1 + G) * lab1.a;
    const a2_prime = (1 + G) * lab2.a;

    const C1_prime = Math.sqrt(a1_prime * a1_prime + lab1.b * lab1.b);
    const C2_prime = Math.sqrt(a2_prime * a2_prime + lab2.b * lab2.b);

    let h1_prime = rad2deg(Math.atan2(lab1.b, a1_prime));
    if (h1_prime < 0) h1_prime += 360;

    let h2_prime = rad2deg(Math.atan2(lab2.b, a2_prime));
    if (h2_prime < 0) h2_prime += 360;

    const H_bar_prime = Math.abs(h1_prime - h2_prime) > 180 ? (h1_prime + h2_prime + 360) / 2 : (h1_prime + h2_prime) / 2;

    const T = 1 - 0.17 * Math.cos(deg2rad(H_bar_prime - 30)) +
              0.24 * Math.cos(deg2rad(2 * H_bar_prime)) +
              0.32 * Math.cos(deg2rad(3 * H_bar_prime + 6)) -
              0.20 * Math.cos(deg2rad(4 * H_bar_prime - 63));

    let delta_h_prime;
    if (Math.abs(h2_prime - h1_prime) <= 180) {
        delta_h_prime = h2_prime - h1_prime;
    } else {
        delta_h_prime = h2_prime <= h1_prime ? h2_prime - h1_prime + 360 : h2_prime - h1_prime - 360;
    }

    const delta_L_prime = lab2.L - lab1.L;
    const delta_C_prime = C2_prime - C1_prime;
    const delta_H_prime = 2 * Math.sqrt(C1_prime * C2_prime) * Math.sin(deg2rad(delta_h_prime) / 2);

    const L_bar_prime = (lab1.L + lab2.L) / 2;
    const C_bar_prime = (C1_prime + C2_prime) / 2;

    const L50 = L_bar_prime - 50;
    const S_L = 1 + (0.015 * L50 * L50) / Math.sqrt(20 + L50 * L50);
    const S_C = 1 + 0.045 * C_bar_prime;
    const S_H = 1 + 0.015 * C_bar_prime * T;

    const H275_25 = (H_bar_prime - 275) / 25;
    const delta_theta = 30 * Math.exp(-(H275_25 * H275_25));
    const C_bar_prime7 = C_bar_prime * C_bar_prime * C_bar_prime * C_bar_prime * C_bar_prime * C_bar_prime * C_bar_prime;
    const R_C = 2 * Math.sqrt(C_bar_prime7 / (C_bar_prime7 + 6103515625));
    const R_T = -R_C * Math.sin(2 * deg2rad(delta_theta));

    const f_L = delta_L_prime / S_L;
    const f_C = delta_C_prime / S_C;
    const f_H = delta_H_prime / S_H;

    return Math.sqrt(f_L * f_L + f_C * f_C + f_H * f_H + R_T * f_C * f_H);
}

// Estimate thread shimmer level based on LAB values
export function estimateShimmerLevel(lab) {
    const shimmerScore = (lab.L + Math.abs(lab.a) + Math.abs(lab.b)) / 3;

    if (shimmerScore < 50) {
        return 'matte';
    } else if (shimmerScore <= 75) {
        return 'semi-gloss';
    } else {
        return 'metallic';
    }
}

// Adjust LAB values based on shimmer level
export function adjustLabForShimmer(lab) {
    const adjustedLab = { ...lab };
    const shimmerLevel = estimateShimmerLevel(lab);

    if (shimmerLevel === 'matte') {
        adjustedLab.L = Math.max(0, adjustedLab.L - 3);
    } else if (shimmerLevel === 'semi-gloss') {
        adjustedLab.L = Math.min(100, adjustedLab.L + 3);
    } else if (shimmerLevel === 'metallic') {
        adjustedLab.L = Math.min(100, adjustedLab.L + 6);
        adjustedLab.a = adjustedLab.a * 0.95;
        adjustedLab.b = adjustedLab.b * 0.95;
    }

    return adjustedLab;
}

// Pre-compute shimmer-adjusted LAB from an rgb object (call once during data load)
export function precomputeShimmerLab(rgb) {
    const lab = rgbToLab(rgb);
    return adjustLabForShimmer(lab);
}

// Main color distance calculation function (optimized with pre-computed LAB values and caching)
export function calculateColorDistance(color1, color2, method = 'rgb', factorInShimmer = false) {
    // Check cache first
    const cached = distanceCache.get(color1, color2, method, factorInShimmer);
    if (cached !== null) {
        return cached;
    }

    let distance;
    if (method === 'deltaE2000' || method === 'lab') {
        let lab1, lab2;
        if (factorInShimmer) {
            // Use pre-computed shimmer-adjusted LAB if available, else compute
            lab1 = color1.shimmerLab || adjustLabForShimmer(color1.lab || rgbToLab(color1.rgb || color1));
            lab2 = color2.shimmerLab || adjustLabForShimmer(color2.lab || rgbToLab(color2.rgb || color2));
        } else {
            lab1 = color1.lab || rgbToLab(color1.rgb || color1);
            lab2 = color2.lab || rgbToLab(color2.rgb || color2);
        }

        if (method === 'deltaE2000') {
            distance = calculateDeltaE2000(lab1, lab2);
        } else {
            distance = calculateLabDistance(lab1, lab2);
        }
    } else {
        // Default RGB Euclidean distance
        const rgb1 = color1.rgb || color1;
        const rgb2 = color2.rgb || color2;
        const dr = rgb1.r - rgb2.r;
        const dg = rgb1.g - rgb2.g;
        const db = rgb1.b - rgb2.b;
        distance = Math.sqrt(dr * dr + dg * dg + db * db);
    }

    // Store in cache
    distanceCache.set(color1, color2, method, factorInShimmer, distance);
    return distance;
}

// Export cache for debugging/stats
export function getCacheStats() {
    return distanceCache.getStats();
}

export function clearCache() {
    distanceCache.clear();
}

// Partial k-selection: find k closest colors without sorting all N — O(N log k)
function kSmallest(colorData, targetColor, limit, method, factorInShimmer) {
    // Max-heap of size `limit` storing {color, distance}
    const heap = [];

    function heapifyDown(i) {
        const n = heap.length;
        while (true) {
            let largest = i;
            const l = 2 * i + 1, r = 2 * i + 2;
            if (l < n && heap[l].distance > heap[largest].distance) largest = l;
            if (r < n && heap[r].distance > heap[largest].distance) largest = r;
            if (largest === i) break;
            [heap[i], heap[largest]] = [heap[largest], heap[i]];
            i = largest;
        }
    }

    function heapifyUp(i) {
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (heap[parent].distance >= heap[i].distance) break;
            [heap[i], heap[parent]] = [heap[parent], heap[i]];
            i = parent;
        }
    }

    for (const color of colorData) {
        const distance = calculateColorDistance(targetColor, color, method, factorInShimmer);
        if (heap.length < limit) {
            heap.push({ color, distance });
            heapifyUp(heap.length - 1);
        } else if (distance < heap[0].distance) {
            heap[0] = { color, distance };
            heapifyDown(0);
        }
    }

    // Sort the small heap ascending
    return heap
        .sort((a, b) => a.distance - b.distance)
        .map(item => ({ ...item.color, distance: item.distance }));
}

// Find closest colors using specified method (optimized for pre-computed LAB)
export function findClosestColors(target, colorData, limit = 3, method = 'rgb', factorInShimmer = false) {
    const targetColor = target.rgb ? target : { rgb: target };
    if ((method === 'deltaE2000' || method === 'lab') && !targetColor.lab) {
        targetColor.lab = rgbToLab(targetColor.rgb);
    }

    return kSmallest(colorData, targetColor, limit, method, factorInShimmer);
}

// Get shimmer info for display
export function getShimmerInfo(rgb) {
    const lab = rgbToLab(rgb);
    const shimmerLevel = estimateShimmerLevel(lab);
    const shimmerScore = (lab.L + Math.abs(lab.a) + Math.abs(lab.b)) / 3;

    return {
        level: shimmerLevel,
        score: shimmerScore.toFixed(1),
        badge: `<span class="shimmer-badge ${shimmerLevel}">${shimmerLevel.toUpperCase()}</span>`,
        html: `
            <div class="shimmer-info">
                <span class="shimmer-badge ${shimmerLevel}">${shimmerLevel.toUpperCase()}</span>
                <span class="shimmer-score">Shimmer score: ${shimmerScore.toFixed(1)}</span>
            </div>
        `
    };
}

// Calculate similarity percentage
// deltaE2000: ΔE≤1 imperceptible, ΔE≈2 just-noticeable, ΔE≈5 clearly different, ΔE≥10 very different
// Mapping: 100% at ΔE=0, 0% at ΔE=20 (linear within perceptual range)
// lab (CIE76): max distance ~173 for opposite corners of LAB space
// rgb: max distance = √(255²×3) ≈ 441.7
export function calculateSimilarity(distance, method) {
    if (method === 'deltaE2000') {
        return Math.max(0, 100 - Math.min(distance * 5, 100)).toFixed(1);
    } else if (method === 'lab') {
        return Math.max(0, 100 - Math.min(distance / 1.73, 100)).toFixed(1);
    } else {
        // RGB method — max 441.67
        return Math.max(0, 100 - Math.min(distance / 4.42, 100)).toFixed(1);
    }
}

// Thresholds calibrated per method so "high/medium/low" mean the same quality level
// deltaE2000: high <5 (ΔE), medium <10; lab: high <15, medium <30; rgb: high <60, medium <110
export function getSimilarityClass(similarityPercentage, method) {
    const similarity = parseFloat(similarityPercentage);
    if (method === 'deltaE2000') {
        if (similarity >= 75) return 'high-match';   // ΔE < 5
        if (similarity >= 50) return 'medium-match'; // ΔE < 10
        return 'low-match';
    } else if (method === 'lab') {
        if (similarity >= 91) return 'high-match';   // CIE76 < 15
        if (similarity >= 83) return 'medium-match'; // CIE76 < 30
        return 'low-match';
    } else {
        // RGB
        if (similarity >= 85) return 'high-match';
        if (similarity >= 75) return 'medium-match';
        return 'low-match';
    }
}
