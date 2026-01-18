/**
 * Firefly Algorithm Implementation
 * Based on Xin-She Yang's paper
 */
import { Firefly } from './firefly.js';
import { objectiveFunctions } from './objective-functions.js';

export class FireflyAlgorithm {
    constructor(params = {}) {
        this.params = {
            n: params.n || 40,           // Number of fireflies
            gamma: params.gamma || 1.0,   // Light absorption coefficient
            beta0: params.beta0 || 1.0,   // Base attractiveness
            alpha: params.alpha || 0.2,   // Randomization strength
            functionKey: params.functionKey || 'michalewicz'
        };

        this.generation = 0;
        this.fireflies = [];
        this.bestFirefly = null;
        this.objectiveFunction = objectiveFunctions[this.params.functionKey];

        this.initialize();
    }

    /**
     * Initialize the population with random fireflies
     */
    initialize() {
        this.fireflies = [];
        this.generation = 0;
        const domain = this.objectiveFunction.domain;

        for (let i = 0; i < this.params.n; i++) {
            const x = domain.xMin + Math.random() * (domain.xMax - domain.xMin);
            const y = domain.yMin + Math.random() * (domain.yMax - domain.yMin);
            const firefly = new Firefly(x, y, this.objectiveFunction);
            this.fireflies.push(firefly);
        }

        this.updateBest();
    }

    /**
     * Reset the algorithm with current parameters
     */
    reset() {
        this.initialize();
    }

    /**
     * Update the best firefly found so far
     */
    updateBest() {
        // For minimization, find the firefly with lowest value
        let best = this.fireflies[0];
        for (const f of this.fireflies) {
            if (f.value < best.value) {
                best = f;
            }
        }

        if (!this.bestFirefly || best.value < this.bestFirefly.value) {
            this.bestFirefly = best.clone();
        }
    }

    /**
     * Perform one iteration of the algorithm
     */
    step() {
        const { gamma, beta0, alpha } = this.params;
        const domain = this.objectiveFunction.domain;

        // Sort fireflies by brightness (value ascending for minimization)
        const sorted = [...this.fireflies].sort((a, b) => a.value - b.value);

        // For each firefly
        for (let i = 0; i < this.fireflies.length; i++) {
            const firefly = this.fireflies[i];
            let moved = false;

            // Compare with all other fireflies
            for (let j = 0; j < this.fireflies.length; j++) {
                if (i === j) continue;

                const other = this.fireflies[j];

                // If other is brighter (lower value for minimization)
                if (other.value < firefly.value) {
                    firefly.moveTowards(other, beta0, gamma, alpha, domain);
                    moved = true;
                }
            }

            // If this is the brightest firefly, do a random walk
            if (!moved) {
                firefly.randomWalk(alpha * 0.1, domain); // Reduced alpha for best
            }
        }

        this.generation++;
        this.updateBest();

        return {
            generation: this.generation,
            best: this.bestFirefly,
            fireflies: this.fireflies
        };
    }

    /**
     * Update algorithm parameters
     */
    setParams(newParams) {
        const prevN = this.params.n;
        const prevFunc = this.params.functionKey;

        this.params = { ...this.params, ...newParams };

        // If function changed, update reference and reinitialize
        if (newParams.functionKey && newParams.functionKey !== prevFunc) {
            this.objectiveFunction = objectiveFunctions[this.params.functionKey];
            // Update each firefly's reference and re-evaluate
            for (const f of this.fireflies) {
                f.objectiveFunction = this.objectiveFunction;
                f.clampToDomain(this.objectiveFunction.domain);
                f.evaluate();
            }
            this.bestFirefly = null;
            this.updateBest();
        }

        // If n changed, adjust population
        if (newParams.n && newParams.n !== prevN) {
            this.adjustPopulation(newParams.n);
        }
    }

    /**
     * Adjust population size
     */
    adjustPopulation(newN) {
        const domain = this.objectiveFunction.domain;

        if (newN > this.fireflies.length) {
            // Add new random fireflies
            while (this.fireflies.length < newN) {
                const x = domain.xMin + Math.random() * (domain.xMax - domain.xMin);
                const y = domain.yMin + Math.random() * (domain.yMax - domain.yMin);
                this.fireflies.push(new Firefly(x, y, this.objectiveFunction));
            }
        } else if (newN < this.fireflies.length) {
            // Remove worst fireflies
            this.fireflies.sort((a, b) => a.value - b.value);
            this.fireflies = this.fireflies.slice(0, newN);
        }
    }

    /**
     * Get current statistics
     */
    getStats() {
        if (!this.bestFirefly) return null;

        return {
            generation: this.generation,
            bestValue: this.bestFirefly.value,
            bestX: this.bestFirefly.x,
            bestY: this.bestFirefly.y,
            populationSize: this.fireflies.length
        };
    }

    /**
     * Clear all trails
     */
    clearTrails() {
        for (const f of this.fireflies) {
            f.clearTrail();
        }
    }
}

export default FireflyAlgorithm;
