import type {
    EngineConfig,
    IEntity,
    IGameEngine,
    ISystem,
    TimeState,
} from './types';
import { Entity } from './entity';
import { GameLoop } from './loop';

/** Default engine configuration values. */
const DEFAULT_CONFIG: EngineConfig = {
    antialias: true,
    adaptToDeviceRatio: true,
    targetFps: 60,
    fixedTimeStep: 1 / 60,
    debug: false,
};

/**
 * Top-level game engine that ties together entities, systems, services, and
 * the {@link GameLoop}.
 *
 * @remarks
 * Systems are executed in ascending {@link ISystem.priority | priority} order.
 * Services are stored in a generic map for lightweight dependency injection.
 *
 * @example
 * ```ts
 * const engine = new GameEngine({ canvasId: "renderCanvas" });
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

    /** @param config - Partial configuration merged with {@link DEFAULT_CONFIG}. */
    constructor(config: Partial<EngineConfig> = {}) {
        this._config = { ...DEFAULT_CONFIG, ...config };

        this._loop = new GameLoop(
            (delta) => this._update(delta),
            (delta) => this._fixedUpdate(delta),
            () => this._render(),
            this._config.fixedTimeStep,
        );
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
    }

    /** @inheritDoc */
    stop(): void {
        this._loop.stop();
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
     * Manually advance the loop by one frame.
     *
     * Useful in tests where `requestAnimationFrame` is not available.
     *
     * @param timestamp - A `performance.now()`-style timestamp in milliseconds.
     */
    manualTick(timestamp: number): void {
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
        // Rendering handled by Babylon.js scene.render() — called externally or via a render system
    }

    private _onEntityDestroyed(entity: Entity): void {
        const idx = this._entities.indexOf(entity);
        if (idx !== -1) {
            this._entities.splice(idx, 1);
        }
    }
}
