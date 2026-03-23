import type {EngineConfig, IEntity, IGameEngine, ISystem, TimeState,} from './types';
import type {Engine as BabylonEngine} from '@babylonjs/core/Engines/engine';
import type {Scene} from '@babylonjs/core/scene';
import type {WebXRDefaultExperience} from '@babylonjs/core/XR/webXRDefaultExperience';
import {Entity} from './entity';
import {GameLoop} from './loop';

/** Default engine configuration values. */
const DEFAULT_CONFIG: EngineConfig = {
    antialias: true,
    adaptToDeviceRatio: true,
    targetFps: 60,
    fixedTimeStep: 1 / 60,
    debug: false,
    webXR: true,
    createDefaultCamera: true,
    createDefaultLight: true,
};

/**
 * Top-level game engine that ties together Babylon.js, entities, systems,
 * services, and the {@link GameLoop}.
 *
 * @remarks
 * Call {@link GameEngine.initialize | initialize()} to set up the canvas,
 * Babylon.js engine, scene, a default camera/light, and (optionally) a WebXR
 * experience. After initialization, {@link GameEngine.start | start()} begins
 * the render loop automatically — there is no need to manage
 * `requestAnimationFrame` or `engine.runRenderLoop()` yourself.
 *
 * Systems are executed in ascending {@link ISystem.priority | priority} order.
 * Services are stored in a generic map for lightweight dependency injection.
 *
 * @example
 * ```ts
 * const engine = new GameEngine({ debug: true });
 * await engine.initialize();
 *
 * engine.registerSystem(new MovementSystem());
 * engine.start();
 * ```
 */
export class GameEngine implements IGameEngine {
    private readonly _config: EngineConfig;
    private readonly _entities: Entity[] = [];
    private readonly _systems: ISystem[] = [];
    private readonly _services = new Map<string, unknown>();
    private readonly _loop: GameLoop;
    private _sorted = true;

    private _canvas?: HTMLCanvasElement;
    private _babylonEngine?: BabylonEngine;
    private _scene?: Scene;
    private _xr?: WebXRDefaultExperience;
    private _initialized = false;
    private _resizeHandler?: () => void;

    /** @inheritDoc */
    get time(): TimeState {
        return this._loop.time;
    }

    /** @inheritDoc */
    get entities(): ReadonlyArray<IEntity> {
        return this._entities;
    }

    /** The resolved configuration for this engine instance. */
    get config(): EngineConfig {
        return this._config;
    }

    /** @inheritDoc */
    get babylonEngine(): BabylonEngine | undefined {
        return this._babylonEngine;
    }

    /** @inheritDoc */
    get scene(): Scene | undefined {
        return this._scene;
    }

    /** @inheritDoc */
    get canvas(): HTMLCanvasElement | undefined {
        return this._canvas;
    }

    /** @inheritDoc */
    get xr(): WebXRDefaultExperience | undefined {
        return this._xr;
    }

    /** Whether the engine has been initialized with Babylon.js. */
    get initialized(): boolean {
        return this._initialized;
    }

    /** @param config - Partial configuration merged with {@link DEFAULT_CONFIG}. */
    constructor(config: Partial<EngineConfig> = {}) {
        this._config = {...DEFAULT_CONFIG, ...config};

        this._loop = new GameLoop(
            (delta) => this._update(delta),
            (delta) => this._fixedUpdate(delta),
            () => this._render(),
            this._config.fixedTimeStep,
        );
    }

    // ───────────────────────── Babylon.js bootstrap ──────────────────────────

    /**
     * Initialize the Babylon.js engine, scene, default camera &amp; light, and
     * (optionally) a WebXR experience.
     *
     * @remarks
     * - If a `<canvas>` with the configured {@link EngineConfig.canvasId | canvasId}
     *   (default `"renderCanvas"`) exists in the DOM it is reused; otherwise a
     *   full-viewport canvas is created and appended to `document.body`.
     * - A {@link @babylonjs/core!FreeCamera | FreeCamera} at `(0, 1.6, -3)` and a
     *   {@link @babylonjs/core!HemisphericLight | HemisphericLight} are created
     *   unless disabled via config.
     * - WebXR is enabled by default and will gracefully degrade with a console
     *   warning when unavailable.
     *
     * Safe to call multiple times — subsequent calls are no-ops.
     */
    async initialize(): Promise<void> {
        if (this._initialized) return;

        // Dynamic import keeps Babylon.js out of Node-based test bundles.
        const {
            Engine,
            Scene: BabylonScene,
            FreeCamera,
            HemisphericLight,
            Vector3,
        } = await import('@babylonjs/core');

        // Canvas
        this._canvas = this._resolveCanvas();

        // Babylon engine
        this._babylonEngine = new Engine(
            this._canvas,
            this._config.antialias,
            undefined,
            this._config.adaptToDeviceRatio,
        );

        // Scene
        this._scene = new BabylonScene(this._babylonEngine);

        // Default camera
        if (this._config.createDefaultCamera !== false) {
            const camera = new FreeCamera(
                'defaultCamera',
                new Vector3(0, 1.6, -3),
                this._scene,
            );
            camera.setTarget(Vector3.Zero());
            camera.attachControl(this._canvas, true);
        }

        // Default light
        if (this._config.createDefaultLight !== false) {
            new HemisphericLight(
                'defaultLight',
                new Vector3(0, 1, 0),
                this._scene,
            );
        }

        // WebXR
        if (this._config.webXR !== false) {
            try {
                this._xr =
                    await this._scene.createDefaultXRExperienceAsync({});
            } catch (e) {
                if (this._config.debug) {
                    console.warn('WebXR initialization skipped:', e);
                }
            }
        }

        // Resize handling
        this._resizeHandler = () => this._babylonEngine?.resize();
        window.addEventListener('resize', this._resizeHandler);

        this._initialized = true;

        if (this._config.debug) {
            if (this._config.debug) {
                document.addEventListener("keydown", async (e) => {
                    if (e.key === "i" && e.ctrlKey && e.altKey) {
                        const {Inspector} = await import("@babylonjs/inspector");
                        Inspector.Show(this._scene!, {});
                        e.stopPropagation();
                    }
                });
            }

        }
    }

