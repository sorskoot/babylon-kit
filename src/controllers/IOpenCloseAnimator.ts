/**
 * Interface for anything that can open, close, and toggle (doors, drawers, chests, etc.).
 * Implement this to provide custom open/close animation behaviour.
 */
export interface IOpenCloseAnimator {
    /** Moves the target to its fully open state. */
    open(): void;

    /** Moves the target back to its fully closed state. */
    close(): void;

    /** Toggles between open and closed states. */
    toggle(): void;

    /** Returns `true` when the target is in (or moving toward) the open state. */
    isOpen(): boolean;

    /** Stops any running animation and releases associated resources. */
    dispose?(): void;
}