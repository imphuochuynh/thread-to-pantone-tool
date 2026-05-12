// Web Worker for color calculations - offload heavy computations

// Import color calculation functions
// Note: We duplicate these functions here since workers can't import ES modules in all browsers
// In production, you might want to use a bundler

// RGB to XYZ conversion
function rgbToXyz(rgb) {
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
    const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

    return { x: x * 100, y: y * 100, z: z * 100 };
}

// XYZ to LAB conversion
function xyzToLab(xyz) {
    const xRef = 95.047;
    const yRef = 100.0;
    const zRef = 108.883;

    let x = xyz.x / xRef;
    let y = xyz.y / yRef;
    let z = xyz.z / zRef;

    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16 / 116);
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16 / 116);
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16 / 116);

    const L = (116 * y) - 16;
    const a = 500 * (x - y);
    const b = 200 * (y - z);

    return { L, a, b };
}

// RGB to CIELAB conversion
function rgbToLab(rgb) {
    const xyz = rgbToXyz(rgb);
    return xyzToLab(xyz);
}

// Calculate LAB distance
function calculateLabDistance(lab1, lab2) {
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

// Calculate Delta E 2000
function calculateDeltaE2000(lab1, lab2) {
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

// Estimate shimmer level
function estimateShimmerLevel(lab) {
    const shimmerScore = (lab.L + Math.abs(lab.a) + Math.abs(lab.b)) / 3;

    if (shimmerScore < 50) {
        return 'matte';
    } else if (shimmerScore <= 75) {
        return 'semi-gloss';
    } else {
        return 'metallic';
    }
}

// Adjust LAB for shimmer
function adjustLabForShimmer(lab) {
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

// Main color distance calculation (optimized with pre-computed LAB values)
function calculateColorDistance(color1, color2, method = 'rgb', factorInShimmer = false) {
    if (method === 'deltaE2000' || method === 'lab') {
        let lab1, lab2;
        if (factorInShimmer) {
            lab1 = color1.shimmerLab || adjustLabForShimmer(color1.lab || rgbToLab(color1.rgb || color1));
            lab2 = color2.shimmerLab || adjustLabForShimmer(color2.lab || rgbToLab(color2.rgb || color2));
        } else {
            lab1 = color1.lab || rgbToLab(color1.rgb || color1);
            lab2 = color2.lab || rgbToLab(color2.rgb || color2);
        }

        if (method === 'deltaE2000') {
            return calculateDeltaE2000(lab1, lab2);
        } else {
            return calculateLabDistance(lab1, lab2);
        }
    } else {
        // Default RGB Euclidean distance
        const rgb1 = color1.rgb || color1;
        const rgb2 = color2.rgb || color2;
        const dr = rgb1.r - rgb2.r;
        const dg = rgb1.g - rgb2.g;
        const db = rgb1.b - rgb2.b;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }
}

// Partial k-selection using a max-heap — O(N log k) vs O(N log N)
function kSmallest(colorData, targetColor, limit, method, factorInShimmer) {
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

    return heap
        .sort((a, b) => a.distance - b.distance)
        .map(item => ({ ...item.color, distance: item.distance }));
}

// Find closest colors (optimized for pre-computed LAB)
function findClosestColors(target, colorData, limit, method, factorInShimmer) {
    const targetColor = target.rgb ? target : { rgb: target };
    if ((method === 'deltaE2000' || method === 'lab') && !targetColor.lab) {
        targetColor.lab = rgbToLab(targetColor.rgb);
    }

    return kSmallest(colorData, targetColor, limit, method, factorInShimmer);
}

// Batch process colors (optimized with pre-computed LAB)
function batchProcessMatches(sourceColors, targetColors, method, factorInShimmer) {
    return sourceColors.map(source => {
        const matches = kSmallest(targetColors, source, 4, method, factorInShimmer);
        return {
            sourceCode: source.code,
            matches: matches
        };
    });
}

// Worker message handler
self.addEventListener('message', (e) => {
    const { type, data } = e.data;

    try {
        switch (type) {
            case 'calculateDistance':
                // Support both old format (rgb1, rgb2) and new format (color objects)
                const color1 = data.color1 || { rgb: data.rgb1 };
                const color2 = data.color2 || { rgb: data.rgb2 };
                const distance = calculateColorDistance(
                    color1,
                    color2,
                    data.method,
                    data.factorInShimmer
                );
                self.postMessage({ type: 'result', result: distance });
                break;

            case 'findClosest':
                // Support both old format (targetRgb) and new format (target color object)
                const target = data.target || { rgb: data.targetRgb };
                const closest = findClosestColors(
                    target,
                    data.colorData,
                    data.limit,
                    data.method,
                    data.factorInShimmer
                );
                self.postMessage({ type: 'result', result: closest });
                break;

            case 'batchProcess':
                const results = batchProcessMatches(
                    data.sourceColors,
                    data.targetColors,
                    data.method,
                    data.factorInShimmer
                );
                self.postMessage({ type: 'result', result: results });
                break;

            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message });
    }
});