    // ──────────────────────── Canvas resolution ──────────────────────────────

    /**
     * Resolve or create the canvas element based on the configuration.
     *
     * Priority: `config.canvas` > existing element by `config.canvasId` > create new.
     */
    private _resolveCanvas(): HTMLCanvasElement {
        if (this._config.canvas) {
            return this._config.canvas;
        }

        const canvasId = this._config.canvasId ?? 'renderCanvas';
        const existing = document.getElementById(
            canvasId,
        ) as HTMLCanvasElement | null;
        if (existing) {
            return existing;
        }

        // Create a full-viewport canvas
        const canvas = document.createElement('canvas');
        canvas.id = canvasId;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        canvas.style.touchAction = 'none';

        // Ensure the page fills the viewport so the canvas does too
        const applyFullViewport = (el: HTMLElement) => {
            el.style.margin = '0';
            el.style.padding = '0';
            el.style.width = '100%';
            el.style.height = '100%';
            el.style.overflow = 'hidden';
        };
        applyFullViewport(document.documentElement);
        applyFullViewport(document.body);

        document.body.appendChild(canvas);
        return canvas;
    }

    /** @inheritDoc */
    createEntity(name?: string): IEntity {
        const entity = new Entity(name, (e) => this._onEntityDestroyed(e));
        this._entities.push(entity);
        return entity;
    }

    /** @inheritDoc */
    destroyEntity(entity: IEntity): void {
        (entity as Entity).destroy();
    }

    /** @inheritDoc */
    registerSystem(system: ISystem): void {
        if (this._systems.some((s) => s.name === system.name)) {
            throw new Error(`System "${system.name}" is already registered`);
        }
        this._systems.push(system);
        this._sorted = false;
        system.onRegister?.(this);
    }

    /** @inheritDoc */
    unregisterSystem(system: ISystem): void {
        const idx = this._systems.indexOf(system);
        if (idx === -1) return;
        system.onUnregister?.();
        this._systems.splice(idx, 1);
    }

    /** @inheritDoc */
    getSystem<T extends ISystem>(name: string): T | undefined {
        return this._systems.find((s) => s.name === name) as T | undefined;
    }

    /** @inheritDoc */
    getService<T>(key: string): T | undefined {
        return this._services.get(key) as T | undefined;
    }

    /** @inheritDoc */
    registerService(key: string, service: unknown): void {
        if (this._services.has(key)) {
            throw new Error(`Service "${key}" is already registered`);
        }
        this._services.set(key, service);
    }

    /** @inheritDoc */
    start(): void {
        this._loop.start();

        // When Babylon.js has been initialized, drive the game loop from its
        // render loop so timing stays in sync with the rendering cadence.
        if (this._babylonEngine) {
            this._babylonEngine.runRenderLoop(() => {
                this.tick(performance.now());
            });
        }
    }

    /** @inheritDoc */
    stop(): void {
        this._loop.stop();
        this._babylonEngine?.stopRenderLoop();
    }

    /** @inheritDoc */
    pause(): void {
        this._loop.pause();
    }

    /** @inheritDoc */
    resume(): void {
        this._loop.resume();
    }

    /**
     * Advance the engine by one frame.
     *
     * @remarks
     * When the engine has been {@link initialize | initialized}, the Babylon.js
     * render loop calls this automatically. You only need to call it manually
     * when running without Babylon.js (e.g. in unit tests).
     *
     * @param timestamp - A `performance.now()`-style timestamp in milliseconds.
     */
    tick(timestamp: number): void {
        this._loop.tick(timestamp);
    }

    private _ensureSorted(): void {
        if (!this._sorted) {
            this._systems.sort((a, b) => a.priority - b.priority);
            this._sorted = true;
        }
    }

    private _update(delta: number): void {
        this._ensureSorted();
        for (const system of this._systems) {
            if (system.enabled) {
                system.update(delta);
            }
        }

        for (const entity of this._entities) {
            if (!entity.enabled) continue;
            for (const component of entity.components.values()) {
                component.onUpdate?.(delta);
            }
        }
    }

    private _fixedUpdate(delta: number): void {
        this._ensureSorted();
        for (const system of this._systems) {
            if (system.enabled) {
                system.fixedUpdate?.(delta);
            }
        }
    }

    private _render(): void {
        this._scene?.render();
    }

    /**
     * Dispose of the Babylon.js engine, scene, and all associated resources.
     *
     * After calling dispose the instance should not be reused.
     */
    dispose(): void {
        this.stop();

        // Clean up WebXR
        this._xr?.dispose();
        this._xr = undefined;

        // Clean up Babylon scene & engine
        this._scene?.dispose();
        this._scene = undefined;
        this._babylonEngine?.dispose();
        this._babylonEngine = undefined;

        // Remove resize listener
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = undefined;
        }

        this._canvas = undefined;
        this._initialized = false;
    }

    private _onEntityDestroyed(entity: Entity): void {
        const idx = this._entities.indexOf(entity);
        if (idx !== -1) {
            this._entities.splice(idx, 1);
        }
    }
}
