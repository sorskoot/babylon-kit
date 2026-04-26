import {
    Scene,
    KeyboardEventTypes,
    PointerEventTypes,
    GamepadManager,
    Observable,
} from "@babylonjs/core";
import type { WebXRDefaultExperience, WebXRAbstractMotionController } from "@babylonjs/core";

/** The device that triggered an input action. */
export type InputSource = "keyboard" | "mouse" | "gamepad" | "xr";

/**
 * Standard keyboard key codes (values match {@link KeyboardEvent.code}).
 * Not exhaustive — pass any valid `KeyboardEvent.code` string for unlisted keys.
 */
export enum Key {
    Space       = "Space",
    Enter       = "Enter",
    Escape      = "Escape",
    Tab         = "Tab",
    Backspace   = "Backspace",
    ArrowUp     = "ArrowUp",
    ArrowDown   = "ArrowDown",
    ArrowLeft   = "ArrowLeft",
    ArrowRight  = "ArrowRight",
    W           = "KeyW",
    A           = "KeyA",
    S           = "KeyS",
    D           = "KeyD",
    Q           = "KeyQ",
    E           = "KeyE",
    R           = "KeyR",
    F           = "KeyF",
    G           = "KeyG",
    H           = "KeyH",
    ShiftLeft   = "ShiftLeft",
    ShiftRight  = "ShiftRight",
    ControlLeft = "ControlLeft",
    ControlRight= "ControlRight",
    AltLeft     = "AltLeft",
    AltRight    = "AltRight",
}

/**
 * Standard gamepad button indices (Xbox / browser Gamepad API layout).
 * These match the indices reported by {@link Gamepad.buttons}.
 */
export enum GamepadButton {
    A           = 0,  // Cross on DualShock
    B           = 1,  // Circle on DualShock
    X           = 2,  // Square on DualShock
    Y           = 3,  // Triangle on DualShock
    LeftBumper  = 4,
    RightBumper = 5,
    LeftTrigger = 6,
    RightTrigger= 7,
    Select      = 8,
    Start       = 9,
    LeftStick   = 10,
    RightStick  = 11,
    DPadUp      = 12,
    DPadDown    = 13,
    DPadLeft    = 14,
    DPadRight   = 15,
}

/** Mouse button indices matching {@link MouseEvent.button}. */
export enum MouseButton {
    Left   = 0,
    Middle = 1,
    Right  = 2,
}

/**
 * Describes which physical inputs activate a named action.
 * Any combination of sources can be listed; whichever fires first wins.
 */
export interface ActionBinding {
    /** Keyboard key codes (see {@link Key} or any `KeyboardEvent.code` value). */
    keys?: string[];
    /** Mouse buttons that trigger this action. */
    mouseButtons?: MouseButton[];
    /** Gamepad button indices that trigger this action. */
    gamepadButtons?: GamepadButton[];
    /** True → XR controller trigger press fires this action. */
    xrTrigger?: boolean;
    /** True → XR controller squeeze fires this action. */
    xrSqueeze?: boolean;
}

/** Payload sent to {@link InputManager.onActionFired} subscribers. */
export interface ActionEvent {
    /** The name of the action that was triggered. */
    action: string;
    /** The device that caused the trigger. */
    source: InputSource;
}

/**
 * Centralises keyboard, mouse, gamepad, and XR controller input into named
 * actions.
 *
 * ### Typical usage
 * ```ts
 * const input = scene.getInputManager();
 *
 * input
 *   .bindAction("interact", {
 *       keys: [Key.F, Key.Enter],
 *       gamepadButtons: [GamepadButton.A],
 *       xrTrigger: true,
 *   })
 *   .onAction("interact", (source) => {
 *       console.log("Interact triggered by", source);
 *   });
 * ```
 *
 * Per-frame polling is also available:
 * ```ts
 * if (input.isActionHeld("sprint")) { … }
 * ```
 *
 * Call {@link update} once per frame to advance one-frame pressed/released
 * buffers (done automatically by {@link GameScene}).
 */
export class InputManager {
    private readonly scene: Scene;

    // ── Action registry ──────────────────────────────────────────────────────
    private readonly actions   = new Map<string, ActionBinding>();
    private readonly callbacks = new Map<string, Set<(source: InputSource) => void>>();

    // ── Keyboard state ───────────────────────────────────────────────────────
    private readonly _heldKeys     = new Set<string>();
    private readonly _pressedKeys  = new Set<string>(); // one-frame
    private readonly _releasedKeys = new Set<string>(); // one-frame

    // ── Mouse state ──────────────────────────────────────────────────────────
    private readonly _heldMouse     = new Set<number>();
    private readonly _pressedMouse  = new Set<number>();
    private readonly _releasedMouse = new Set<number>();

