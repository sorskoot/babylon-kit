import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SceneManager } from '../../src/engine/services/scenes/sceneManager';
import type { IGameEngine, SceneDescriptor } from '../../src/engine/core/types';

function mockEngine(): IGameEngine {
    return {} as IGameEngine;
}

function mockScene(
    name: string,
): SceneDescriptor & { setupCalls: number; teardownCalls: number } {
    const scene = {
        name,
        setupCalls: 0,
        teardownCalls: 0,
        setup: vi.fn(async () => {
            scene.setupCalls++;
        }),
        teardown: vi.fn(async () => {
            scene.teardownCalls++;
        }),
    };
    return scene;
}

describe('SceneManager', () => {
    let sm: SceneManager;
    let engine: IGameEngine;

    beforeEach(() => {
        sm = new SceneManager();
        engine = mockEngine();
        sm.init(engine);
    });

    it('starts with empty stack', () => {
        expect(sm.currentScene).toBeUndefined();
        expect(sm.stackDepth).toBe(0);
    });

    describe('load', () => {
        it('loads a registered scene', async () => {
            const scene = mockScene('main');
            sm.register(scene);
            await sm.load('main');
            expect(scene.setupCalls).toBe(1);
            expect(sm.currentScene).toBe(scene);
        });

        it('tears down previous scene on load', async () => {
            const scene1 = mockScene('s1');
            const scene2 = mockScene('s2');
            sm.register(scene1);
            sm.register(scene2);

            await sm.load('s1');
            await sm.load('s2');

            expect(scene1.teardownCalls).toBe(1);
            expect(sm.currentScene).toBe(scene2);
        });

        it('throws for unregistered scene', async () => {
            await expect(sm.load('nope')).rejects.toThrow('not registered');
        });

        it('throws if not initialized', async () => {
            const uninit = new SceneManager();
            uninit.register(mockScene('test'));
            await expect(uninit.load('test')).rejects.toThrow(
                'not initialized',
            );
        });
    });

    describe('push/pop', () => {
        it('pushes scenes onto the stack', async () => {
            const s1 = mockScene('s1');
            const s2 = mockScene('s2');
            sm.register(s1);
            sm.register(s2);

            await sm.push('s1');
            await sm.push('s2');

            expect(sm.stackDepth).toBe(2);
            expect(sm.currentScene).toBe(s2);
        });

        it('pops scene and re-enters previous', async () => {
            const s1 = mockScene('s1');
            const s2 = mockScene('s2');
            sm.register(s1);
            sm.register(s2);

            await sm.push('s1');
            await sm.push('s2');
            await sm.pop();

            expect(s2.teardownCalls).toBe(1);
            expect(s1.setupCalls).toBe(2); // called again on pop
            expect(sm.currentScene).toBe(s1);
        });
    });

    describe('register/unregister', () => {
        it('unregisters a scene', async () => {
            const scene = mockScene('test');
            sm.register(scene);
            sm.unregister('test');
            await expect(sm.load('test')).rejects.toThrow();
        });
    });
});
