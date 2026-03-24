import { createElement, useState, useEffect, useRef } from 'react';
import {
    ShellServiceIdentity,
    IShellService,
    ServiceDefinition,
} from '@babylonjs/inspector';
import type { IGameEngine, IEntity, IComponent } from '../core/types';

// ─── Value formatting helpers ─────────────────────────────────────────────────

function isVec3(v: unknown): v is { x: number; y: number; z: number } {
    return typeof v === 'object' && v !== null &&
        'x' in v && 'y' in v && 'z' in v && typeof (v as Record<string,unknown>).x === 'number';
}
function isVec2(v: unknown): v is { x: number; y: number } {
    return typeof v === 'object' && v !== null &&
        'x' in v && 'y' in v && !('z' in v) && typeof (v as Record<string,unknown>).x === 'number';
}
function isColor(v: unknown): v is { r: number; g: number; b: number } {
    return typeof v === 'object' && v !== null &&
        'r' in v && 'g' in v && 'b' in v && typeof (v as Record<string,unknown>).r === 'number';
}

function fmt(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'boolean') return String(value);
    if (typeof value === 'number')
        return Number.isInteger(value) ? String(value) : value.toFixed(4);
    if (typeof value === 'string') return `"${value}"`;
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (isVec3(value))
        return `(${fmt(value.x)}, ${fmt(value.y)}, ${fmt(value.z)})`;
    if (isVec2(value))
        return `(${fmt(value.x)}, ${fmt(value.y)})`;
    if (isColor(value))
        return `rgb(${Math.round(value.r * 255)}, ${Math.round(value.g * 255)}, ${Math.round(value.b * 255)})`;
    if (typeof value === 'object') {
        try {
            const s = JSON.stringify(value);
            return s.length > 60 ? `${s.slice(0, 57)}…` : s;
        } catch {
            return '[Object]';
        }
    }
    return String(value);
}

