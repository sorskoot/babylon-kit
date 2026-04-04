import {
    Animation,
    AnimationGroup,
    Color3,
    Effect,
    Mesh,
    Node,
    PostProcess,
    Scene,
    ShaderMaterial,
    Vector3,
} from "@babylonjs/core";
import type { IAnimatable } from "@babylonjs/core";

// ── Types & Interfaces ─────────────────────────────────────────────

export interface TweenOptions {
    /** Duration in milliseconds. */
    duration: number;
    /** BabylonJS easing function instance (e.g. new CubicEase()). */
    easingFunction?: import("@babylonjs/core").EasingFunction;
    /** Frames per second used for the animation. Default 60. */
    fps?: number;
    /** Whether the tween should loop. Default false. */
    loop?: boolean;
    /** Called when the tween completes (not called if looping). */
    onComplete?: () => void;
}

export interface ShaderTransitionOptions {
    /** Duration in milliseconds. */
    duration: number;
    /** Frames per second for the progress animation. Default 60. */
    fps?: number;
    /** BabylonJS easing function for the progress curve. */
    easingFunction?: import("@babylonjs/core").EasingFunction;
    /** Called when the transition completes. */
    onComplete?: () => void;
}

export interface ManagedAnimation {
    key: string;
    type: "glb" | "tween" | "shader";
    animationGroup?: AnimationGroup;
    animatable?: import("@babylonjs/core").Animatable;
    postProcess?: PostProcess;
    shaderMaterial?: ShaderMaterial;
    dispose: () => void;
}

// ── AnimationManager ───────────────────────────────────────────────

/**
 * Centralised manager for three categories of animation:
 *
 * 1. **GLB animations** – play / blend AnimationGroups that ship inside .glb files.
 * 2. **Coded tweens** – property tweens built with the BabylonJS Animation API
 *    (position, rotation, scaling, color, custom floats …).
 * 3. **Shader transitions** – full-screen or per-mesh shader effects driven by
 *    an animated `progress` uniform (0 → 1), useful for fade-outs, dissolves, etc.
 *
 * Every animation is registered under a unique key and can be retrieved,
 * stopped, or disposed individually.
 */
export class AnimationManager {
    private managed: Map<string, ManagedAnimation> = new Map();

    // ── 1. GLB / AnimationGroup helpers ────────────────────────────

    /**
     * Register all AnimationGroups that were loaded with a .glb file.
     * Each group is stored under `"${prefix}_${group.name}"`.
     *
     * @param prefix  Key prefix (e.g. the model key used in AssetManager).
     * @param groups  The AnimationGroup array returned by SceneLoader.
     */
    public registerGLBAnimations(prefix: string, groups: AnimationGroup[]): void {
        for (const group of groups) {
            const key = `${prefix}_${group.name}`;
            this.managed.set(key, {
                key,
                type: "glb",
                animationGroup: group,
                dispose: () => {
                    group.stop();
                    group.dispose();
                },
            });
        }
    }

    /**
     * Play a previously registered AnimationGroup by key.
     *
     * @param key       The animation key (e.g. "hero_Run").
     * @param loop      Whether to loop. Default true.
     * @param speed     Playback speed multiplier. Default 1.
     * @param from      Start frame (undefined = group default).
     * @param to        End frame (undefined = group default).
     * @param blendIn   Weight blend-in time in seconds. Default 0 (instant).
     * @returns The AnimationGroup, or undefined if not found.
     */
    public playGLB(
        key: string,
        loop: boolean = true,
        speed: number = 1,
        from?: number,
        to?: number,
        blendIn: number = 0,
    ): AnimationGroup | undefined {
        const entry = this.managed.get(key);
        if (!entry || entry.type !== "glb" || !entry.animationGroup) return undefined;

        const group = entry.animationGroup;
        group.speedRatio = speed;

        if (blendIn > 0) {
            group.play(loop);
            group.setWeightForAllAnimatables(0);
            // Animate weight from 0 → 1 over blendIn seconds
            const fps = 60;
            const totalFrames = Math.round(blendIn * fps);
            const weightAnim = new Animation(
                `${key}_blendIn`,
                "weight",
                fps,
                Animation.ANIMATIONTYPE_FLOAT,
                Animation.ANIMATIONLOOPMODE_CONSTANT,
            );
            weightAnim.setKeys([
                { frame: 0, value: 0 },
                { frame: totalFrames, value: 1 },
            ]);
            // AnimationGroup doesn't directly support weight animation via scene.beginAnimation,
            // so we manually step the weight each frame.
            let elapsed = 0;
            const observer = group.getScene()?.onBeforeRenderObservable.add(() => {
                elapsed += (group.getScene()?.getEngine().getDeltaTime() ?? 16) / 1000;
                const t = Math.min(elapsed / blendIn, 1);
                group.setWeightForAllAnimatables(t);
                if (t >= 1) {
                    group.getScene()?.onBeforeRenderObservable.remove(observer!);
                }
            });
        } else {
            group.start(loop, speed, from, to);
        }

        return group;
    }

