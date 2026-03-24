import type { Material } from '@babylonjs/core/Materials/material';
import { Component } from '../core/component';
import type { LoadState } from './meshComponent';

/**
 * Describes how a material should be created or loaded.
 *
 * - `'url'`      — load a node-material JSON via `NodeMaterial.ParseFromFileAsync`.
 * - `'standard'` — create a `StandardMaterial` from the supplied properties.
 * - `'pbr'`      — create a `PBRMaterial` from the supplied properties.
 */
export type MaterialMode = 'url' | 'standard' | 'pbr';

/**
 * Attach to an entity (alongside a {@link MeshComponent}) to control what
 * material is applied to its meshes.
 *
 * The {@link MaterialLoaderSystem} processes entities that have both a
 * `MaterialComponent` in `'pending'` state and a loaded `MeshComponent`.
 *
 * @example
 * ```ts
 * // Apply a red standard material
 * entity.addComponent(new MaterialComponent({
 *     mode: 'standard',
 *     diffuseColor: { r: 1, g: 0, b: 0 },
 * }));
 *
 * // Load a node-material from URL
 * entity.addComponent(new MaterialComponent({
 *     mode: 'url',
 *     url: 'assets/materials/brick.json',
 * }));
 * ```
 */
export class MaterialComponent extends Component {
    /** How the material should be resolved. */
    mode: MaterialMode;

    /** URL to load the material from (when mode is `'url'`). */
    url?: string;

    /** Diffuse / albedo colour. */
    diffuseColor?: { r: number; g: number; b: number };

    /** Diffuse / albedo texture URL. */
    diffuseTextureUrl?: string;

    /** Emissive colour. */
    emissiveColor?: { r: number; g: number; b: number };

    /** Metallic value (PBR only, 0–1). */
    metallic?: number;

    /** Roughness value (PBR only, 0–1). */
    roughness?: number;

    /** Current loading state. */
    state: LoadState = 'pending';

    /** The resolved Babylon.js material. Set by {@link MaterialLoaderSystem}. */
    material?: Material;

    /** If loading / creation failed, the error is stored here. */
    error?: unknown;

    constructor(
        options: {
            mode?: MaterialMode;
            url?: string;
            diffuseColor?: { r: number; g: number; b: number };
            diffuseTextureUrl?: string;
            emissiveColor?: { r: number; g: number; b: number };
            metallic?: number;
            roughness?: number;
        } = {},
    ) {
        super();
        this.mode = options.mode ?? (options.url ? 'url' : 'standard');
        this.url = options.url;
        this.diffuseColor = options.diffuseColor;
        this.diffuseTextureUrl = options.diffuseTextureUrl;
        this.emissiveColor = options.emissiveColor;
        this.metallic = options.metallic;
        this.roughness = options.roughness;
    }

    /** Dispose of the material when the component is removed. */
    onRemove(): void {
        this.material?.dispose(true, true);
        this.material = undefined;
    }
}

