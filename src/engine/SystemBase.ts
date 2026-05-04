/**
 * Abstract base class for all game systems.
 * Subclasses are registered with a {@link Systems} instance and ticked once per frame
 * by {@link Systems.update}.
 * @example
 * ```ts
 * class ScoreSystem extends SystemBase {
 *     public override update(delta: number): void {
 *         // accumulate score each frame
 *     }
 * }
 * game.systems.register('score', new ScoreSystem());
 * ```
 */
export abstract class SystemBase {
    /**
     * Called once when the system is registered.
     */
    public async register(): Promise<void> {}

    /**
     * Called once per frame while the game is running.
     * @param _delta - Elapsed time in seconds since the last frame.
     */
    public update(_delta: number): void {}
}

/**
 * Registry that holds every active {@link SystemBase} and forwards the
 * per-frame tick to each of them.
 * Access this via {@link Game.systems} rather than instantiating it directly.
 */
export class Systems {

    private readonly systems = new Map<string, SystemBase>();

    /**
     * Registers a system under a unique name.
     * If a system with the same name already exists it will be replaced.
     * @param name - Unique identifier for the system.
     * @param system - The {@link SystemBase} instance to register.
     */
    public async register(name: string, system: SystemBase): Promise<void> {
        this.systems.set(name, system);
        await system.register();
    }

    /**
     * Retrieves a registered system by name.
     * @param name - The name the system was registered under.
     * @returns The {@link SystemBase} instance, or `undefined` if not found.
     */
    public get(name: string): SystemBase | undefined {
        return this.systems.get(name);
    }

    /**
     * Forwards the frame tick to every registered system.
     * @param delta - Elapsed time in seconds since the last frame.
     */
    public update(delta: number): void {
        for (const system of this.systems.values()) {
            system.update(delta);
        }
    }
}