    /**
     * Stop a GLB animation group by key.
     */
    public stopGLB(key: string): void {
        const entry = this.managed.get(key);
        if (entry?.animationGroup) {
            entry.animationGroup.stop();
        }
    }

    /**
     * Cross-fade from one GLB animation to another over `duration` seconds.
     * Both animations must already be registered.
     */
    public crossFadeGLB(fromKey: string, toKey: string, duration: number): void {
        const fromEntry = this.managed.get(fromKey);
        const toEntry = this.managed.get(toKey);
        if (!fromEntry?.animationGroup || !toEntry?.animationGroup) return;

        const fromGroup = fromEntry.animationGroup;
        const toGroup = toEntry.animationGroup;
        const scene = fromGroup.getScene() ?? toGroup.getScene();
        if (!scene) return;

        toGroup.play(true);
        toGroup.setWeightForAllAnimatables(0);

        let elapsed = 0;
        const observer = scene.onBeforeRenderObservable.add(() => {
            elapsed += (scene.getEngine().getDeltaTime()) / 1000;
            const t = Math.min(elapsed / duration, 1);
            fromGroup.setWeightForAllAnimatables(1 - t);
            toGroup.setWeightForAllAnimatables(t);
            if (t >= 1) {
                fromGroup.stop();
                scene.onBeforeRenderObservable.remove(observer!);
            }
        });
    }

    // ── 2. Coded tweens (BabylonJS Animation API) ──────────────────

    /**
     * Tween a numeric, Vector3, or Color3 property on any target using
     * the built-in BabylonJS Animation system (fully synced with the
     * engine render loop).
     *
     * @param key       Unique key for this tween.
     * @param target    The object to animate (mesh, material, light …).
     * @param property  Dot-path property name (e.g. "position", "material.alpha").
     * @param from      Start value.
     * @param to        End value.
     * @param scene     The scene that drives the animation clock.
     * @param options   Duration, easing, loop, onComplete.
     */
    public tween(
        key: string,
        target: IAnimatable | Node,
        property: string,
        from: number | Vector3 | Color3,
        to: number | Vector3 | Color3,
        scene: Scene,
        options: TweenOptions,
    ): void {
        const fps = options.fps ?? 60;
        const totalFrames = Math.round((options.duration / 1000) * fps);

        let animType: number;
        if (typeof from === "number") {
            animType = Animation.ANIMATIONTYPE_FLOAT;
        } else if (from instanceof Vector3) {
            animType = Animation.ANIMATIONTYPE_VECTOR3;
        } else {
            animType = Animation.ANIMATIONTYPE_COLOR3;
        }

        const loopMode = options.loop
            ? Animation.ANIMATIONLOOPMODE_CYCLE
            : Animation.ANIMATIONLOOPMODE_CONSTANT;

        const anim = new Animation(
            `tween_${key}`,
            property,
            fps,
            animType,
            loopMode,
        );

        anim.setKeys([
            { frame: 0, value: from },
            { frame: totalFrames, value: to },
        ]);

        if (options.easingFunction) {
            anim.setEasingFunction(options.easingFunction);
        }

        const animatable = scene.beginDirectAnimation(
            target,
            [anim],
            0,
            totalFrames,
            options.loop ?? false,
            1,
            options.onComplete,
        );

        this.managed.set(key, {
            key,
            type: "tween",
            animatable,
            dispose: () => {
                animatable.stop();
            },
        });
    }

    /**
     * Stop a running tween by key.
     */
    public stopTween(key: string): void {
        const entry = this.managed.get(key);
        if (entry?.animatable) {
            entry.animatable.stop();
        }
    }

    // ── 3. Shader transitions ──────────────────────────────────────

