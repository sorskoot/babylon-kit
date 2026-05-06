import type {TransformNode} from '@babylonjs/core';
import {
    AbstractMesh,
    type Camera,
    KeyboardEventTypes,
    type KeyboardInfo,
    type Observer,
    PointerEventTypes,
    type PointerInfo,
    Vector3,
    WebXRCamera,
    //type WebXRDefaultExperience,
} from '@babylonjs/core';
import {GameObject, type XRManager} from '@sorskoot/babylon-kit';
import {GameScene} from '../engine/GameScene';

/**
 * When an object with this GameObject is selected it is moved in front of the
 * active camera (or attached to the selecting controller in WebXR), allowing
 * the player to inspect it by rotating it with the pointer / controller.
 *
 * Camera movement is disabled while the player is inspecting. Interacting
 * again (clicking the object) or pressing Escape returns the object to its
 * original position and restores camera control.
 */
export class InspectObject extends GameObject {

    private orgPosition: Vector3 | undefined;
    private orgRotation: Vector3 | undefined;
    private orgScaling: Vector3 | undefined;
    private orgParent: TransformNode | null = null;

    private isInspecting = false;

    /** Distance in front of the camera at which the object is held (desktop). */
    private readonly holdDistance = 0.6;

    /** Offset from the controller grip at which the object is held (VR). */
    private readonly gripOffset = new Vector3(0, 0, -0.15);

    /** The grip/pointer mesh this object is currently attached to in VR. */
    private xrControllerGrip: AbstractMesh | null = null;

    /** Native XR session + handler used to detect a second trigger press in VR. */
    private xrSession: XRSession | null = null;
    private xrSelectHandler: (() => void) | null = null;

    private pointerObserver: Observer<PointerInfo> | null = null;
    private keyObserver: Observer<KeyboardInfo> | null = null;

    constructor(
        name: string,
        scene: GameScene,
        private xrManager: XRManager,
        mesh: TransformNode,
        //private readonly xrExperience?: WebXRDefaultExperience,
    ) {
        super(name, scene);
        this.node = mesh;

        // store original transform
        this.orgPosition = this.node?.position.clone();
        this.orgRotation = this.node?.rotation.clone();
        this.orgScaling = this.node?.scaling.clone();
    }

    public onStart(): void {
    }

    public onUpdate(_deltaTime: number): void {
        if (!this.isInspecting || !this.node) {
            return;
        }

        // In VR the mesh follows the controller grip automatically via parenting.
        if (this.xrControllerGrip) {
            return;
        }

        // Desktop / non-grab XR: keep the object anchored in front of the camera.
        const camera = this.scene.activeCamera;
        if (!camera) {
            return;
        }

        const forward = camera.getForwardRay(1).direction;
        this.node.position.copyFrom(
            camera.position.add(forward.scale(this.holdDistance)),
        );
    }

    public onInteract(): void {
        if (this.isInspecting) {
            this.endInspect();
        } else {
            this.startInspect();
        }
    }

    private startInspect(): void {
        if (!this.node) {
            return;
        }

        const camera = this.scene.activeCamera;
        if (!camera) {
            return;
        }

        // Persist current transforms before we move anything
        this.orgPosition = this.node.position.clone();
        this.orgRotation = this.node.rotation.clone();
        this.orgScaling = this.node.scaling.clone();
        this.orgParent = (this.node.parent as TransformNode | null) ?? null;

        if (this.xrManager.isInXR()) {
            this.startInspectXR();
        } else {
            this.startInspectDesktop(camera);
        }

        this.isInspecting = true;
        console.log(`[InspectObject] Started inspecting "${this.name}"`);
    }

