import { Engine, Scene } from "@babylonjs/core";
import { GameScene } from "./GameScene";

export class SceneManager {
    private engine: Engine;
    private scenes: Map<string, GameScene> = new Map();
    private activeSceneKey: string | null = null;

    constructor(engine: Engine) {
        this.engine = engine;
    }

    public getEngine(): Engine {
        return this.engine;
    }

    public async addScene(key: string, scene: GameScene): Promise<void> {
        this.scenes.set(key, scene);
        await scene.setup();
    }

    public async switchTo(key: string): Promise<void> {
        const scene = this.scenes.get(key);
        if (!scene) {
            throw new Error(`Scene "${key}" not found.`);
        }
        this.activeSceneKey = key;
    }

    public getActiveScene(): Scene | null {
        if (!this.activeSceneKey) return null;
        const gameScene = this.scenes.get(this.activeSceneKey);
        return gameScene ? gameScene.getScene() : null;
    }

    public getActiveGameScene(): GameScene | null {
        if (!this.activeSceneKey) return null;
        return this.scenes.get(this.activeSceneKey) ?? null;
    }

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

    public dispose(): void {
        for (const scene of this.scenes.values()) {
            scene.dispose();
        }
        this.scenes.clear();
        this.activeSceneKey = null;
    }
}