    // ── Gamepad state ────────────────────────────────────────────────────────
    private readonly _heldGamepad     = new Set<number>();
    private readonly _pressedGamepad  = new Set<number>();
    private readonly _releasedGamepad = new Set<number>();
    private readonly _gamepadManager: GamepadManager;

    // ── XR state ─────────────────────────────────────────────────────────────
    private _xrTriggerHeld  = false;
    private _xrSqueezeHeld  = false;

    /** Fires whenever any named action is triggered. */
    public readonly onActionFired: Observable<ActionEvent> = new Observable<ActionEvent>();

    /** @param scene The BabylonJS scene to attach input observers to. */
    constructor(scene: Scene) {
        this.scene = scene;
        this._gamepadManager = new GamepadManager();
        this._setupKeyboard();
        this._setupMouse();
        this._setupGamepad();
    }

    // ── Setup ────────────────────────────────────────────────────────────────

    private _setupKeyboard(): void {
        this.scene.onKeyboardObservable.add((info) => {
            const code = info.event.code;
            if (info.type === KeyboardEventTypes.KEYDOWN) {
                if (!this._heldKeys.has(code)) {
                    this._heldKeys.add(code);
                    this._pressedKeys.add(code);
                    this._fireForSource("keyboard", (b) => !!b.keys?.includes(code));
                }
            } else if (info.type === KeyboardEventTypes.KEYUP) {
                this._heldKeys.delete(code);
                this._releasedKeys.add(code);
            }
        });
    }

    private _setupMouse(): void {
        this.scene.onPointerObservable.add((info) => {
            if (info.type === PointerEventTypes.POINTERDOWN) {
                const btn = info.event.button;
                if (!this._heldMouse.has(btn)) {
                    this._heldMouse.add(btn);
                    this._pressedMouse.add(btn);
                    this._fireForSource("mouse", (b) => !!b.mouseButtons?.includes(btn as MouseButton));
                }
            } else if (info.type === PointerEventTypes.POINTERUP) {
                const btn = info.event.button;
                this._heldMouse.delete(btn);
                this._releasedMouse.add(btn);
            }
        });
    }

    private _setupGamepad(): void {
        this._gamepadManager.onGamepadConnectedObservable.add((gamepad) => {
            // BabylonJS generic/Xbox/DualShock pads all expose these observables
            const gp = gamepad as any;

            if (gp.onButtonDownObservable) {
                gp.onButtonDownObservable.add((idx: number) => {
                    if (!this._heldGamepad.has(idx)) {
                        this._heldGamepad.add(idx);
                        this._pressedGamepad.add(idx);
                        this._fireForSource("gamepad", (b) => !!b.gamepadButtons?.includes(idx as GamepadButton));
                    }
                });
            }

            if (gp.onButtonUpObservable) {
                gp.onButtonUpObservable.add((idx: number) => {
                    this._heldGamepad.delete(idx);
                    this._releasedGamepad.add(idx);
                });
            }
        });
    }

    // ── XR integration ───────────────────────────────────────────────────────

    /**
     * Connect an initialised WebXR experience so trigger and squeeze presses
     * from motion controllers fire XR-sourced actions.
     *
     * Call this after {@link XRManager.initialize} returns:
     * ```ts
     * const xr = await this.initializeXR(…);
     * this.getInputManager().connectXR(xr);
     * ```
     */
    public connectXR(xr: WebXRDefaultExperience): this {
        xr.input.onControllerAddedObservable.add((controller) => {
            const setup = (mc: WebXRAbstractMotionController) => {
                // Trigger ────────────────────────────────────────────────────
                const trigger =
                    mc.getComponent("xr-standard-trigger") ??
                    mc.getComponentOfType("trigger");

                trigger?.onButtonStateChangedObservable.add((c) => {
                    if (c.pressed && !this._xrTriggerHeld) {
                        this._xrTriggerHeld = true;
                        this._fireForSource("xr", (b) => !!b.xrTrigger);
                    } else if (!c.pressed) {
                        this._xrTriggerHeld = false;
                    }
                });

                // Squeeze ────────────────────────────────────────────────────
                const squeeze =
                    mc.getComponent("xr-standard-squeeze") ??
                    mc.getComponentOfType("squeeze");

                squeeze?.onButtonStateChangedObservable.add((c) => {
                    if (c.pressed && !this._xrSqueezeHeld) {
                        this._xrSqueezeHeld = true;
                        this._fireForSource("xr", (b) => !!b.xrSqueeze);
                    } else if (!c.pressed) {
                        this._xrSqueezeHeld = false;
                    }
                });
            };

            if (controller.motionController) {
                setup(controller.motionController);
            } else {
                controller.onMotionControllerInitObservable.addOnce(setup);
            }
        });

        return this;
    }

    // ── Action binding API ───────────────────────────────────────────────────

