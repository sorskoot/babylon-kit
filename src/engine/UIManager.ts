import {FollowBehavior, Mesh, MeshBuilder, Scene, Vector3} from '@babylonjs/core';
import {AdvancedDynamicTexture, Button, Control, Image, Rectangle, TextBlock} from '@babylonjs/gui';

export interface UI3DOptions {
    /** World position for the UI plane. */
    position?: Vector3;
    /** Width of the plane mesh in world units. Default 2. */
    planeWidth?: number;
    /** Height of the plane mesh in world units. Default 1. */
    planeHeight?: number;
    /** Texture resolution width in pixels. Default 1024. */
    resolutionWidth?: number;
    /** Texture resolution height in pixels. Default 512. */
    resolutionHeight?: number;
    /**
     * When true the UI plane renders on top of all other meshes,
     * ignoring depth. Useful for HUD-style panels that should
     * never be occluded. Default false.
     */
    renderOnTop?: boolean;
    /**
     * Whether the UI plane should always face the active camera
     * (billboard mode). Default false.
     */
    billboard?: boolean;
}

type Slices = { left: number; top: number; right: number; bottom: number };

/**
 * Creates and manages BabylonJS GUI panels: a single fullscreen 2D overlay
 * and any number of in-world 3D UI planes loaded from JSON files.
 *
 * @example Fullscreen HUD
 * ```ts
 * uiManager.createFullscreenUI("HUD", scene);
 * uiManager.addText("Score: 0", { top: "20px" });
 * ```
 *
 * @example In-world panel
 * ```ts
 * await uiManager.loadUI3D("sign", "/assets/ui/sign.json", scene, {
 *     position: new Vector3(0, 2, 3),
 *     planeWidth: 1.5,
 * });
 * ```
 */
export class UIManager {
    private ui: AdvancedDynamicTexture | null = null;
    private ui3DTextures: Map<string, { texture: AdvancedDynamicTexture; mesh: Mesh }> = new Map();

    // ── Fullscreen (2D overlay) UI ──────────────────────────────────

    /**
     * Creates a fullscreen 2D GUI overlay attached to the scene.
     * Must be called before {@link addText} or {@link addButton}.
     *
     * @param name  Display name of the texture resource.
     * @param scene The scene to attach the UI to.
     * @returns The created {@link AdvancedDynamicTexture}.
     */
    public createFullscreenUI(name: string, scene: Scene): AdvancedDynamicTexture {
        this.ui = AdvancedDynamicTexture.CreateFullscreenUI(name, true, scene);
        return this.ui;
    }

    /** Returns the active fullscreen GUI texture, or `null` if not yet created. */
    public getUI(): AdvancedDynamicTexture | null {
        return this.ui;
    }

    /**
     * Adds a {@link TextBlock} to the fullscreen UI.
     *
     * @param text    The string to display.
     * @param options Optional font size, color, and positioning.
     * @throws If the fullscreen UI has not been created yet.
     */
    public addText(
        text: string,
        options?: { fontSize?: number; color?: string; top?: string; left?: string },
    ): TextBlock {
        if (!this.ui) throw new Error('UI not initialized. Call createFullscreenUI first.');

        const textBlock = new TextBlock();
        textBlock.text = text;
        textBlock.fontSize = options?.fontSize ?? 24;
        textBlock.color = options?.color ?? 'white';
        textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        textBlock.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        if (options?.top) textBlock.top = options.top;
        if (options?.left) textBlock.left = options.left;
        this.ui.addControl(textBlock);
        return textBlock;
    }

    /**
     * Adds a simple clickable {@link Button} to the fullscreen UI.
     *
     * @param name     Unique name for the button control.
     * @param label    Text label rendered on the button.
     * @param onClick  Callback invoked when the button is clicked.
     * @param options  Optional size, position, color, and background.
     * @throws If the fullscreen UI has not been created yet.
     */
    public addButton(
        name: string,
        label: string,
        onClick: () => void,
        options?: { width?: string; height?: string; top?: string; color?: string; background?: string },
    ): Button {
        if (!this.ui) throw new Error('UI not initialized. Call createFullscreenUI first.');

        const button = Button.CreateSimpleButton(name, label);
        button.width = options?.width ?? '150px';
        button.height = options?.height ?? '40px';
        button.color = options?.color ?? 'white';
        button.background = options?.background ?? 'green';
        if (options?.top) button.top = options.top;
        button.onPointerUpObservable.add(onClick);
        this.ui.addControl(button);
        return button;
    }

