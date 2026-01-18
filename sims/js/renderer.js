/**
 * Canvas Renderer for Firefly Algorithm Visualization
 */
import { ContourPlot } from './contour-plot.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.contourPlot = new ContourPlot(canvas, null);

        // Display options
        this.showTrails = false;
        this.showContours = true;

        // Animation
        this.lastFrameTime = 0;

        // Colors from spec
        this.colors = {
            fireflyDim: '#666666',
            fireflyBright: '#ffdd44',
            fireflyBest: '#ffaa00',
            trailColor: 'rgba(102, 102, 102, 0.3)'
        };

        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
    }

    /**
     * Handle canvas resize
     */
    handleResize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        // Account for stats bar height
        const statsBar = container.querySelector('.stats-bar');
        const statsHeight = statsBar ? statsBar.offsetHeight : 40;

        this.canvas.width = rect.width;
        this.canvas.height = rect.height - statsHeight;

        // Invalidate contour cache on resize
        this.contourPlot.invalidate();
    }

    /**
     * Main render function
     * @param {Object} algorithm - The firefly algorithm instance
     * @param {number} timestamp - Current timestamp from requestAnimationFrame
     * @param {number} timeScale - Time multiplier for animation speed (default 1.0)
     */
    render(algorithm, timestamp = performance.now(), timeScale = 1.0) {
        const { ctx, canvas } = this;
        const { fireflies, bestFirefly, objectiveFunction } = algorithm;
        const domain = objectiveFunction.domain;

        // Calculate deltaTime and apply time scale
        const rawDeltaTime = this.lastFrameTime ? timestamp - this.lastFrameTime : 16;
        const deltaTime = rawDeltaTime * timeScale;
        this.lastFrameTime = timestamp;

        // Check for response triggers (females respond to nearby male flashes)
        for (const firefly of fireflies) {
            if (firefly.gender === 'female') {
                firefly.checkForNearbyFlash(fireflies, domain);
            }
        }

        // Update flash state for all fireflies
        for (const firefly of fireflies) {
            firefly.updateFlash(deltaTime);
        }

        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw contour plot
        if (this.showContours) {
            const contourImage = this.contourPlot.generate(
                algorithm.params.functionKey,
                objectiveFunction
            );
            this.contourPlot.draw(ctx);
        }

        // Draw trails if enabled
        if (this.showTrails) {
            this.drawTrails(fireflies, domain);
        }

        // Draw connection lines between flashing fireflies
        this.drawFlashConnections(fireflies, domain);

        // Draw fireflies
        this.drawFireflies(fireflies, bestFirefly, domain);
    }

    /**
     * Convert domain coordinates to canvas coordinates
     */
    domainToCanvas(x, y, domain) {
        const canvasX = ((x - domain.xMin) / (domain.xMax - domain.xMin)) * this.canvas.width;
        const canvasY = this.canvas.height - ((y - domain.yMin) / (domain.yMax - domain.yMin)) * this.canvas.height;
        return { x: canvasX, y: canvasY };
    }

    /**
     * Draw firefly trails
     */
    drawTrails(fireflies, domain) {
        const { ctx } = this;

        for (const firefly of fireflies) {
            if (firefly.trail.length < 2) continue;

            ctx.beginPath();
            const start = this.domainToCanvas(firefly.trail[0].x, firefly.trail[0].y, domain);
            ctx.moveTo(start.x, start.y);

            for (let i = 1; i < firefly.trail.length; i++) {
                const point = this.domainToCanvas(firefly.trail[i].x, firefly.trail[i].y, domain);
                ctx.lineTo(point.x, point.y);
            }

            // Gradient trail from faded to current
            const alpha = 0.4;
            ctx.strokeStyle = `rgba(102, 102, 102, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    /**
     * Draw connection lines between fireflies that are flashing simultaneously
     */
    drawFlashConnections(fireflies, domain) {
        const { ctx, canvas } = this;
        const flashThreshold = 0.3;  // Minimum flash intensity to show connections
        const maxPixelDistance = Math.max(canvas.width, canvas.height) * 0.4;  // Max distance for connections

        // Collect fireflies that are currently flashing
        const flashingFireflies = fireflies.filter(f => f.flashIntensity > flashThreshold);

        if (flashingFireflies.length < 2) return;

        // Draw lines between pairs of flashing fireflies
        for (let i = 0; i < flashingFireflies.length; i++) {
            for (let j = i + 1; j < flashingFireflies.length; j++) {
                const f1 = flashingFireflies[i];
                const f2 = flashingFireflies[j];

                const pos1 = this.domainToCanvas(f1.x, f1.y, domain);
                const pos2 = this.domainToCanvas(f2.x, f2.y, domain);

                // Calculate pixel distance
                const dx = pos2.x - pos1.x;
                const dy = pos2.y - pos1.y;
                const pixelDistance = Math.sqrt(dx * dx + dy * dy);

                // Only draw if within distance threshold
                if (pixelDistance > maxPixelDistance) continue;

                // Line opacity based on minimum flash intensity and distance
                const intensityFactor = Math.min(f1.flashIntensity, f2.flashIntensity);
                const distanceFactor = 1 - (pixelDistance / maxPixelDistance);
                const alpha = intensityFactor * distanceFactor * 0.5;

                // Get colors based on gender
                const getColor = (firefly) => {
                    if (firefly.gender === 'female') {
                        return { r: 255, g: 150, b: 150 };
                    } else {
                        return { r: 150, g: 200, b: 255 };
                    }
                };

                const color1 = getColor(f1);
                const color2 = getColor(f2);

                // Create gradient from one firefly's color to the other
                const gradient = ctx.createLinearGradient(pos1.x, pos1.y, pos2.x, pos2.y);
                gradient.addColorStop(0, `rgba(${color1.r}, ${color1.g}, ${color1.b}, ${alpha})`);
                gradient.addColorStop(1, `rgba(${color2.r}, ${color2.g}, ${color2.b}, ${alpha})`);

                ctx.beginPath();
                ctx.moveTo(pos1.x, pos1.y);
                ctx.lineTo(pos2.x, pos2.y);
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 1.5 + intensityFactor * 1.5;  // Thicker line for stronger flashes
                ctx.stroke();
            }
        }
    }

    /**
     * Draw all fireflies
     */
    drawFireflies(fireflies, bestFirefly, domain) {
        const { ctx } = this;

        // Find value range for brightness normalization
        let minVal = Infinity, maxVal = -Infinity;
        for (const f of fireflies) {
            if (f.value < minVal) minVal = f.value;
            if (f.value > maxVal) maxVal = f.value;
        }
        const valueRange = maxVal - minVal || 1;

        // Draw regular fireflies first
        for (const firefly of fireflies) {
            const isBest = bestFirefly &&
                          Math.abs(firefly.x - bestFirefly.x) < 0.001 &&
                          Math.abs(firefly.y - bestFirefly.y) < 0.001;

            if (!isBest) {
                this.drawFirefly(firefly, domain, minVal, valueRange, false);
            }
        }

        // Draw best firefly on top
        if (bestFirefly) {
            // Find the actual firefly that matches best position
            const actualBest = fireflies.find(f =>
                Math.abs(f.x - bestFirefly.x) < 0.001 &&
                Math.abs(f.y - bestFirefly.y) < 0.001
            ) || bestFirefly;

            this.drawFirefly(actualBest, domain, minVal, valueRange, true);
        }
    }

    /**
     * Draw a single firefly
     */
    drawFirefly(firefly, domain, minVal, valueRange, isBest) {
        const { ctx } = this;
        const pos = this.domainToCanvas(firefly.x, firefly.y, domain);

        // Normalize brightness (0 = worst, 1 = best)
        const normalizedBrightness = 1 - (firefly.value - minVal) / valueRange;

        // Get flash intensity for realistic blinking
        const flashIntensity = firefly.flashIntensity || 0;

        // Base radius depends on brightness
        const baseRadius = 4 + normalizedBrightness * 4;

        if (isBest) {
            // Best firefly: gold with subtle constant glow + flash overlay
            const flashScale = 1 + 0.2 * flashIntensity;
            const radius = baseRadius * 1.3 * flashScale;

            // Constant subtle glow (always visible)
            const baseGlowAlpha = 0.3;
            // Flash overlay adds extra glow
            const flashGlowAlpha = 0.5 * flashIntensity;
            const totalGlowAlpha = baseGlowAlpha + flashGlowAlpha;

            // Outer glow
            const gradient = ctx.createRadialGradient(
                pos.x, pos.y, 0,
                pos.x, pos.y, radius * 2.5
            );
            gradient.addColorStop(0, `rgba(255, 170, 0, ${totalGlowAlpha})`);
            gradient.addColorStop(0.4, `rgba(255, 221, 68, ${totalGlowAlpha * 0.5})`);
            gradient.addColorStop(1, 'rgba(255, 221, 68, 0)');

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Core - brighter during flash
            const coreAlpha = 0.7 + 0.3 * flashIntensity;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 170, 0, ${coreAlpha})`;
            ctx.fill();

            // Bright center - intensity varies with flash
            const centerAlpha = 0.5 + 0.5 * flashIntensity;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${centerAlpha})`;
            ctx.fill();
        } else {
            // Regular firefly: gender-based colors and sizes
            // Females: larger (1.3x), red/warm tint
            // Males: normal size, blue/cool tint
            const isFemale = firefly.gender === 'female';
            const radius = isFemale ? baseRadius * 1.3 : baseRadius;

            // Gender-based colors
            let baseR, baseG, baseB;
            let brightR, brightG, brightB;

            if (isFemale) {
                // Female: red/warm tint
                baseR = 255; baseG = 100; baseB = 100;
                brightR = 255; brightG = 150; brightB = 150;
            } else {
                // Male: blue/cool tint
                baseR = 100; baseG = 150; baseB = 255;
                brightR = 150; brightG = 200; brightB = 255;
            }

            // Interpolate based on both normalized brightness and flash intensity
            const colorMix = Math.max(normalizedBrightness * 0.3, flashIntensity);
            const r = Math.round(baseR + colorMix * (brightR - baseR));
            const g = Math.round(baseG + colorMix * (brightG - baseG));
            const b = Math.round(baseB + colorMix * (brightB - baseB));

            // Glow during flash
            if (flashIntensity > 0.1) {
                const glowAlpha = flashIntensity * 0.6;
                const glowRadius = radius * (1.5 + flashIntensity);
                const gradient = ctx.createRadialGradient(
                    pos.x, pos.y, 0,
                    pos.x, pos.y, glowRadius * 2
                );
                gradient.addColorStop(0, `rgba(${brightR}, ${brightG}, ${brightB}, ${glowAlpha})`);
                gradient.addColorStop(1, `rgba(${brightR}, ${brightG}, ${brightB}, 0)`);

                ctx.beginPath();
                ctx.arc(pos.x, pos.y, glowRadius * 2, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
            }

            // Core
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fill();

            // Border for visibility
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
    }

    /**
     * Set display options
     */
    setShowTrails(show) {
        this.showTrails = show;
    }

    setShowContours(show) {
        this.showContours = show;
        if (show) {
            this.contourPlot.invalidate();
        }
    }

    /**
     * Force regeneration of contour plot
     */
    invalidateContour() {
        this.contourPlot.invalidate();
    }
}

export default Renderer;
