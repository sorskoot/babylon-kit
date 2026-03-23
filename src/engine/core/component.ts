import type { IComponent, IEntity } from './types';

/**
 * Abstract base class for components.
 *
 * Components are **data containers** that are attached to {@link Entity | entities}.
 * Override the optional lifecycle hooks to react to attach/detach/update events;
 * keep heavy logic in {@link System} implementations instead.
 *
 * @example
 * ```ts
 * class HealthComponent extends Component {
 *     current = 100;
 *     max = 100;
 *
 *     onAdd() { console.log("Attached to", this.entity?.name); }
 * }
 * ```
 */
export abstract class Component implements IComponent {
    /** @inheritDoc IComponent.entity */
    entity?: IEntity;

    /** Called immediately after this component is added to an entity. */
    onAdd?(): void;
    /** Called immediately before this component is removed from an entity. */
    onRemove?(): void;
    /** Called once per frame with the delta time in seconds. */
    onUpdate?(delta: number): void;
    /** Called when the component is enabled. */
    onEnable?(): void;
    /** Called when the component is disabled. */
    onDisable?(): void;
}
