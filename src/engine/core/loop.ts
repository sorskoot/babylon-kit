import type { TimeState } from './types';

/**
 * Core game loop with a fixed-timestep accumulator and variable-rate rendering.
 *
 * The loop runs via `requestAnimationFrame` and exposes the current
 * {@link TimeState} through the {@link GameLoop.time | time} property.
 * Raw delta is capped at **0.25 s** to prevent spiral-of-death issues.
 *
 * @remarks
 * The loop invokes three callbacks each frame:
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
 * ```
 */
export class GameLoop {
    private _running = false;
    private _animFrameId = 0;
    private _fixedAccumulator = 0;
    private _lastTimestamp = 0;

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

    /** Start the loop. Has no effect if already running. */
    start(): void {
        if (this._running) return;
        this._running = true;
        this._lastTimestamp = performance.now();
        this._fixedAccumulator = 0;
        this._animFrameId = requestAnimationFrame((t) => this._tick(t));
    }

    /** Stop the loop and cancel the pending animation frame. */
    stop(): void {
        this._running = false;
        if (this._animFrameId) {
            cancelAnimationFrame(this._animFrameId);
            this._animFrameId = 0;
        }
    }

    /** Pause updates while continuing to call the render callback. */
    pause(): void {
        this.time.paused = true;
    }

    /** Resume updates after a pause and reset the accumulator. */
    resume(): void {
        this.time.paused = false;
        this._lastTimestamp = performance.now();
        this._fixedAccumulator = 0;
    }

    /**
     * Manually advance the loop by one frame.
     *
     * Useful in tests where `requestAnimationFrame` is not available.
     *
     * @param timestamp - The `performance.now()` style timestamp in milliseconds.
     */
    tick(timestamp: number): void {
        this._tick(timestamp);
    }

    private _tick(timestamp: number): void {
        if (!this._running) return;

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

        this._animFrameId = requestAnimationFrame((t) => this._tick(t));
    }
}
