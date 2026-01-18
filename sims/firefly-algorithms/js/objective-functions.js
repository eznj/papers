/**
 * Objective Functions for Optimization
 * Each function has: fn(x, y), domain, name, and known optima
 */

export const objectiveFunctions = {
    michalewicz: {
        name: 'Michalewicz',
        fn: (x, y) => {
            const m = 10; // steepness parameter
            const term1 = Math.sin(x) * Math.pow(Math.sin((x * x) / Math.PI), 2 * m);
            const term2 = Math.sin(y) * Math.pow(Math.sin((2 * y * y) / Math.PI), 2 * m);
            return -(term1 + term2);
        },
        domain: { xMin: 0, xMax: Math.PI, yMin: 0, yMax: Math.PI },
        optima: [{ x: 2.20, y: 1.57, value: -1.801 }],
        minimize: true
    },

    rastrigin: {
        name: 'Rastrigin',
        fn: (x, y) => {
            const A = 10;
            return A * 2 + (x * x - A * Math.cos(2 * Math.PI * x)) +
                   (y * y - A * Math.cos(2 * Math.PI * y));
        },
        domain: { xMin: -5.12, xMax: 5.12, yMin: -5.12, yMax: 5.12 },
        optima: [{ x: 0, y: 0, value: 0 }],
        minimize: true
    },

    rosenbrock: {
        name: 'Rosenbrock',
        fn: (x, y) => {
            const a = 1, b = 100;
            return Math.pow(a - x, 2) + b * Math.pow(y - x * x, 2);
        },
        domain: { xMin: -2, xMax: 2, yMin: -1, yMax: 3 },
        optima: [{ x: 1, y: 1, value: 0 }],
        minimize: true
    },

    himmelblau: {
        name: 'Himmelblau',
        fn: (x, y) => {
            return Math.pow(x * x + y - 11, 2) + Math.pow(x + y * y - 7, 2);
        },
        domain: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
        optima: [
            { x: 3.0, y: 2.0, value: 0 },
            { x: -2.805118, y: 3.131312, value: 0 },
            { x: -3.779310, y: -3.283186, value: 0 },
            { x: 3.584428, y: -1.848126, value: 0 }
        ],
        minimize: true
    },

    sphere: {
        name: 'Sphere',
        fn: (x, y) => {
            return x * x + y * y;
        },
        domain: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
        optima: [{ x: 0, y: 0, value: 0 }],
        minimize: true
    }
};

/**
 * Get the value range for a function over its domain
 * Used for normalizing contour colors
 */
export function getFunctionRange(funcKey, resolution = 50) {
    const func = objectiveFunctions[funcKey];
    const { domain, fn } = func;

    let min = Infinity;
    let max = -Infinity;

    const dx = (domain.xMax - domain.xMin) / resolution;
    const dy = (domain.yMax - domain.yMin) / resolution;

    for (let i = 0; i <= resolution; i++) {
        for (let j = 0; j <= resolution; j++) {
            const x = domain.xMin + i * dx;
            const y = domain.yMin + j * dy;
            const value = fn(x, y);

            if (value < min) min = value;
            if (value > max) max = value;
        }
    }

    return { min, max };
}

export default objectiveFunctions;