    /**
     * Declare (or replace) a named action and its input bindings.
     * Returns `this` for chaining.
     */
    public bindAction(name: string, binding: ActionBinding): this {
        this.actions.set(name, binding);
        return this;
    }

    /**
     * Register a callback fired every time the named action is triggered.
     * Returns `this` for chaining.
     */
    public onAction(name: string, callback: (source: InputSource) => void): this {
        if (!this.callbacks.has(name)) this.callbacks.set(name, new Set());
        this.callbacks.get(name)!.add(callback);
        return this;
    }

    /** Remove a previously registered action callback. */
    public offAction(name: string, callback: (source: InputSource) => void): void {
        this.callbacks.get(name)?.delete(callback);
    }

    // ── Per-frame action queries ──────────────────────────────────────────────

    /** `true` on the first frame the action's binding was activated. */
    public isActionPressed(name: string): boolean {
        const b = this.actions.get(name);
        if (!b) return false;
        return (
            (b.keys?.some(k => this._pressedKeys.has(k)) ?? false) ||
            (b.mouseButtons?.some(m => this._pressedMouse.has(m)) ?? false) ||
            (b.gamepadButtons?.some(g => this._pressedGamepad.has(g)) ?? false)
        );
    }

    /** `true` while any of the action's bindings are held down. */
    public isActionHeld(name: string): boolean {
        const b = this.actions.get(name);
        if (!b) return false;
        return (
            (b.keys?.some(k => this._heldKeys.has(k)) ?? false) ||
            (b.mouseButtons?.some(m => this._heldMouse.has(m)) ?? false) ||
            (b.gamepadButtons?.some(g => this._heldGamepad.has(g)) ?? false)
        );
    }

    /** `true` on the first frame the action's binding was released. */
    public isActionReleased(name: string): boolean {
        const b = this.actions.get(name);
        if (!b) return false;
        return (
            (b.keys?.some(k => this._releasedKeys.has(k)) ?? false) ||
            (b.mouseButtons?.some(m => this._releasedMouse.has(m)) ?? false) ||
            (b.gamepadButtons?.some(g => this._releasedGamepad.has(g)) ?? false)
        );
    }

    // ── Raw state queries ─────────────────────────────────────────────────────

    /** `true` while `key` is held down. */
    public isKeyHeld(key: string): boolean      { return this._heldKeys.has(key); }
    /** `true` on the first frame `key` was pressed. */
    public isKeyPressed(key: string): boolean   { return this._pressedKeys.has(key); }
    /** `true` on the first frame `key` was released. */
    public isKeyReleased(key: string): boolean  { return this._releasedKeys.has(key); }

    /** `true` while `button` is held down. */
    public isMouseButtonHeld(button: MouseButton): boolean     { return this._heldMouse.has(button); }
    /** `true` on the first frame `button` was pressed. */
    public isMouseButtonPressed(button: MouseButton): boolean  { return this._pressedMouse.has(button); }
    /** `true` on the first frame `button` was released. */
    public isMouseButtonReleased(button: MouseButton): boolean { return this._releasedMouse.has(button); }

    /** `true` while gamepad `button` is held down. */
    public isGamepadButtonHeld(button: GamepadButton): boolean     { return this._heldGamepad.has(button); }
    /** `true` on the first frame gamepad `button` was pressed. */
    public isGamepadButtonPressed(button: GamepadButton): boolean  { return this._pressedGamepad.has(button); }
    /** `true` on the first frame gamepad `button` was released. */
    public isGamepadButtonReleased(button: GamepadButton): boolean { return this._releasedGamepad.has(button); }

    /** `true` if at least one gamepad is connected. */
    public hasGamepad(): boolean { return this._gamepadManager.gamepads.length > 0; }

    // ── Frame lifecycle ───────────────────────────────────────────────────────

    /**
     * Flush one-frame pressed/released buffers.
     * Called automatically by {@link GameScene} at the start of each frame.
     */
    public update(): void {
        this._pressedKeys.clear();
        this._releasedKeys.clear();
        this._pressedMouse.clear();
        this._releasedMouse.clear();
        this._pressedGamepad.clear();
        this._releasedGamepad.clear();
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    private _fireForSource(
        source: InputSource,
        predicate: (binding: ActionBinding) => boolean
    ): void {
        for (const [name, binding] of this.actions) {
            if (predicate(binding)) {
                this._dispatch(name, source);
            }
        }
    }

    private _dispatch(action: string, source: InputSource): void {
        this.onActionFired.notifyObservers({ action, source });
        const cbs = this.callbacks.get(action);
        if (cbs) {
            for (const cb of cbs) cb(source);
        }
    }

    /** Disposes all observers and the internal {@link GamepadManager}. */
    public dispose(): void {
        this._gamepadManager.dispose();
        this.onActionFired.clear();
        this.callbacks.clear();
        this.actions.clear();
    }
}