/** Collects public data properties from a component (own + prototype getters). */
function getComponentProps(component: IComponent): Array<[string, unknown]> {
    const result: Array<[string, unknown]> = [];
    const seen = new Set<string>();

    // Own enumerable properties
    for (const [key, value] of Object.entries(component)) {
        if (key === 'entity' || key.startsWith('_') || typeof value === 'function') continue;
        seen.add(key);
        result.push([key, value]);
    }

    // Prototype-defined getters (up to 3 levels)
    let proto = Object.getPrototypeOf(component);
    while (proto && proto !== Object.prototype) {
        for (const key of Object.getOwnPropertyNames(proto)) {
            if (seen.has(key) || key === 'constructor' || key === 'entity') continue;
            if (key.startsWith('_') || key.startsWith('on')) continue;
            const desc = Object.getOwnPropertyDescriptor(proto, key);
            if (desc?.get) {
                try {
                    const value = (component as Record<string, unknown>)[key];
                    if (typeof value !== 'function') { seen.add(key); result.push([key, value]); }
                } catch { /* inaccessible getter */ }
            }
        }
        proto = Object.getPrototypeOf(proto);
    }

    return result;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const S = {
    root: { display: 'flex', flexDirection: 'column' as const, height: '100%', overflow: 'hidden', fontFamily: 'monospace', fontSize: '12px' },
    header: { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#aaa', flexShrink: 0 },
    scroll: { overflowY: 'auto' as const, flex: 1 },
    entityRow: (enabled: boolean) => ({
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '5px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)',
        color: enabled ? '#e0e0e0' : '#666', cursor: 'pointer',
    }),
    badge: { flexShrink: 0, marginLeft: '8px', padding: '1px 5px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', color: '#999', fontSize: '10px' },
    backBtn: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '0 4px 0 0', fontSize: '16px', lineHeight: 1 },
    metaRow: (enabled: boolean) => ({ display: 'flex', gap: '12px', padding: '5px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: enabled ? '#7ec88a' : '#d07070', fontSize: '11px', flexShrink: 0 }),
    sectionTitle: { padding: '6px 8px', background: 'rgba(255,255,255,0.05)', color: '#c8c8c8', fontWeight: 'bold' as const, borderBottom: '1px solid rgba(255,255,255,0.06)', letterSpacing: '0.02em' },
    propRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '3px 8px 3px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', gap: '8px' },
    propKey: { color: '#8ab4f8', flexShrink: 0 },
    propVal: { color: '#b5e0a4', textAlign: 'right' as const, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
    muted: { padding: '8px 16px', color: '#555', fontStyle: 'italic' },
    idSpan: { color: '#777', marginRight: '4px' },
    nameSpan: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
};

// ─── EntityListView ───────────────────────────────────────────────────────────

const EntityListView = ({ entities, onSelect }: { entities: ReadonlyArray<IEntity>; onSelect: (id: number) => void; }) =>
    createElement('div', { style: S.root },
        createElement('div', { style: S.header },
            `${entities.length} entit${entities.length === 1 ? 'y' : 'ies'}`,
        ),
        createElement('ul', { style: { ...S.scroll, listStyle: 'none', padding: 0, margin: 0 } },
            entities.length === 0
                ? createElement('li', { style: { padding: '12px 8px', color: '#666', fontStyle: 'italic' } }, 'No entities')
                : entities.map((e) =>
                    createElement('li', { key: e.id, style: S.entityRow(e.enabled), onClick: () => onSelect(e.id) },
                        createElement('span', { style: S.nameSpan },
                            createElement('span', { style: S.idSpan }, `#${e.id}`),
                            e.name,
                        ),
                        createElement('span', { style: S.badge }, String(e.components.size)),
                    ),
                ),
        ),
    );

// ─── ComponentSection ─────────────────────────────────────────────────────────

const ComponentSection = ({ name, component }: { name: string; component: IComponent; }) => {
    const props = getComponentProps(component);
    return createElement('div', null,
        createElement('div', { style: S.sectionTitle }, name),
        props.length === 0
            ? createElement('div', { style: S.muted }, 'No public properties')
            : props.map(([key, value]) =>
                createElement('div', { key, style: S.propRow },
                    createElement('span', { style: S.propKey }, key),
                    createElement('span', { style: S.propVal, title: String(value) }, fmt(value)),
                ),
            ),
    );
};

// ─── EntityDetailView ─────────────────────────────────────────────────────────

const EntityDetailView = ({ entity, onBack }: { entity: IEntity; onBack: () => void; }) => {
    const components = [...entity.components.entries()];
    return createElement('div', { style: S.root },
        // Back button + name
        createElement('div', { style: S.header },
            createElement('button', { style: S.backBtn, onClick: onBack, title: 'Back to entity list' }, '‹'),
            createElement('span', { style: S.idSpan }, `#${entity.id}`),
            createElement('span', { style: { color: '#e0e0e0', ...S.nameSpan } }, entity.name),
        ),
        // enabled / component count meta
        createElement('div', { style: S.metaRow(entity.enabled) },
            createElement('span', null, entity.enabled ? '● enabled' : '○ disabled'),
            createElement('span', null, `${components.length} component${components.length !== 1 ? 's' : ''}`),
        ),
        // Component accordion
        createElement('div', { style: S.scroll },
            components.length === 0
                ? createElement('div', { style: { padding: '12px 8px', color: '#666', fontStyle: 'italic' } }, 'No components')
                : components.map(([name, component]) =>
                    createElement(ComponentSection, { key: name, name, component }),
                ),
        ),
    );
};

// ─── Root: manages list ↔ detail navigation ───────────────────────────────────

const EntityListContent = ({ engine }: { engine: IGameEngine }) => {
    const [entities, setEntities] = useState<ReadonlyArray<IEntity>>(() => [...engine.entities]);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    // Keep a ref so the interval callback always sees the latest selectedId
    // without needing to be recreated on every selection change.
    const selectedIdRef = useRef(selectedId);
    selectedIdRef.current = selectedId;

    useEffect(() => {
        const id = setInterval(() => {
            const next = [...engine.entities];
            setEntities(next);
            // If the selected entity was destroyed, return to the list
            if (selectedIdRef.current !== null && !next.some((e) => e.id === selectedIdRef.current)) {
                setSelectedId(null);
            }
        }, 500);
        return () => clearInterval(id);
    }, [engine]);

    if (selectedId !== null) {
        const entity = entities.find((e) => e.id === selectedId);
        if (entity) {
            return createElement(EntityDetailView, { entity, onBack: () => setSelectedId(null) });
        }
    }

    return createElement(EntityListView, { entities, onSelect: setSelectedId });
};

// ─── SVG icon ─────────────────────────────────────────────────────────────────

const EntityListIcon = () =>
    createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'currentColor', xmlns: 'http://www.w3.org/2000/svg' },
        createElement('rect', { key: 'r0', x: 1, y: 1,  width: 14, height: 3, rx: 1 }),
        createElement('rect', { key: 'r1', x: 1, y: 6,  width: 14, height: 3, rx: 1 }),
        createElement('rect', { key: 'r2', x: 1, y: 11, width: 14, height: 3, rx: 1 }),
    );

// ─── Public factory ───────────────────────────────────────────────────────────

/**
 * Creates a Babylon Inspector v2 {@link ServiceDefinition} that adds a
 * left-side pane for the game engine's entities.
 *
 * - **List view** – shows every entity with its ID, name, enabled state, and
 *   component count. Click any row to open the detail view.
 * - **Detail view** – shows the selected entity's metadata and an expandable
 *   section per component, listing each component's public data properties and
 *   their current values. A back button (‹) returns to the list.
 *
 * The pane refreshes every 500 ms. If a selected entity is destroyed while its
 * detail view is open the panel automatically returns to the list.
 *
 * @param engine - The {@link IGameEngine} instance whose entities to display.
 * @returns A service definition ready to pass to `ShowInspector`.
 *
 * @example
 * ```ts
 * ShowInspector(scene, {
 *     serviceDefinitions: [
 *         DebugServiceDefinition,
 *         createEntityListServiceDefinition(engine),
 *     ],
 * });
 * ```
 */
export function createEntityListServiceDefinition(
    engine: IGameEngine,
): ServiceDefinition<[], []> {
    // `consumes` is runtime DI metadata the inspector reads at startup.
    // It is not part of the TypeScript ServiceDefinition type, so we cast.
    return {
        friendlyName: 'Entity List',
        consumes: [ShellServiceIdentity],
        factory: (shellService: IShellService) => {
            const registration = shellService.addSidePane({
                key: 'GameEngineEntityList',
                title: 'Entities',
                icon: EntityListIcon,
                content: () => createElement(EntityListContent, { engine }),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                horizontalLocation: 'left' as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                verticalLocation: 'top' as any,
                order: 100,
                teachingMoment: false,
            });
            return { dispose: () => registration.dispose() };
        },
    } as unknown as ServiceDefinition<[], []>;
}
