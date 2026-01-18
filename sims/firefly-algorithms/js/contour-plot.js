/**
 * Contour Plot Generator
 * Creates a greyscale background showing the objective function landscape
 */
import { getFunctionRange } from './objective-functions.js';

export class ContourPlot {
    constructor(canvas, objectiveFunction) {
        this.canvas = canvas;
        this.objectiveFunction = objectiveFunction;
        this.imageData = null;
        this.resolution = 200; // Pixels per dimension for calculation
        this.cachedFunctionKey = null;
        this.cachedWidth = null;
        this.cachedHeight = null;
    }

    /**
     * Generate the contour plot image data
     */
    generate(functionKey, objectiveFunction) {
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Check if we can use cached data
        if (this.imageData &&
            this.cachedFunctionKey === functionKey &&
            this.cachedWidth === width &&
            this.cachedHeight === height) {
            return this.imageData;
        }

        this.objectiveFunction = objectiveFunction;
        const { domain, fn } = objectiveFunction;
        const range = getFunctionRange(functionKey, 100);

        // Create offscreen canvas for the contour
        const offscreen = document.createElement('canvas');
        offscreen.width = width;
        offscreen.height = height;
        const ctx = offscreen.getContext('2d');
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        // Calculate function values and map to greyscale
        for (let py = 0; py < height; py++) {
            for (let px = 0; px < width; px++) {
                // Map pixel to domain coordinates
                const x = domain.xMin + (px / width) * (domain.xMax - domain.xMin);
                const y = domain.yMax - (py / height) * (domain.yMax - domain.yMin); // Flip Y

                const value = fn(x, y);

                // Normalize value to [0, 1]
                let normalized = (value - range.min) / (range.max - range.min);
                normalized = Math.max(0, Math.min(1, normalized));

                // Map to greyscale: low values (good) = light, high values = dark
                // Using the color palette from spec: #e0e0e0 (224) to #404040 (64)
                const lightGrey = 230;
                const darkGrey = 70;
                const grey = Math.round(lightGrey - normalized * (lightGrey - darkGrey));

                const idx = (py * width + px) * 4;
                data[idx] = grey;     // R
                data[idx + 1] = grey; // G
                data[idx + 2] = grey; // B
                data[idx + 3] = 255;  // A
            }
        }

        // Add contour lines
        this.addContourLines(data, width, height, domain, fn, range);

        ctx.putImageData(imageData, 0, 0);
        this.imageData = offscreen;
        this.cachedFunctionKey = functionKey;
        this.cachedWidth = width;
        this.cachedHeight = height;

        return this.imageData;
    }

    /**
     * Add contour lines to the image data
     */
    addContourLines(data, width, height, domain, fn, range) {
        const numContours = 15;
        const contourColor = { r: 180, g: 180, b: 180 };

        // Pre-calculate all function values
        const values = new Float32Array(width * height);
        for (let py = 0; py < height; py++) {
            for (let px = 0; px < width; px++) {
                const x = domain.xMin + (px / width) * (domain.xMax - domain.xMin);
                const y = domain.yMax - (py / height) * (domain.yMax - domain.yMin);
                values[py * width + px] = fn(x, y);
            }
        }

        // For each contour level
        for (let i = 1; i < numContours; i++) {
            const level = range.min + (i / numContours) * (range.max - range.min);

            // Simple marching squares-like contour detection
            for (let py = 1; py < height - 1; py++) {
                for (let px = 1; px < width - 1; px++) {
                    const idx = py * width + px;
                    const v = values[idx];

                    // Check if this pixel is near a contour crossing
                    const vLeft = values[idx - 1];
                    const vRight = values[idx + 1];
                    const vUp = values[idx - width];
                    const vDown = values[idx + width];

                    const crossesH = (v - level) * (vRight - level) < 0 ||
                                    (v - level) * (vLeft - level) < 0;
                    const crossesV = (v - level) * (vUp - level) < 0 ||
                                    (v - level) * (vDown - level) < 0;

                    if (crossesH || crossesV) {
                        const dataIdx = idx * 4;
                        // Blend contour color with existing
                        const alpha = 0.3;
                        data[dataIdx] = Math.round(data[dataIdx] * (1 - alpha) + contourColor.r * alpha);
                        data[dataIdx + 1] = Math.round(data[dataIdx + 1] * (1 - alpha) + contourColor.g * alpha);
                        data[dataIdx + 2] = Math.round(data[dataIdx + 2] * (1 - alpha) + contourColor.b * alpha);
                    }
                }
            }
        }
    }

    /**
     * Draw the contour plot to a context
     */
    draw(ctx, showContours = true) {
        if (this.imageData) {
            ctx.drawImage(this.imageData, 0, 0);
        }
    }

    /**
     * Invalidate the cache
     */
    invalidate() {
        this.imageData = null;
        this.cachedFunctionKey = null;
    }
}

export default ContourPlot;
