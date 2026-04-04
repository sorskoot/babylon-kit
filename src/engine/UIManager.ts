import { Scene, Vector3, Mesh, MeshBuilder } from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, TextBlock, Control } from "@babylonjs/gui";

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

export class UIManager {
    private ui: AdvancedDynamicTexture | null = null;
    private ui3DTextures: Map<string, { texture: AdvancedDynamicTexture; mesh: Mesh }> = new Map();

    // ── Fullscreen (2D overlay) UI ──────────────────────────────────

    public createFullscreenUI(name: string, scene: Scene): AdvancedDynamicTexture {
        this.ui = AdvancedDynamicTexture.CreateFullscreenUI(name, true, scene);
        return this.ui;
    }

    public getUI(): AdvancedDynamicTexture | null {
        return this.ui;
    }

    public addText(
        text: string,
        options?: { fontSize?: number; color?: string; top?: string; left?: string }
    ): TextBlock {
        if (!this.ui) throw new Error("UI not initialized. Call createFullscreenUI first.");

        const textBlock = new TextBlock();
        textBlock.text = text;
        textBlock.fontSize = options?.fontSize ?? 24;
        textBlock.color = options?.color ?? "white";
        textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        textBlock.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        if (options?.top) textBlock.top = options.top;
        if (options?.left) textBlock.left = options.left;
        this.ui.addControl(textBlock);
        return textBlock;
    }

    public addButton(
        name: string,
        label: string,
        onClick: () => void,
        options?: { width?: string; height?: string; top?: string; color?: string; background?: string }
    ): Button {
        if (!this.ui) throw new Error("UI not initialized. Call createFullscreenUI first.");

        const button = Button.CreateSimpleButton(name, label);
        button.width = options?.width ?? "150px";
        button.height = options?.height ?? "40px";
        button.color = options?.color ?? "white";
        button.background = options?.background ?? "green";
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
        options?: UI3DOptions
    ): Promise<AdvancedDynamicTexture> {
        const planeWidth = options?.planeWidth ?? 2;
        const planeHeight = options?.planeHeight ?? 1;
        const resW = options?.resolutionWidth ?? 1024;
        const resH = options?.resolutionHeight ?? 512;
        const position = options?.position ?? Vector3.Zero();

        // Create a plane mesh to host the UI
        const plane = MeshBuilder.CreatePlane(`${key}_plane`, {
            width: planeWidth,
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
            resH
        );

        // Load the GUI layout from the JSON file
        await texture.parseFromURLAsync(url);

        this.ui3DTextures.set(key, { texture, mesh: plane });
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

    // ── Cleanup ─────────────────────────────────────────────────────

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
}
