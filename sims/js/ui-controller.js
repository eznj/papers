/**
 * UI Controller
 * Manages all UI interactions and binds controls to the algorithm
 */

export class UIController {
    constructor(algorithm, renderer) {
        this.algorithm = algorithm;
        this.renderer = renderer;

        this.isRunning = false;
        this.speed = 1; // iterations per second
        this.timeScale = 0.05; // time multiplier for animation (lower = slower flashes)
        this.animationId = null;
        this.lastStepTime = 0;

        this.initElements();
        this.bindEvents();
        this.updateStats();
    }

    /**
     * Initialize DOM element references
     */
    initElements() {
        // Sliders
        this.nSlider = document.getElementById('n-slider');
        this.gammaSlider = document.getElementById('gamma-slider');
        this.beta0Slider = document.getElementById('beta0-slider');
        this.alphaSlider = document.getElementById('alpha-slider');
        this.speedSlider = document.getElementById('speed-slider');

        // Value displays
        this.nValue = document.getElementById('n-value');
        this.gammaValue = document.getElementById('gamma-value');
        this.beta0Value = document.getElementById('beta0-value');
        this.alphaValue = document.getElementById('alpha-value');
        this.speedValue = document.getElementById('speed-value');
        this.timescaleSlider = document.getElementById('timescale-slider');
        this.timescaleValue = document.getElementById('timescale-value');

        // Buttons
        this.startBtn = document.getElementById('start-btn');
        this.resetBtn = document.getElementById('reset-btn');

        // Selects
        this.functionSelect = document.getElementById('function-select');

        // Toggles
        this.trailsToggle = document.getElementById('trails-toggle');
        this.contoursToggle = document.getElementById('contours-toggle');

        // Stats
        this.statGen = document.getElementById('stat-gen');
        this.statBest = document.getElementById('stat-best');
        this.statX = document.getElementById('stat-x');
        this.statY = document.getElementById('stat-y');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Parameter sliders
        this.nSlider.addEventListener('input', () => {
            const value = parseInt(this.nSlider.value);
            this.nValue.textContent = value;
            this.algorithm.setParams({ n: value });
        });

        this.gammaSlider.addEventListener('input', () => {
            const value = parseFloat(this.gammaSlider.value);
            this.gammaValue.textContent = value.toFixed(2);
            this.algorithm.setParams({ gamma: value });
        });

        this.beta0Slider.addEventListener('input', () => {
            const value = parseFloat(this.beta0Slider.value);
            this.beta0Value.textContent = value.toFixed(2);
            this.algorithm.setParams({ beta0: value });
        });

        this.alphaSlider.addEventListener('input', () => {
            const value = parseFloat(this.alphaSlider.value);
            this.alphaValue.textContent = value.toFixed(2);
            this.algorithm.setParams({ alpha: value });
        });

        this.speedSlider.addEventListener('input', () => {
            this.speed = parseInt(this.speedSlider.value);
            this.speedValue.textContent = this.speed;
        });

        this.timescaleSlider.addEventListener('input', () => {
            this.timeScale = parseFloat(this.timescaleSlider.value);
            this.timescaleValue.textContent = this.timeScale.toFixed(1);
        });

        // Buttons
        this.startBtn.addEventListener('click', () => this.toggleRun());
        this.resetBtn.addEventListener('click', () => this.reset());

        // Function select
        this.functionSelect.addEventListener('change', () => {
            const functionKey = this.functionSelect.value;
            this.algorithm.setParams({ functionKey });
            this.renderer.invalidateContour();
            this.updateStats();
        });

        // Display toggles
        this.trailsToggle.addEventListener('change', () => {
            this.renderer.setShowTrails(this.trailsToggle.checked);
            if (!this.trailsToggle.checked) {
                this.algorithm.clearTrails();
            }
        });

        this.contoursToggle.addEventListener('change', () => {
            this.renderer.setShowContours(this.contoursToggle.checked);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            switch (e.key.toLowerCase()) {
                case ' ':
                case 'p':
                    e.preventDefault();
                    this.toggleRun();
                    break;
                case 'r':
                    e.preventDefault();
                    this.reset();
                    break;
                case 't':
                    e.preventDefault();
                    this.trailsToggle.checked = !this.trailsToggle.checked;
                    this.renderer.setShowTrails(this.trailsToggle.checked);
                    break;
                case 'c':
                    e.preventDefault();
                    this.contoursToggle.checked = !this.contoursToggle.checked;
                    this.renderer.setShowContours(this.contoursToggle.checked);
                    break;
            }
        });
    }

    /**
     * Toggle simulation running state
     */
    toggleRun() {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }

    /**
     * Start the simulation
     */
    start() {
        this.isRunning = true;
        this.startBtn.textContent = 'Pause';
        this.startBtn.classList.add('running');
        this.lastStepTime = performance.now();
        this.animationId = requestAnimationFrame((ts) => this.animate(ts));
    }

    /**
     * Stop the simulation
     */
    stop() {
        this.isRunning = false;
        this.startBtn.textContent = 'Start';
        this.startBtn.classList.remove('running');
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Reset the simulation
     */
    reset() {
        this.stop();
        this.algorithm.reset();
        this.algorithm.clearTrails();
        // Reset renderer's lastFrameTime to avoid large deltaTime jump
        this.renderer.lastFrameTime = 0;
        this.renderer.render(this.algorithm);
        this.updateStats();
    }

    /**
     * Animation loop
     */
    animate(timestamp) {
        if (!this.isRunning) return;

        const now = timestamp || performance.now();
        const stepInterval = 1000 / this.speed;

        // Perform algorithm steps based on speed
        if (now - this.lastStepTime >= stepInterval) {
            this.algorithm.step();
            this.updateStats();
            this.lastStepTime = now;
        }

        // Always render for smooth animation (pass timestamp and timeScale for deltaTime calculation)
        this.renderer.render(this.algorithm, now, this.timeScale);

        this.animationId = requestAnimationFrame((ts) => this.animate(ts));
    }

    /**
     * Update statistics display
     */
    updateStats() {
        const stats = this.algorithm.getStats();
        if (!stats) return;

        this.statGen.textContent = stats.generation;
        this.statBest.textContent = stats.bestValue.toFixed(4);
        this.statX.textContent = stats.bestX.toFixed(3);
        this.statY.textContent = stats.bestY.toFixed(3);
    }

    /**
     * Initial render
     */
    initialRender() {
        this.renderer.render(this.algorithm);
        this.updateStats();
    }
}

export default UIController;
