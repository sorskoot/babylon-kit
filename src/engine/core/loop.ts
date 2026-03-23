import type { TimeState } from './types';

/**
 * Core game loop with a fixed-timestep accumulator and variable-rate updates.
 *
 * The loop does **not** manage its own `requestAnimationFrame`. Instead it is
 * designed to be driven by an external frame source — typically Babylon.js's
 * `engine.runRenderLoop()`. Call {@link GameLoop.tick | tick()} once per frame
 * from that external loop to advance game state.
 *
 * Raw delta is capped at **0.25 s** to prevent spiral-of-death issues.
 *
 * @remarks
 * Each call to {@link GameLoop.tick | tick()} invokes up to three callback phases:
 * 1. **fixedUpdate** — zero or more times per frame, at a fixed interval.
 * 2. **update** — once per frame, with the variable (scaled) delta.
 * 3. **render** — once per frame, even while paused.
 *
 * @example
 * ```ts
 * const loop = new GameLoop(
 *     (dt) => updateSystems(dt),
 *     (dt) => stepPhysics(dt),
 *     ()   => scene.render(),
 * );
 * loop.start();
 *
 * // Drive from Babylon.js:
 * babylonEngine.runRenderLoop(() => {
 *     loop.tick(performance.now());
 * });
 * ```
 */
export class GameLoop {
    private _running = false;
    private _fixedAccumulator = 0;
    private _lastTimestamp = -1;

    /** Current timing snapshot exposed to the rest of the engine. */
    readonly time: TimeState = {
        delta: 0,
        elapsed: 0,
        fixedDelta: 1 / 60,
        timeScale: 1,
        frame: 0,
        paused: false,
    };

    private _onUpdate: (delta: number) => void;
    private _onFixedUpdate: (delta: number) => void;
    private _onRender: () => void;

    /**
     * @param onUpdate - Variable-rate update callback.
     * @param onFixedUpdate - Fixed-timestep update callback.
     * @param onRender - Render callback (called even when paused).
     * @param fixedTimeStep - Fixed timestep interval in seconds. @defaultValue `1/60`
     */
    constructor(
        onUpdate: (delta: number) => void,
        onFixedUpdate: (delta: number) => void,
        onRender: () => void,
        fixedTimeStep = 1 / 60,
    ) {
        this._onUpdate = onUpdate;
        this._onFixedUpdate = onFixedUpdate;
        this._onRender = onRender;
        this.time.fixedDelta = fixedTimeStep;
    }

    /** Whether the loop is currently running. */
    get running(): boolean {
        return this._running;
    }

    /**
     * Enable the loop so that subsequent {@link tick} calls are processed.
     *
     * Has no effect if already running. Resets the internal accumulator and
     * timestamp so the first tick produces a zero delta.
     */
    start(): void {
        if (this._running) return;
        this._running = true;
        this._lastTimestamp = -1;
        this._fixedAccumulator = 0;
    }

    /** Disable the loop. Subsequent {@link tick} calls will be ignored. */
    stop(): void {
        this._running = false;
    }

    /** Pause updates while continuing to call the render callback on tick. */
    pause(): void {
        this.time.paused = true;
    }

    /**
     * Resume updates after a pause.
     *
     * Resets the internal timestamp and accumulator so the next tick does not
     * see a huge delta from the time spent paused.
     */
    resume(): void {
        this.time.paused = false;
        this._lastTimestamp = -1;
        this._fixedAccumulator = 0;
    }

    /**
     * Advance the loop by one frame.
     *
     * Call this once per frame from an external source such as Babylon.js's
     * `engine.runRenderLoop()`.
     *
     * @param timestamp - A `performance.now()`-style timestamp in milliseconds.
     */
    tick(timestamp: number): void {
        if (!this._running) return;

        if (this._lastTimestamp < 0) {
            this._lastTimestamp = timestamp;
        }

        const rawDelta = (timestamp - this._lastTimestamp) / 1000;
        this._lastTimestamp = timestamp;

        const cappedDelta = Math.min(rawDelta, 0.25);

        if (!this.time.paused) {
            const delta = cappedDelta * this.time.timeScale;
            this.time.delta = delta;
            this.time.elapsed += delta;
            this.time.frame++;

            this._fixedAccumulator += delta;
            while (this._fixedAccumulator >= this.time.fixedDelta) {
                this._onFixedUpdate(this.time.fixedDelta);
                this._fixedAccumulator -= this.time.fixedDelta;
            }

            this._onUpdate(delta);
        }

        this._onRender();
    }
}
