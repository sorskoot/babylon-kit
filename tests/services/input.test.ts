import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InputSystem } from '../../src/engine/services/input/inputSystem';
import type { IInputAction } from '../../src/engine/core/types';

function createMockElement(): HTMLElement & {
    listeners: Map<string, EventListener[]>;
    fire(event: string, data: Partial<KeyboardEvent | MouseEvent>): void;
} {
    const listeners = new Map<string, EventListener[]>();

    return {
        listeners,
        addEventListener(event: string, handler: EventListener) {
            if (!listeners.has(event)) listeners.set(event, []);
            listeners.get(event)!.push(handler);
        },
        removeEventListener(event: string, handler: EventListener) {
            const list = listeners.get(event);
            if (!list) return;
            const idx = list.indexOf(handler);
            if (idx !== -1) list.splice(idx, 1);
        },
        fire(event: string, data: Record<string, unknown>) {
            for (const handler of listeners.get(event) ?? []) {
                handler(data as unknown as Event);
            }
        },
    } as unknown as HTMLElement & {
        listeners: Map<string, EventListener[]>;
        fire(event: string, data: Record<string, unknown>): void;
    };
}

describe('InputSystem', () => {
    let input: InputSystem;
    let el: ReturnType<typeof createMockElement>;

    beforeEach(() => {
        input = new InputSystem();
        el = createMockElement();

        vi.stubGlobal('window', el);
        input.attach(el);
    });

    describe('keyboard', () => {
        it('tracks key down state', () => {
            el.fire('keydown', { code: 'KeyW' });
            expect(input.isKeyDown('KeyW')).toBe(true);
        });

        it('tracks key up state', () => {
            el.fire('keydown', { code: 'KeyW' });
            el.fire('keyup', { code: 'KeyW' });
            expect(input.isKeyDown('KeyW')).toBe(false);
        });

        it('detects just pressed', () => {
            el.fire('keydown', { code: 'Space' });
            expect(input.isKeyJustDown('Space')).toBe(true);
            input.update();
            expect(input.isKeyJustDown('Space')).toBe(false);
        });

        it('detects just released', () => {
            el.fire('keydown', { code: 'Space' });
            el.fire('keyup', { code: 'Space' });
            expect(input.isKeyJustUp('Space')).toBe(true);
            input.update();
            expect(input.isKeyJustUp('Space')).toBe(false);
        });
    });

    describe('mouse', () => {
        it('tracks mouse button down', () => {
            el.fire('mousedown', { button: 0 });
            expect(input.isMouseButtonDown(0)).toBe(true);
        });

        it('tracks mouse button up', () => {
            el.fire('mousedown', { button: 0 });
            el.fire('mouseup', { button: 0 });
            expect(input.isMouseButtonDown(0)).toBe(false);
        });

        it('tracks mouse position', () => {
            el.fire('mousemove', {
                clientX: 100,
                clientY: 200,
                movementX: 5,
                movementY: -3,
            });
            expect(input.mouseX).toBe(100);
            expect(input.mouseY).toBe(200);
        });

        it('accumulates mouse delta and resets on update', () => {
            el.fire('mousemove', {
                clientX: 0,
                clientY: 0,
                movementX: 10,
                movementY: 5,
            });
            el.fire('mousemove', {
                clientX: 0,
                clientY: 0,
                movementX: 3,
                movementY: -2,
            });
            expect(input.mouseDeltaX).toBe(13);
            expect(input.mouseDeltaY).toBe(3);
            input.update();
            expect(input.mouseDeltaX).toBe(0);
            expect(input.mouseDeltaY).toBe(0);
        });
    });

    describe('action mapping', () => {
        it('detects action pressed via keyboard binding', () => {
            const action: IInputAction = {
                name: 'jump',
                bindings: [{ type: 'keyboard', code: 'Space' }],
            };
            input.registerAction(action);

            el.fire('keydown', { code: 'Space' });
            input.update();
            expect(input.isActionPressed('jump')).toBe(true);
        });

        it('detects action held', () => {
            const action: IInputAction = {
                name: 'jump',
                bindings: [{ type: 'keyboard', code: 'Space' }],
            };
            input.registerAction(action);

            el.fire('keydown', { code: 'Space' });
            input.update();
            input.update();
            expect(input.isActionHeld('jump')).toBe(true);
            expect(input.isActionPressed('jump')).toBe(false);
        });

        it('detects action released', () => {
            const action: IInputAction = {
                name: 'jump',
                bindings: [{ type: 'keyboard', code: 'Space' }],
            };
            input.registerAction(action);

            el.fire('keydown', { code: 'Space' });
            input.update();
            el.fire('keyup', { code: 'Space' });
            input.update();
            expect(input.isActionReleased('jump')).toBe(true);
        });

        it('returns value based on scale', () => {
            const action: IInputAction = {
                name: 'forward',
                bindings: [{ type: 'keyboard', code: 'KeyW', scale: 1 }],
            };
            input.registerAction(action);

            el.fire('keydown', { code: 'KeyW' });
            input.update();
            expect(input.getActionValue('forward')).toBe(1);
        });

        it('returns 0 for unknown action', () => {
            expect(input.getActionValue('nope')).toBe(0);
            expect(input.isActionHeld('nope')).toBe(false);
        });

        it('can unregister an action', () => {
            input.registerAction({ name: 'test', bindings: [] });
            input.unregisterAction('test');
            expect(input.isActionHeld('test')).toBe(false);
        });
    });

    describe('detach', () => {
        it('removes event listeners', () => {
            input.detach();
            el.fire('keydown', { code: 'KeyW' });
            expect(input.isKeyDown('KeyW')).toBe(false);
        });
    });
});
