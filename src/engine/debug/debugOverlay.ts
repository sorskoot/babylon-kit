import type { IGameEngine } from '../core/types';

/** Snapshot of debug statistics for the current frame. */
export interface DebugStats {
    /** Approximate frames per second (averaged over the sample window). */
    fps: number;
    /** Average frame time in milliseconds. */
    frameTime: number;
    /** Number of active entities. */
    entityCount: number;
    /** Number of registered systems. */
    systemCount: number;
    /** Current frame counter. */
    frame: number;
}

/**
 * On-screen debug overlay that displays FPS, frame time, entity count, and
 * frame number.
 *
 * Call {@link init} once to create the DOM element, then call {@link update}
 * each frame while the overlay is enabled.
 *
 * @example
 * ```ts
 * const debug = new DebugOverlay();
 * debug.init(engine);
 * debug.enable();
 * // in render loop:
 * debug.update();
 * ```
 */
export class DebugOverlay {
    private _enabled = false;
    private _element?: HTMLDivElement;
    private _engine?: IGameEngine;
    private _frameTimeSamples: number[] = [];
    private readonly _maxSamples = 60;

    /** Whether the overlay is currently visible. */
    get enabled(): boolean {
        return this._enabled;
    }

    /**
     * Create the overlay DOM element and attach it to the page.
     * @param engine - The game engine instance.
     * @param parentElement - Optional parent. Defaults to `document.body`.
     */
    init(engine: IGameEngine, parentElement?: HTMLElement): void {
        this._engine = engine;
        this._element = document.createElement('div');
        Object.assign(this._element.style, {
            position: 'fixed',
            top: '8px',
            left: '8px',
            background: 'rgba(0, 0, 0, 0.75)',
            color: '#00ff88',
            fontFamily: 'monospace',
            fontSize: '12px',
            padding: '8px 12px',
            borderRadius: '4px',
            zIndex: '99999',
            pointerEvents: 'none',
            display: 'none',
        });
        (parentElement ?? document.body).appendChild(this._element);
    }

    /** Toggle the overlay on or off. */
    toggle(): void {
        this._enabled = !this._enabled;
        if (this._element) {
            this._element.style.display = this._enabled ? 'block' : 'none';
        }
    }

    /** Show the overlay. */
    enable(): void {
        this._enabled = true;
        if (this._element) {
            this._element.style.display = 'block';
        }
    }

    /** Hide the overlay. */
    disable(): void {
        this._enabled = false;
        if (this._element) {
            this._element.style.display = 'none';
        }
    }

    /** Compute and return the current debug statistics snapshot. */
    getStats(): DebugStats {
        if (!this._engine) {
            return {
                fps: 0,
                frameTime: 0,
                entityCount: 0,
                systemCount: 0,
                frame: 0,
            };
        }

        const avgFrameTime =
            this._frameTimeSamples.length > 0
                ? this._frameTimeSamples.reduce((a, b) => a + b, 0) /
                  this._frameTimeSamples.length
                : 0;

        return {
            fps: avgFrameTime > 0 ? 1 / avgFrameTime : 0,
            frameTime: avgFrameTime * 1000,
            entityCount: this._engine.entities.length,
            systemCount: 0,
            frame: this._engine.time.frame,
        };
    }

    /** Sample the current frame and refresh the overlay text. */
    update(): void {
        if (!this._enabled || !this._engine) return;

        this._frameTimeSamples.push(this._engine.time.delta);
        if (this._frameTimeSamples.length > this._maxSamples) {
            this._frameTimeSamples.shift();
        }

        const stats = this.getStats();

        if (this._element) {
            this._element.innerHTML = [
                `FPS: ${stats.fps.toFixed(0)}`,
                `Frame: ${stats.frameTime.toFixed(1)}ms`,
                `Entities: ${stats.entityCount}`,
                `Frame #: ${stats.frame}`,
            ].join('<br>');
        }
    }

    /** Remove the overlay element and release references. */
    dispose(): void {
        this._element?.remove();
        this._element = undefined;
        this._engine = undefined;
        this._frameTimeSamples = [];
    }
}