    // ── 3D (in-world) UI loaded from JSON ───────────────────────────

    /**
     * Load a BabylonJS GUI JSON file (exported from the GUI Editor) and
     * display it on a plane mesh in 3D space.
     *
     * @param key   Unique identifier so the UI can be retrieved / disposed later.
     * @param url   URL to the JSON file (e.g. "/assets/ui/ui.json").
     * @param scene The scene to place the UI plane in.
     * @param options  Position, plane size and texture resolution.
     * @returns The AdvancedDynamicTexture created for the mesh.
     */
    public async loadUI3D(
        key: string,
        url: string,
        scene: Scene,
        options?: UI3DOptions,
    ): Promise<AdvancedDynamicTexture> {
        const planeWidth = options?.planeWidth ?? 2;
        const planeHeight = options?.planeHeight ?? 1;
        const resW = options?.resolutionWidth ?? 1024;
        const resH = options?.resolutionHeight ?? 512;
        const position = options?.position ?? Vector3.Zero();

        // Create a plane mesh to host the UI
        const plane = MeshBuilder.CreatePlane(`${key}_plane`, {
            width:  planeWidth,
            height: planeHeight,
        }, scene);
        plane.position = position;

        if (options?.renderOnTop) {
            plane.renderingGroupId = 1;
            plane.material = plane.material ?? null;
            // After material is assigned by ADT, disable depth test so
            // the UI is always drawn on top of the default group (0).
            scene.onBeforeRenderObservable.addOnce(() => {
                if (plane.material) {
                    plane.material.disableDepthWrite = true;
                    plane.material.needDepthPrePass = false;
                }
            });
            scene.setRenderingOrder(1);
        }

        if (options?.billboard) {
            plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
        }

        // Create an ADT mapped to the mesh
        const texture = AdvancedDynamicTexture.CreateForMesh(
            plane,
            resW,
            resH,
        );

        // Load the GUI layout from the JSON file
        await texture.parseFromURLAsync(url);

        this.ui3DTextures.set(key, {texture, mesh: plane});
        return texture;
    }

    /** Retrieve a previously loaded 3D UI texture by key. */
    public getUI3D(key: string): AdvancedDynamicTexture | undefined {
        return this.ui3DTextures.get(key)?.texture;
    }

    /** Retrieve the plane mesh hosting a 3D UI by key. */
    public getUI3DMesh(key: string): Mesh | undefined {
        return this.ui3DTextures.get(key)?.mesh;
    }

    /** Dispose a single 3D UI by key. */
    public disposeUI3D(key: string): void {
        const entry = this.ui3DTextures.get(key);
        if (entry) {
            entry.texture.dispose();
            entry.mesh.dispose();
            this.ui3DTextures.delete(key);
        }
    }

