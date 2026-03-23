import type { IGameEngine, SceneDescriptor } from '../../core/types';

/**
 * Stack-based scene manager with async lifecycle hooks.
 *
 * Scenes are registered by name and can be loaded (replacing the stack),
 * pushed (stacking on top), or popped (returning to the previous scene).
 *
 * @example
 * ```ts
 * const scenes = new SceneManager();
 * scenes.init(engine);
 * scenes.register({ name: "menu", setup: async () => { ... } });
 * await scenes.load("menu");
 * ```
 */
export class SceneManager {
    private readonly _scenes = new Map<string, SceneDescriptor>();
    private readonly _stack: SceneDescriptor[] = [];
    private _engine?: IGameEngine;

    /** The scene at the top of the stack, or `undefined` if empty. */
    get currentScene(): SceneDescriptor | undefined {
        return this._stack[this._stack.length - 1];
    }

    /** Number of scenes currently in the stack. */
    get stackDepth(): number {
        return this._stack.length;
    }

    /**
     * Initialise the manager with an engine reference.
     * @param engine - The game engine instance.
     */
    init(engine: IGameEngine): void {
        this._engine = engine;
    }

    /**
     * Register a scene descriptor for later loading.
     * @param scene - The scene descriptor.
     */
    register(scene: SceneDescriptor): void {
        this._scenes.set(scene.name, scene);
    }

    /**
     * Unregister a scene by name.
     * @param name - The scene name.
     */
    unregister(name: string): void {
        this._scenes.delete(name);
    }

    /**
     * Load a scene, replacing the entire stack.
     *
     * The current top scene's `teardown` is called (if present), then the
     * stack is cleared and the new scene's `setup` is invoked.
     *
     * @param name - The registered scene name.
     * @throws If the manager has not been initialised or the scene is unknown.
     */
    async load(name: string): Promise<void> {
        if (!this._engine) {
            throw new Error('SceneManager not initialized — call init() first');
        }

        const descriptor = this._scenes.get(name);
        if (!descriptor) {
            throw new Error(`Scene "${name}" is not registered`);
        }

        const current = this.currentScene;
        if (current?.teardown) {
            await current.teardown(this._engine);
        }
        this._stack.length = 0;

        this._stack.push(descriptor);
        await descriptor.setup(this._engine);
    }

    /**
     * Push a scene onto the stack without tearing down the current one.
     *
     * @param name - The registered scene name.
     * @throws If the manager has not been initialised or the scene is unknown.
     */
    async push(name: string): Promise<void> {
        if (!this._engine) {
            throw new Error('SceneManager not initialized — call init() first');
        }

        const descriptor = this._scenes.get(name);
        if (!descriptor) {
            throw new Error(`Scene "${name}" is not registered`);
        }

        this._stack.push(descriptor);
        await descriptor.setup(this._engine);
    }

    /**
     * Pop the current scene off the stack.
     *
     * Its `teardown` is called (if present), then the new top scene's
     * `setup` is re-invoked.
     *
     * @throws If the manager has not been initialised.
     */
    async pop(): Promise<void> {
        if (!this._engine) {
            throw new Error('SceneManager not initialized — call init() first');
        }

        const current = this._stack.pop();
        if (current?.teardown) {
            await current.teardown(this._engine);
        }

        const next = this.currentScene;
        if (next) {
            await next.setup(this._engine);
        }
    }
}