    /** Desktop / flat-screen inspection path. */
    private startInspectDesktop(camera: Camera): void {
        if (!this.node) {
            return;
        }

        // Detach from parent for free world-space positioning
        if (this.orgParent) {
            this.node.setParent(null);
        }

        // Freeze camera movement
        camera!.detachControl();

        // Snap object in front of camera
        const forward = camera!.getForwardRay(1).direction;
        this.node.position.copyFrom(
            camera!.position.add(forward.scale(this.holdDistance)),
        );

        // Rotate only while a mouse button is held — i.e. drag, not hover
        this.pointerObserver = this.scene.onPointerObservable.add((info) => {
            if (info.type !== PointerEventTypes.POINTERMOVE || !this.node) {
                return;
            }
            const ev = info.event as PointerEvent;
            if (ev.buttons === 0) {   // no button held → skip
                return;
            }
            this.node.rotation.y += ev.movementX * 0.005;
            this.node.rotation.x += ev.movementY * 0.005;
        });

        // Allow Escape to exit inspection
        this.keyObserver = this.scene.onKeyboardObservable.add((info) => {
            if (info.type === KeyboardEventTypes.KEYDOWN && info.event.key === 'Escape') {
                this.endInspect();
            }
        });
    }

    /** VR inspection path — parent mesh to the dominant controller's grip. */
    private startInspectXR(): void {
        if (!this.node || !this.xrManager) {
            return;
        }

        const controllers = this.xrManager.getControllers();
        // Prefer the right (dominant) hand; fall back to left, then any
        const controller =
                  controllers.find(c => c.inputSource.handedness === 'right') ??
                  controllers.find(c => c.inputSource.handedness === 'left') ??
                  controllers[0];

        const grip = controller?.grip ?? controller?.pointer ?? null;
        if (!grip) {
            console.warn('[InspectObject] No XR controller grip found, falling back to camera mode');
            const camera = this.scene.activeCamera;
            if (camera) {
                this.startInspectDesktop(camera as Camera);
            }
            return;
        }

        // Detach from scene hierarchy first, then re-parent to grip
        if (this.orgParent) {
            this.node.setParent(null);
        }
        this.node.setParent(grip);

        // Position the object slightly in front of the grip
        this.node.position.copyFrom(this.gripOffset);
        this.node.rotation.copyFrom(Vector3.Zero());

        this.xrControllerGrip = grip;

        // The mesh is now parented to the controller so the XR laser can no
        // longer pick it. Listen on the native XR session instead: the NEXT
        // selectstart (trigger press) will return the object.
        const session = this.xrManager.getExperience()!.baseExperience.sessionManager.session;
        const handler = () => {
            if (this.isInspecting) {
                this.endInspect();
            }
        };
        session.addEventListener('selectstart', handler);
        this.xrSession = session;
        this.xrSelectHandler = handler;
    }

    private endInspect(): void {
        if (!this.node) {
            return;
        }

        // Remove desktop observables (may be null in VR)
        if (this.pointerObserver) {
            this.scene.onPointerObservable.remove(this.pointerObserver);
            this.pointerObserver = null;
        }
        if (this.keyObserver) {
            this.scene.onKeyboardObservable.remove(this.keyObserver);
            this.keyObserver = null;
        }

        // Restore camera control (only needed on desktop)
        const camera = this.scene.activeCamera;
        if (camera && !(camera instanceof WebXRCamera)) {
            camera.attachControl(true);
        }

        // Detach from XR controller grip (if any)
        if (this.xrControllerGrip) {
            // Remove the native XR session listener before unparenting
            if (this.xrSession && this.xrSelectHandler) {
                this.xrSession.removeEventListener('selectstart', this.xrSelectHandler);
                this.xrSession = null;
                this.xrSelectHandler = null;
            }
            this.node.setParent(null);
            this.xrControllerGrip = null;
        }

        // Restore original scene-graph parent
        if (this.orgParent) {
            this.node.setParent(this.orgParent);
        }

        // Restore original transform
        if (this.orgPosition) {
            this.node.position.copyFrom(this.orgPosition);
        }
        if (this.orgRotation) {
            this.node.rotation.copyFrom(this.orgRotation);
        }
        if (this.orgScaling) {
            this.node.scaling.copyFrom(this.orgScaling);
        }

        this.isInspecting = false;
        console.log(`[InspectObject] Stopped inspecting "${this.name}"`);
    }
}