    /**
     * Show a transient text in front of the active camera that follows the camera and auto-disposes.
     *
     * @param text The text to show.
     * @param scene The scene containing the active camera.
     * @param durationMs Milliseconds before the text disappears (default: 3000).
     * @param options Options controlling distance, sizing and background/9-slice image.
     */
    public async showFloatingText(
        text: string,
        scene: Scene,
        durationMs: number = 3000,
        options?: {
            distance?: number; // world units in front of camera (default 2)
            width?: number; // plane width in world units (default 1.2)
            height?: number; // plane height in world units (default 0.4)
            resolutionW?: number; // texture pixel width
            resolutionH?: number; // texture pixel height
            fontSize?: number; // GUI font size
            color?: string; // font color
            backgroundColor?: string; // solid bg color if no image
            backgroundImageUrl?: string; // optional 9-slice image URL
            imageSlices?: { left: number; top: number; right: number; bottom: number } | number; // 9-slice in pixels
            renderOnTop?: boolean; // draw always on top,
            vertOffset?: number; // vertical offset from camera in world units (default 0)
            alpha?: number; // opacity of the text background (default 1.0)
        },
    ): Promise<void> {
        const planeW = options?.width ?? 1;
        const planeH = options?.height ?? .25;
        const resW = options?.resolutionW ?? 1024*planeW;
        const resH = options?.resolutionH ?? 1024*planeH;

        const cam = scene.activeCamera;
        if (!cam) throw new Error('No active camera in scene');

        // Create a small plane and parent it to the camera so it follows automatically.
        const plane = MeshBuilder.CreatePlane(`floatingTextPlane_${Date.now()}`, {
            width:  planeW,
            height: planeH,
        }, scene);

        if (options?.renderOnTop) {
            // render in a separate rendering group and disable depth on material (after ADT created)
            plane.renderingGroupId = 1;
            scene.setRenderingOrder(1);
        }

        // Create ADT for the mesh
        const adt = AdvancedDynamicTexture.CreateForMesh(plane, resW, resH);

        // After material is created, disable depth write so it draws on top if requested
        if (options?.renderOnTop) {
            scene.onBeforeRenderObservable.addOnce(() => {
                if (plane.material) {
                    (plane.material as any).disableDepthWrite = true;
                    (plane.material as any).needDepthPrePass = false;
                }
            });
        }

        if (options?.backgroundImageUrl) {
            const img = new Image('floatingBg');
            img.width = "100%";
            img.height = "100%";

            //img.stretch = Image.STRETCH_NINE_PATCH; // optional but recommended
            adt.addControl(img);
            img.source = options.backgroundImageUrl;
            img.alpha = options?.alpha ?? 1.0;
            // If you want 9-slice, set slice properties (pixel values)
            if (options?.imageSlices != null) {
                img.stretch = Image.STRETCH_NINE_PATCH;
                let slices: Slices = {left: 0, right: 0, top: 0, bottom: 0};
                if (typeof options.imageSlices === 'number') {
                    // If a single number is provided, use it for all sides
                    slices = {
                        left:   options.imageSlices as number,
                        top:    options.imageSlices as number,
                        right:  options.imageSlices as number,
                        bottom: options.imageSlices as number,
                    };
                } else if (this.isSlices(options.imageSlices)) {
                    slices = options.imageSlices;
                }
                img.sliceLeft = slices.left;
                img.sliceTop = slices.top;
                img.sliceRight = slices.right;
                img.sliceBottom = slices.bottom;

                //img.populateNinePatchSlicesFromImage = true;
            }



            console.log("ADT size:", adt.getSize());
            console.log("Image rect:", img);

        } else if (options?.backgroundColor) {
            const rect = new Rectangle();
            rect.width = '100%';
            rect.height = '100%';
            rect.cornerRadius = 32;
            rect.background = options.backgroundColor;
            rect.thickness = 0;
            rect.paddingTop = '6px';
            rect.paddingLeft = '10px';
            rect.paddingRight = '10px';
            rect.paddingBottom = '6px';
            adt.addControl(rect);
        }

        // Text
        const tb = new TextBlock();

        tb.text = text;
        tb.color = options?.color ?? 'white';
        tb.fontSize = options?.fontSize ?? 36;
        tb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        tb.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

        tb.width = '100%';
        tb.height = '100%';
        adt.addControl(tb);

        const followBehavior = new FollowBehavior();
        followBehavior.ignoreCameraPitchAndRoll = true;      // if you want to ignore head pitch/roll
        followBehavior.interpolatePose = true;               // smooth movement (default true)
        followBehavior.lerpTime = 50;                       // smoothing time in ms
        followBehavior.defaultDistance = options?.distance ?? 1;                // put it ~1.8 units in front of the camera
        followBehavior.maximumDistance = (options?.distance ?? 1) + .5;                  // allow some range
        followBehavior.minimumDistance = (options?.distance ?? 1) - .25;
        //followBehavior.useFixedVerticalOffset = true;        // lock vertical offset relative to camera
        followBehavior.pitchOffset = options?.vertOffset ?? 0.0;
        //followBehavior.ignoreAngleClamp = true;
        plane.addBehavior(followBehavior);

        // TODO: Remove use of Timeout and replace with some engine scheduling system.
        // Auto-dispose after duration
        window.setTimeout(() => {
            try {
                adt.dispose();
            } catch (e) {
            }
            try {
                plane.dispose();
            } catch (e) {
            }
        }, durationMs);
    }

    /** Disposes the fullscreen UI texture and all 3D UI panels. */
    public dispose(): void {
        if (this.ui) {
            this.ui.dispose();
            this.ui = null;
        }
        for (const entry of this.ui3DTextures.values()) {
            entry.texture.dispose();
            entry.mesh.dispose();
        }
        this.ui3DTextures.clear();
    }

    // ── Cleanup ─────────────────────────────────────────────────────

    private isSlices(obj: any): obj is Slices {
        return obj != null
            && typeof obj.left === 'number'
            && typeof obj.top === 'number'
            && typeof obj.right === 'number'
            && typeof obj.bottom === 'number';
    }
}
