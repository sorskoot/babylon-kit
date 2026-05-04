import { Engine, Scene } from "@babylonjs/core";
import { GameScene } from "./GameScene";

/**
 * Manages the lifecycle and active state of {@link GameScene} instances.
 *
 * Scenes are registered by key, set up asynchronously, and can be switched
 * at runtime.  Only one scene is "active" at a time; the active scene is
 * rendered each frame by {@link Game}.
 *
 * @example
 * ```ts
 * await sceneManager.addScene("main", new MainScene(engine));
 * await sceneManager.switchTo("main");
 * ```
 */
export class SceneManager {
    private engine: Engine;
    private scenes: Map<string, GameScene> = new Map();
    private activeSceneKey: string | null = null;

    /**
     * @param engine - The BabylonJS engine shared across all managed scenes.
     */
    constructor(engine: Engine) {
        this.engine = engine;
    }

    /** Returns the BabylonJS engine this manager was created with. */
    public getEngine(): Engine {
        return this.engine;
    }

    /**
     * Registers a scene and calls its {@link GameScene.setup} method.
     *
     * @param key   Unique identifier used to switch to or remove this scene.
     * @param scene The {@link GameScene} to register.
     */
    public async addScene(key: string, scene: GameScene): Promise<void> {
        this.scenes.set(key, scene);
        await scene._internalSetup();
    }

    /**
     * Makes the scene registered under `key` the active scene.
     *
     * @throws If no scene with the given key has been registered.
     */
    public async switchTo(key: string): Promise<void> {
        const scene = this.scenes.get(key);
        if (!scene) {
            throw new Error(`Scene "${key}" not found.`);
        }
        this.activeSceneKey = key;
    }

    /**
     * Returns the underlying BabylonJS {@link Scene} of the active
     * {@link GameScene}, or `null` if no scene is active.
     */
    public getActiveScene(): Scene | null {
        if (!this.activeSceneKey) return null;
        const gameScene = this.scenes.get(this.activeSceneKey);
        return gameScene ? gameScene.getScene() : null;
    }

    /**
     * Returns the active {@link GameScene} instance, or `null` if none is active.
     */
    public getActiveGameScene(): GameScene | null {
        if (!this.activeSceneKey) return null;
        return this.scenes.get(this.activeSceneKey) ?? null;
    }

    /**
     * Disposes and removes a scene by key.
     * Clears the active key if the removed scene was active.
     *
     * @param key - Key of the scene to remove.
     */
    public removeScene(key: string): void {
        const scene = this.scenes.get(key);
        if (scene) {
            scene.dispose();
            this.scenes.delete(key);
            if (this.activeSceneKey === key) {
                this.activeSceneKey = null;
            }
        }
    }

    /** Disposes all registered scenes and clears the active scene key. */
    public dispose(): void {
        for (const scene of this.scenes.values()) {
            scene.dispose();
        }
        this.scenes.clear();
        this.activeSceneKey = null;
    }
}
