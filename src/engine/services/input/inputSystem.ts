import type { IInputAction, InputBinding } from '../../core/types';

/**
 * Possible states of an input action within a single frame.
 *
 * | State       | Meaning                                |
 * |-------------|----------------------------------------|
 * | `pressed`   | First frame the action is active.      |
 * | `held`      | Action is active for 2+ consecutive frames. |
 * | `released`  | First frame the action is no longer active. |
 * | `idle`      | Action is inactive.                    |
 */
export type InputState = 'pressed' | 'held' | 'released' | 'idle';

interface ActionState {
    current: boolean;
    previous: boolean;
    value: number;
}

/**
 * Unified keyboard, mouse, and gamepad input manager with an action-mapping layer.
 *
 * Register named {@link IInputAction | actions} with one or more
 * {@link InputBinding | bindings}, then query action state each frame via
 * {@link isActionPressed}, {@link isActionHeld}, {@link isActionReleased}, or
 * {@link getActionValue}.
 *
 * Call {@link attach} once at startup to wire DOM events, and {@link update} at
 * the start of each frame (before systems run) to advance the per-frame state.
 *
 * @example
 * ```ts
 * const input = new InputSystem();
 * input.attach(canvas);
 * input.registerAction({
 *     name: "jump",
 *     bindings: [{ type: "keyboard", code: "Space" }],
 * });
 * // in update loop:
 * if (input.isActionPressed("jump")) { ... }
 * ```
 */
export class InputSystem {
    private readonly _actions = new Map<string, IInputAction>();
    private readonly _actionStates = new Map<string, ActionState>();

    private readonly _keysDown = new Set<string>();
    private readonly _keysJustDown = new Set<string>();
    private readonly _keysJustUp = new Set<string>();

    private readonly _mouseButtons = new Set<number>();
    private readonly _mouseJustDown = new Set<number>();
    private readonly _mouseJustUp = new Set<number>();
    private _mouseX = 0;
    private _mouseY = 0;
    private _mouseDeltaX = 0;
    private _mouseDeltaY = 0;

    private readonly _gamepadButtons = new Map<number, Set<number>>();
    private readonly _gamepadAxes = new Map<number, number[]>();

    private readonly _handlers: Array<[EventTarget, string, EventListener]> =
        [];

    /** Current horizontal mouse position (clientX). */
    get mouseX(): number {
        return this._mouseX;
    }
    /** Current vertical mouse position (clientY). */
    get mouseY(): number {
        return this._mouseY;
    }
    /** Accumulated horizontal mouse movement since the last {@link update}. */
    get mouseDeltaX(): number {
        return this._mouseDeltaX;
    }
    /** Accumulated vertical mouse movement since the last {@link update}. */
    get mouseDeltaY(): number {
        return this._mouseDeltaY;
    }

    /**
     * Begin listening for keyboard, mouse, and gamepad events on the given element.
     * @param element - Target element. Defaults to `window`.
     */
    attach(element: HTMLElement | Window = window): void {
        this._listen(element, 'keydown', this._onKeyDown.bind(this));
        this._listen(element, 'keyup', this._onKeyUp.bind(this));
        this._listen(element, 'mousedown', this._onMouseDown.bind(this));
        this._listen(element, 'mouseup', this._onMouseUp.bind(this));
        this._listen(element, 'mousemove', this._onMouseMove.bind(this));
        this._listen(
            window,
            'gamepadconnected',
            this._onGamepadConnected.bind(this),
        );
        this._listen(
            window,
            'gamepaddisconnected',
            this._onGamepadDisconnected.bind(this),
        );
    }

    /** Remove all event listeners and release the target element reference. */
    detach(): void {
        for (const [target, event, handler] of this._handlers) {
            target.removeEventListener(event, handler);
        }
        this._handlers.length = 0;
    }

    /**
     * Register a named action with its bindings.
     * @param action - The action descriptor.
     */
    registerAction(action: IInputAction): void {
        this._actions.set(action.name, action);
        this._actionStates.set(action.name, {
            current: false,
            previous: false,
            value: 0,
        });
    }

    /**
     * Remove a previously registered action.
     * @param name - The action name.
     */
    unregisterAction(name: string): void {
        this._actions.delete(name);
        this._actionStates.delete(name);
    }

    /**
     * `true` only on the first frame the action becomes active.
     * @param name - The action name.
     */
    isActionPressed(name: string): boolean {
        const state = this._actionStates.get(name);
        return state ? state.current && !state.previous : false;
    }

    /**
     * `true` while the action is active (any frame, including the first).
     * @param name - The action name.
     */
    isActionHeld(name: string): boolean {
        const state = this._actionStates.get(name);
        return state ? state.current : false;
    }

    /**
     * `true` only on the first frame the action becomes inactive.
     * @param name - The action name.
     */
    isActionReleased(name: string): boolean {
        const state = this._actionStates.get(name);
        return state ? !state.current && state.previous : false;
    }

    /**
     * Return the analogue value for the action (e.g. axis magnitude).
     * @param name - The action name.
     * @returns A scalar value, typically in the range `[-1, 1]`.
     */
    getActionValue(name: string): number {
        return this._actionStates.get(name)?.value ?? 0;
    }

    /**
     * Raw keyboard query — `true` while the key is held.
     * @param code - A {@link https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code | KeyboardEvent.code} value.
     */
    isKeyDown(code: string): boolean {
        return this._keysDown.has(code);
    }

    /**
     * Raw keyboard query — `true` only on the first frame a key is pressed.
     * @param code - A `KeyboardEvent.code` value.
     */
    isKeyJustDown(code: string): boolean {
        return this._keysJustDown.has(code);
    }