    /**
     * Run a full-screen post-process shader transition driven by a
     * `progress` uniform that animates from 0 to 1.
     *
     * The fragment shader receives:
     *  - `varying vec2 vUV`
     *  - `uniform sampler2D textureSampler` (current frame)
     *  - `uniform float progress` (0 → 1)
     *
     * @param key             Unique key.
     * @param fragmentSource  GLSL fragment shader source string.
     * @param scene           The scene to attach the post-process to.
     * @param options         Duration, easing, onComplete.
     */
    public shaderTransition(
        key: string,
        fragmentSource: string,
        scene: Scene,
        options: ShaderTransitionOptions,
    ): void {
        const effectName = `shaderTransition_${key}`;

        // Register the shader inline
        Effect.ShadersStore[`${effectName}FragmentShader`] = fragmentSource;

        const postProcess = new PostProcess(
            effectName,
            effectName,
            ["progress"],   // uniforms
            null,           // samplers
            1.0,            // ratio
            scene.activeCamera,
        );

        let progress = 0;
        postProcess.onApply = (effect) => {
            effect.setFloat("progress", progress);
        };

        // Animate progress 0 → 1 using BabylonJS Animation
        const fps = options.fps ?? 60;
        const totalFrames = Math.round((options.duration / 1000) * fps);

        const progressAnim = new Animation(
            `${effectName}_progress`,
            "progress",
            fps,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
        );
        progressAnim.setKeys([
            { frame: 0, value: 0 },
            { frame: totalFrames, value: 1 },
        ]);

        if (options.easingFunction) {
            progressAnim.setEasingFunction(options.easingFunction);
        }

        // We need an animatable target that holds the `progress` property.
        const progressHolder = { progress: 0 };

        const animatable = scene.beginDirectAnimation(
            progressHolder as any,
            [progressAnim],
            0,
            totalFrames,
            false,
            1,
            () => {
                // Transition complete — remove post-process
                postProcess.dispose();
                this.managed.delete(key);
                options.onComplete?.();
            },
        );

        // Sync the uniform each frame
        const observer = scene.onBeforeRenderObservable.add(() => {
            progress = progressHolder.progress;
            if (!this.managed.has(key)) {
                scene.onBeforeRenderObservable.remove(observer!);
            }
        });

        this.managed.set(key, {
            key,
            type: "shader",
            animatable,
            postProcess,
            dispose: () => {
                animatable.stop();
                postProcess.dispose();
                scene.onBeforeRenderObservable.remove(observer!);
            },
        });
    }

    /**
     * Run a shader transition on a specific mesh using a ShaderMaterial.
     * The material receives a `progress` uniform animated from 0 → 1.
     *
     * @param key             Unique key.
     * @param mesh            Target mesh.
     * @param vertexSource    GLSL vertex shader source.
     * @param fragmentSource  GLSL fragment shader source.
     * @param scene           The scene.
     * @param options         Duration, easing, onComplete.
     * @param uniforms        Additional uniform names the shader uses.
     */
    public shaderMeshTransition(
        key: string,
        mesh: Mesh,
        vertexSource: string,
        fragmentSource: string,
        scene: Scene,
        options: ShaderTransitionOptions,
        uniforms: string[] = [],
    ): ShaderMaterial {
        const shaderName = `meshTransition_${key}`;

        Effect.ShadersStore[`${shaderName}VertexShader`] = vertexSource;
        Effect.ShadersStore[`${shaderName}FragmentShader`] = fragmentSource;

        const shaderMaterial = new ShaderMaterial(shaderName, scene, shaderName, {
            attributes: ["position", "normal", "uv"],
            uniforms: ["world", "worldViewProjection", "progress", ...uniforms],
        });

        const previousMaterial = mesh.material;
        mesh.material = shaderMaterial;
        shaderMaterial.setFloat("progress", 0);

        const fps = options.fps ?? 60;
        const totalFrames = Math.round((options.duration / 1000) * fps);

        const progressAnim = new Animation(
            `${shaderName}_progress`,
            "progress",
            fps,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
        );
        progressAnim.setKeys([
            { frame: 0, value: 0 },
            { frame: totalFrames, value: 1 },
        ]);

        if (options.easingFunction) {
            progressAnim.setEasingFunction(options.easingFunction);
        }

        const progressHolder = { progress: 0 };

        const animatable = scene.beginDirectAnimation(
            progressHolder as any,
            [progressAnim],
            0,
            totalFrames,
            false,
            1,
            () => {
                // Restore original material
                mesh.material = previousMaterial;
                shaderMaterial.dispose();
                this.managed.delete(key);
                options.onComplete?.();
            },
        );

        const observer = scene.onBeforeRenderObservable.add(() => {
            if (this.managed.has(key)) {
                shaderMaterial.setFloat("progress", progressHolder.progress);
            } else {
                scene.onBeforeRenderObservable.remove(observer!);
            }
        });

        this.managed.set(key, {
            key,
            type: "shader",
            animatable,
            shaderMaterial,
            dispose: () => {
                animatable.stop();
                mesh.material = previousMaterial;
                shaderMaterial.dispose();
                scene.onBeforeRenderObservable.remove(observer!);
            },
        });

        return shaderMaterial;
    }

    // ── Retrieval & lifecycle ──────────────────────────────────────

    /** Get a managed animation entry by key. */
    public get(key: string): ManagedAnimation | undefined {
        return this.managed.get(key);
    }

    /** Check whether an animation key is registered. */
    public has(key: string): boolean {
        return this.managed.has(key);
    }

    /** Stop and dispose a single managed animation by key. */
    public stop(key: string): void {
        const entry = this.managed.get(key);
        if (entry) {
            entry.dispose();
            this.managed.delete(key);
        }
    }

    /** Dispose all managed animations. */
    public dispose(): void {
        for (const entry of this.managed.values()) {
            entry.dispose();
        }
        this.managed.clear();
    }
}
