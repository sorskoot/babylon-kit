import {Engine, Scene, WebXRDefaultExperience} from '@babylonjs/core';
import { GameObject } from "./GameObject";
import { InteractionManager } from "./InteractionManager";
import { XRManager } from "./XRManager";
import type { XRManagerOptions } from "./XRManager";

/**
 * Abstract base class for every scene in the game.
 *
 * A `GameScene` owns a BabylonJS {@link Scene}, a registry of
 * {@link GameObject} instances, an {@link InteractionManager}, and an
 * {@link XRManager}.  Subclasses must implement {@link setup} to build the
 * scene content and may override {@link update} for scene-level per-frame
 * logic.
 *
 * @example
 * ```ts
 * class MainScene extends GameScene {
 *     async setup() {
 *         new ArcRotateCamera("cam", …, this.scene);
 *         new HemisphericLight("light", …, this.scene);
 *         this.addGameObject("player", new Player(this.scene));
 *     }
 * }
 * ```
 */
export abstract class GameScene {
    protected scene: Scene;
    protected engine: Engine;
    protected gameObjects: Map<string, GameObject> = new Map();
    protected interactionManager: InteractionManager;
    protected xrManager: XRManager;

    /**
     * Creates a new GameScene and wires up the per-frame update loop.
     *
     * @param engine - The BabylonJS engine used to create the underlying Scene.
     */
    constructor(engine: Engine) {
        this.engine = engine;
        this.scene = new Scene(engine);
        this.interactionManager = new InteractionManager(this.scene, this.gameObjects);
        this.xrManager = new XRManager(this.scene);

        this.scene.onBeforeRenderObservable.add(() => {
            const dt = this.engine.getDeltaTime() / 1000;
            this.update(dt);
        });
    }

    public getScene(): Scene {
        return this.scene;
    }

    public getInteractionManager(): InteractionManager {
        return this.interactionManager;
    }

    public getXRManager(): XRManager {
        return this.xrManager;
    }

    /**
     * Initialise WebXR for this scene. Call after setup() when camera and
     * environment are ready.
     *
     * @example Teleportation
     * ```ts
     * await this.initializeXR({
     *     movement: {
     *         mode: "teleportation",
     *         floorMeshes: [ground],
     *         timeToTeleport: 3000,
     *     },
     * });
     * ```
     *
     * @example Smooth locomotion
     * ```ts
     * await this.initializeXR({
     *     movement: {
     *         mode: "locomotion",
     *         movementSpeed: 0.1,
     *     },
     * });
     * ```
     */
    public async initializeXR(options?: XRManagerOptions): Promise<WebXRDefaultExperience> {
        return this.xrManager.initialize(options);
    }

    /** Register a GameObject in this scene. Calls onStart() automatically. */
    public addGameObject(key: string, obj: GameObject): void {
        this.gameObjects.set(key, obj);
        obj.onStart();
    }

    /** Retrieve a registered GameObject by key. */
    public getGameObject(key: string): GameObject | undefined {
        return this.gameObjects.get(key);
    }

    /** Get all GameObjects that have a specific tag. */
    public getGameObjectsByTag(tag: string): GameObject[] {
        const result: GameObject[] = [];
        for (const obj of this.gameObjects.values()) {
            if (obj.hasTag(tag)) {
                result.push(obj);
            }
        }
        return result;
    }

    /** Remove and dispose a GameObject by key. */
    public removeGameObject(key: string): void {
        const obj = this.gameObjects.get(key);
        if (obj) {
            obj.dispose();
            this.gameObjects.delete(key);
        }
    }

    public render(): void {
        this.scene.render();
    }

    public abstract setup(): Promise<void>;

    /** Called every frame before render. Override for scene-level logic. */
    protected update(deltaTime: number): void {
        for (const obj of this.gameObjects.values()) {
            if (obj.enabled) {
                obj.onUpdate(deltaTime);
            }
        }
    }

    public dispose(): void {
        for (const obj of this.gameObjects.values()) {
            obj.dispose();
        }
        this.gameObjects.clear();
        this.xrManager.dispose();
        this.scene.dispose();
    }
}
