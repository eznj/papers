/**
 * Firefly class representing a single firefly in the swarm
 */
export class Firefly {
    constructor(x, y, objectiveFunction) {
        this.x = x;
        this.y = y;
        this.objectiveFunction = objectiveFunction;
        this.brightness = 0;
        this.trail = []; // For trail visualization
        this.maxTrailLength = 20;

        // Gender differentiation
        this.gender = Math.random() < 0.5 ? 'male' : 'female';

        // Flash state for realistic blinking
        this.flashPhase = Math.random() * 6000;  // Offset so not all sync
        // Flash interval based on gender: males flash more frequently to attract
        if (this.gender === 'male') {
            this.flashInterval = 1500 + Math.random() * 1500;  // 1.5-3s (frequent, attracting)
        } else {
            this.flashInterval = 3000 + Math.random() * 3000;  // 3-6s (less frequent, responding)
        }
        this.flashDuration = 150 + Math.random() * 100;  // 150-250ms
        this.isFlashing = false;
        this.flashIntensity = 0;  // 0-1, drives glow

        // Response flash mechanism (females respond to nearby male flashes)
        this.responseDelay = 0;      // countdown timer for response flash
        this.isResponding = false;   // true when triggered by nearby male

        this.evaluate();
    }

    /**
     * Evaluate the objective function at current position
     * Brightness is inversely related to function value (for minimization)
     */
    evaluate() {
        this.value = this.objectiveFunction.fn(this.x, this.y);
        // For minimization, lower values = higher brightness
        // We'll normalize brightness later based on population
        this.brightness = -this.value;
    }

    /**
     * Get the distance to another firefly
     */
    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Move towards a brighter firefly
     * Movement: x_i = x_i + β₀·e^(-γr²)(x_j - x_i) + α(rand - 0.5)
     */
    moveTowards(other, beta0, gamma, alpha, domain) {
        // Save current position for trail
        this.addTrailPoint();

        const r = this.distanceTo(other);
        const rSquared = r * r;

        // Attractiveness decreases with distance
        const beta = beta0 * Math.exp(-gamma * rSquared);

        // Move towards the brighter firefly with some randomness
        const dx = other.x - this.x;
        const dy = other.y - this.y;

        // Scale factor for randomization based on domain size
        const domainScaleX = (domain.xMax - domain.xMin);
        const domainScaleY = (domain.yMax - domain.yMin);

        this.x += beta * dx + alpha * domainScaleX * (Math.random() - 0.5);
        this.y += beta * dy + alpha * domainScaleY * (Math.random() - 0.5);

        // Clamp to domain bounds
        this.clampToDomain(domain);

        // Re-evaluate fitness
        this.evaluate();
    }

    /**
     * Random walk for the brightest firefly
     */
    randomWalk(alpha, domain) {
        this.addTrailPoint();

        const domainScaleX = (domain.xMax - domain.xMin);
        const domainScaleY = (domain.yMax - domain.yMin);

        this.x += alpha * domainScaleX * (Math.random() - 0.5);
        this.y += alpha * domainScaleY * (Math.random() - 0.5);

        this.clampToDomain(domain);
        this.evaluate();
    }

    /**
     * Ensure firefly stays within domain bounds
     */
    clampToDomain(domain) {
        this.x = Math.max(domain.xMin, Math.min(domain.xMax, this.x));
        this.y = Math.max(domain.yMin, Math.min(domain.yMax, this.y));
    }

    /**
     * Add current position to trail
     */
    addTrailPoint() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
    }

    /**
     * Clear the trail
     */
    clearTrail() {
        this.trail = [];
    }

    /**
     * Update flash state for realistic blinking
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    updateFlash(deltaTime) {
        // Handle response flash countdown
        if (this.isResponding && this.responseDelay > 0) {
            this.responseDelay -= deltaTime;
            if (this.responseDelay <= 0) {
                // Trigger response flash
                this.isFlashing = true;
                this.flashPhase = 0;
                this.responseDelay = 0;
            }
        }

        // Normal flash phase update (only if not waiting for response)
        if (!this.isResponding || this.responseDelay <= 0) {
            this.flashPhase += deltaTime;

            if (this.flashPhase >= this.flashInterval) {
                this.isFlashing = true;
                this.flashPhase = 0;
            }
        }

        if (this.isFlashing) {
            // Asymmetric envelope: fast attack, slow decay
            const t = this.flashPhase / this.flashDuration;
            if (t < 0.2) {
                // Fast rise (first 20% of duration)
                this.flashIntensity = t / 0.2;
            } else if (t < 1.0) {
                // Slow exponential decay (remaining 80%)
                this.flashIntensity = Math.exp(-3 * (t - 0.2));
            } else {
                this.isFlashing = false;
                this.flashIntensity = 0;
                // Clear responding state after response flash completes
                this.isResponding = false;
            }
        }
    }

    /**
     * Check for nearby male flashes and trigger response (females only)
     * @param {Array} fireflies - All fireflies in the simulation
     * @param {Object} domain - The domain bounds for distance calculation
     */
    checkForNearbyFlash(fireflies, domain) {
        // Only females respond, and only if not already flashing or responding
        if (this.gender !== 'female' || this.isFlashing || this.isResponding) {
            return;
        }

        // Don't trigger if about to flash naturally (within 500ms)
        const timeToNextFlash = this.flashInterval - this.flashPhase;
        if (timeToNextFlash < 500) {
            return;
        }

        // Calculate domain scale for distance threshold
        const domainScale = Math.max(
            domain.xMax - domain.xMin,
            domain.yMax - domain.yMin
        );
        // Respond to males within ~20% of domain size
        const responseDistance = domainScale * 0.2;

        // Look for nearby flashing males
        for (const other of fireflies) {
            if (other === this || other.gender !== 'male') continue;

            // Check if male is flashing brightly
            if (other.flashIntensity > 0.5) {
                const distance = this.distanceTo(other);
                if (distance < responseDistance) {
                    // Trigger response with randomized delay (400-600ms)
                    this.responseDelay = 400 + Math.random() * 200;
                    this.isResponding = true;
                    return; // Only respond to one male at a time
                }
            }
        }
    }

    /**
     * Clone this firefly
     */
    clone() {
        const f = new Firefly(this.x, this.y, this.objectiveFunction);
        f.gender = this.gender;
        f.value = this.value;
        f.brightness = this.brightness;
        f.flashPhase = this.flashPhase;
        f.flashInterval = this.flashInterval;
        f.flashDuration = this.flashDuration;
        f.isFlashing = this.isFlashing;
        f.flashIntensity = this.flashIntensity;
        f.responseDelay = this.responseDelay;
        f.isResponding = this.isResponding;
        return f;
    }
}

export default Firefly;
