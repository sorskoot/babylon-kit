import { AbstractMesh, Scene, ActionManager, ExecuteCodeAction } from "@babylonjs/core";
import { GameObject } from "./GameObject";

/**
 * Handles pointer/click interactions between the player and
 * {@link GameObject} instances registered in a {@link GameScene}.
 *
 * Attach click handlers to individual objects with {@link enableInteraction},
 * or enable all objects sharing a tag at once with
 * {@link enableInteractionByTag}.  Use {@link pick} to perform a manual
 * hit-test at the current pointer position.
 */
export class InteractionManager {
    private scene: Scene;
    private gameObjects: Map<string, GameObject>;

    /**
     * @param scene       The BabylonJS scene to attach action managers to.
     * @param gameObjects Live map of registered game objects (kept in sync by
     *                    the owning {@link GameScene}).
     */
    constructor(scene: Scene, gameObjects: Map<string, GameObject>) {
        this.scene = scene;
        this.gameObjects = gameObjects;
    }

    /** Makes a GameObject clickable. Clicking it will call its onInteract(). */
    public enableInteraction(gameObject: GameObject): void {
        if (!gameObject.node || !(gameObject.node instanceof AbstractMesh)) return;

        const mesh = gameObject.node;

        if (!mesh.actionManager) {
            mesh.actionManager = new ActionManager(this.scene);
        }

        mesh.actionManager.registerAction(
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
                if (obj.node === pickResult.pickedMesh || pickResult.pickedMesh.isDescendantOf(obj.node!)) {
                    return obj;
                }
            }
        }

        return null;
    }
}