    /**
     * Raw keyboard query — `true` only on the first frame a key is released.
     * @param code - A `KeyboardEvent.code` value.
     */
    isKeyJustUp(code: string): boolean {
        return this._keysJustUp.has(code);
    }

    /**
     * `true` while the given mouse button is held.
     * @param button - The {@link https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button | MouseEvent.button} index.
     */
    isMouseButtonDown(button: number): boolean {
        return this._mouseButtons.has(button);
    }

    /**
     * Return the current value of a gamepad axis.
     * @param gamepadIndex - Gamepad index.
     * @param axisIndex - Axis index on the gamepad.
     * @returns A value in `[-1, 1]`, or `0` if unavailable.
     */
    getGamepadAxis(gamepadIndex: number, axisIndex: number): number {
        return this._gamepadAxes.get(gamepadIndex)?.[axisIndex] ?? 0;
    }

    /**
     * `true` while a gamepad button is pressed.
     * @param gamepadIndex - Gamepad index.
     * @param buttonIndex - Button index on the gamepad.
     */
    isGamepadButtonDown(gamepadIndex: number, buttonIndex: number): boolean {
        return (
            this._gamepadButtons.get(gamepadIndex)?.has(buttonIndex) ?? false
        );
    }

    /**
     * Advance per-frame input state.
     *
     * Must be called once at the **beginning** of each frame, before systems
     * query action state.
     */
    update(): void {
        this._pollGamepads();

        for (const [name, action] of this._actions) {
            const state = this._actionStates.get(name)!;
            state.previous = state.current;
            state.current = false;
            state.value = 0;

            for (const binding of action.bindings) {
                if (this._evaluateBinding(binding, state)) {
                    break;
                }
            }
        }

        this._keysJustDown.clear();
        this._keysJustUp.clear();
        this._mouseJustDown.clear();
        this._mouseJustUp.clear();
        this._mouseDeltaX = 0;
        this._mouseDeltaY = 0;
    }

    private _evaluateBinding(
        binding: InputBinding,
        state: ActionState,
    ): boolean {
        const scale = binding.scale ?? 1;

        switch (binding.type) {
            case 'keyboard':
                if (this._keysDown.has(binding.code)) {
                    state.current = true;
                    state.value = scale;
                    return true;
                }
                break;
            case 'mouse':
                if (binding.code === 'MouseMove') {
                    const axisValue =
                        binding.axis === 'x'
                            ? this._mouseDeltaX
                            : this._mouseDeltaY;
                    state.value = axisValue * scale;
                    state.current = axisValue !== 0;
                    return state.current;
                }
                if (this._mouseButtons.has(parseInt(binding.code))) {
                    state.current = true;
                    state.value = scale;
                    return true;
                }
                break;
            case 'gamepad': {
                const parts = binding.code.split(':');
                const gpIdx = parseInt(parts[0]);
                const btnOrAxis = parts[1];
                if (btnOrAxis.startsWith('axis')) {
                    const axisIdx = parseInt(btnOrAxis.replace('axis', ''));
                    const v = this.getGamepadAxis(gpIdx, axisIdx);
                    state.value = v * scale;
                    state.current = Math.abs(v) > 0.15;
                    return state.current;
                } else {
                    const btnIdx = parseInt(btnOrAxis);
                    if (this.isGamepadButtonDown(gpIdx, btnIdx)) {
                        state.current = true;
                        state.value = scale;
                        return true;
                    }
                }
                break;
            }
        }
        return false;
    }

    private _pollGamepads(): void {
        if (typeof navigator === 'undefined') return;
        const gamepads = navigator.getGamepads?.() ?? [];
        for (const gp of gamepads) {
            if (!gp) continue;
            const buttons = new Set<number>();
            for (let i = 0; i < gp.buttons.length; i++) {
                if (gp.buttons[i].pressed) buttons.add(i);
            }
            this._gamepadButtons.set(gp.index, buttons);
            this._gamepadAxes.set(gp.index, [...gp.axes]);
        }
    }

    private _onKeyDown(e: Event): void {
        const ke = e as KeyboardEvent;
        if (!this._keysDown.has(ke.code)) {
            this._keysJustDown.add(ke.code);
        }
        this._keysDown.add(ke.code);
    }

    private _onKeyUp(e: Event): void {
        const ke = e as KeyboardEvent;
        this._keysDown.delete(ke.code);
        this._keysJustUp.add(ke.code);
    }

    private _onMouseDown(e: Event): void {
        const me = e as MouseEvent;
        this._mouseButtons.add(me.button);
        this._mouseJustDown.add(me.button);
    }

    private _onMouseUp(e: Event): void {
        const me = e as MouseEvent;
        this._mouseButtons.delete(me.button);
        this._mouseJustUp.add(me.button);
    }

    private _onMouseMove(e: Event): void {
        const me = e as MouseEvent;
        this._mouseDeltaX += me.movementX;
        this._mouseDeltaY += me.movementY;
        this._mouseX = me.clientX;
        this._mouseY = me.clientY;
    }

    private _onGamepadConnected(_e: Event): void {
        // Gamepad polling handles state
    }

    private _onGamepadDisconnected(e: Event): void {
        const ge = e as GamepadEvent;
        this._gamepadButtons.delete(ge.gamepad.index);
        this._gamepadAxes.delete(ge.gamepad.index);
    }

    private _listen(
        target: EventTarget,
        event: string,
        handler: EventListener,
    ): void {
        target.addEventListener(event, handler);
        this._handlers.push([target, event, handler]);
    }
}
