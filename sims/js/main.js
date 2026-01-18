/**
 * Firefly Algorithm Simulator
 * Main entry point
 */
import { FireflyAlgorithm } from './firefly-algorithm.js';
import { Renderer } from './renderer.js';
import { UIController } from './ui-controller.js';

class App {
    constructor() {
        this.canvas = document.getElementById('simulation-canvas');
        this.algorithm = null;
        this.renderer = null;
        this.ui = null;
    }

    /**
     * Initialize the application
     */
    init() {
        // Create the algorithm with default parameters
        this.algorithm = new FireflyAlgorithm({
            n: 40,
            gamma: 1.0,
            beta0: 1.0,
            alpha: 0.2,
            functionKey: 'michalewicz'
        });

        // Create the renderer
        this.renderer = new Renderer(this.canvas);

        // Create the UI controller
        this.ui = new UIController(this.algorithm, this.renderer);

        // Initial render
        this.ui.initialRender();

        console.log('Firefly Algorithm Simulator initialized');
        console.log('Keyboard shortcuts: Space/P = Start/Pause, R = Reset, T = Trails, C = Contours');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
