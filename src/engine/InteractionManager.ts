import { Scene, ActionManager, ExecuteCodeAction } from "@babylonjs/core";
import { GameObject } from "./GameObject";

export class InteractionManager {
    private scene: Scene;
    private gameObjects: Map<string, GameObject>;

    constructor(scene: Scene, gameObjects: Map<string, GameObject>) {
        this.scene = scene;
        this.gameObjects = gameObjects;
    }

    /** Makes a GameObject clickable. Clicking it will call its onInteract(). */
    public enableInteraction(gameObject: GameObject): void {
        if (!gameObject.mesh) return;

        if (!gameObject.mesh.actionManager) {
            gameObject.mesh.actionManager = new ActionManager(this.scene);
        }

        gameObject.mesh.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
                gameObject.onInteract();
            })
        );
    }

    /** Makes all current GameObjects with a given tag clickable. */
    public enableInteractionByTag(tag: string): void {
        for (const obj of this.gameObjects.values()) {
            if (obj.hasTag(tag)) {
                this.enableInteraction(obj);
            }
        }
    }

    /** Performs a raycast pick from the center of the screen and returns the hit GameObject, if any. */
    public pick(): GameObject | null {
        const pickResult = this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY
        );

        if (pickResult?.hit && pickResult.pickedMesh) {
            for (const obj of this.gameObjects.values()) {
                if (obj.mesh === pickResult.pickedMesh || pickResult.pickedMesh.isDescendantOf(obj.mesh!)) {
                    return obj;
                }
            }
        }

        return null;
    }
}
