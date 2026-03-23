import type { IGameEngine, ISystem } from './types';

/**
 * Abstract base class for ECS systems.
 *
 * Systems contain the **logic** that operates on {@link Entity | entities} with
 * specific component signatures. Override {@link System.update | update} (and
 * optionally {@link System.fixedUpdate | fixedUpdate}) to implement per-frame
 * and fixed-timestep behaviour.
 *
 * Systems are sorted by {@link priority} — lower values run first.
 *
 * @example
 * ```ts
 * class MovementSystem extends System {
 *     readonly name = "movement";
 *     update(delta: number) {
 *         // move entities ...
 *     }
 * }
 * ```
 */
export abstract class System implements ISystem {
    /** Unique name used for registration and lookup. */
    abstract readonly name: string;
    /** Execution order — lower values run first. */
    readonly priority: number;
    /** When `false`, the engine skips this system during updates. */
    enabled = true;

    /** @param priority - Execution order. Defaults to `0`. */
    constructor(priority = 0) {
        this.priority = priority;
    }

    /** Called once when the system is registered with the engine. */
    onRegister?(_engine: IGameEngine): void;
    /** Called once when the system is unregistered from the engine. */
    onUnregister?(): void;
    /**
     * Called once per frame with the variable delta time.
     * @param delta - Seconds since the last frame (scaled).
     */
    abstract update(delta: number): void;
    /**
     * Called at a fixed interval for deterministic simulation.
     * @param _delta - The fixed timestep in seconds.
     */
    fixedUpdate?(_delta: number): void;
}
