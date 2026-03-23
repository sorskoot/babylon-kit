import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameLoop } from '../../src/engine/core/loop';

describe('GameLoop', () => {
    let onUpdate: ReturnType<typeof vi.fn<(delta:number)=>void>>;
    let onFixedUpdate: ReturnType<typeof vi.fn<(delta:number)=>void>>;
    let onRender: ReturnType<typeof vi.fn<()=>void>>;
    let loop: GameLoop;

    beforeEach(() => {
        onUpdate = vi.fn<(delta:number)=>void>();
        onFixedUpdate = vi.fn<(delta:number)=>void>();
        onRender = vi.fn<()=>void>();
        loop = new GameLoop(onUpdate, onFixedUpdate, onRender, 1 / 60);
    });

    it('starts in stopped state', () => {
        expect(loop.running).toBe(false);
    });

    it('sets running to true on start', () => {
        loop.start();
        expect(loop.running).toBe(true);
    });

    it('sets running to false on stop', () => {
        loop.start();
        loop.stop();
        expect(loop.running).toBe(false);
    });

    it('does not double start', () => {
        loop.start();
        loop.start();
        expect(loop.running).toBe(true);
    });

    it('ignores tick when not running', () => {
        loop.tick(0);
        loop.tick(16.67);
        expect(onUpdate).not.toHaveBeenCalled();
        expect(onRender).not.toHaveBeenCalled();
    });

    describe('tick', () => {
        it('calls onUpdate and onRender per tick', () => {
            loop.start();
            loop.tick(0);
            loop.tick(16.67);
            expect(onUpdate).toHaveBeenCalled();
            expect(onRender).toHaveBeenCalled();
        });

        it('calls onFixedUpdate when enough time accumulates', () => {
            loop.start();
            loop.tick(0);
            loop.tick(20); // 20ms = 0.02s > 1/60s ~= 0.0167s
            expect(onFixedUpdate).toHaveBeenCalled();
        });

        it('caps delta to 0.25 seconds', () => {
            loop.start();
            loop.tick(0);
            loop.tick(1000); // 1 second gap

            const delta = onUpdate.mock.calls[0][0];
            expect(delta).toBeLessThanOrEqual(0.25);
        });

        it('does not call onUpdate when paused', () => {
            loop.start();
            loop.tick(0); // baseline tick
            const callsBefore = onUpdate.mock.calls.length;
            loop.pause();
            loop.tick(16.67);
            expect(onUpdate.mock.calls.length).toBe(callsBefore);
        });

        it('still calls onRender when paused', () => {
            loop.start();
            loop.tick(0);
            loop.pause();
            onRender.mockClear();
            loop.tick(16.67);
            expect(onRender).toHaveBeenCalledTimes(1);
        });

        it('resumes after pause without a delta spike', () => {
            loop.start();
            loop.tick(0);
            loop.pause();
            loop.tick(500); // large gap while paused
            loop.resume();
            onUpdate.mockClear();
            loop.tick(516.67); // first tick after resume
            expect(onUpdate).toHaveBeenCalledTimes(1);
            const delta = onUpdate.mock.calls[0][0];
            // Should NOT see the 500ms gap — timestamp resets on resume
            expect(delta).toBeLessThanOrEqual(0.25);
        });
    });

    describe('time state', () => {
        it('increments frame count', () => {
            loop.start();
            loop.tick(0);
            loop.tick(16.67);
            loop.tick(33.34);
            expect(loop.time.frame).toBe(3);
        });

        it('accumulates elapsed time', () => {
            loop.start();
            loop.tick(0);
            loop.tick(100); // 0.1s
            expect(loop.time.elapsed).toBeGreaterThan(0);
        });

        it('respects timeScale', () => {
            loop.start();
            loop.time.timeScale = 2;
            loop.tick(0);
            loop.tick(100); // 0.1s raw, 0.2s scaled
            expect(loop.time.delta).toBeCloseTo(0.2, 1);
        });

        it('starts unpaused', () => {
            expect(loop.time.paused).toBe(false);
        });
    });
});
