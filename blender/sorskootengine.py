"""
sorskootengine.py
-----------------
A Blender add-on that extends the GLTF export pipeline for the Sorskoot game engine.

This add-on registers custom object properties and UI panels in the 3D Viewport
sidebar ("N-panel") under a **Sorskoot** tab.

During GLTF export the add-on injects a single ``SORSKOOT_BJS_ENGINE`` extension
block into every node that carries at least one active property group.  All active
groups are collected as sub-keys inside that block so that any combination of
features can coexist on the same node:

.. code-block:: json

    "extensions": {
        "SORSKOOT_BJS_ENGINE": {
            "spawner":   { "enemy": "robot", "count": 3, "radius": 2.0 },
            "particles": { "definition": "fire_loop" }
        }
    }

Adding a new feature group requires only:

1. Subclass :class:`SorskootPropertyGroup`.
2. Append an instance to :data:`PROPERTY_GROUPS`.

Everything else (property registration, UI panel, GLTF export) is handled
automatically.

Installation (required for GLTF export hooks to work):
    1. In Blender, go to Edit > Preferences > Add-ons > Install…
    2. Select this file and click "Install Add-on".
    3. Enable the "Sorskoot Engine Tools" add-on from the list.

    Running the script directly from the Scripting workspace registers the UI
    panels but **not** the GLTF export hook (Blender's glTF2 exporter only
    discovers ``glTF2ExportUserExtension`` in properly installed add-ons).
"""

bl_info = {
    "name": "Sorskoot Engine Tools",
    "author": "Sorskoot",
    "version": (1, 1, 0),
    "blender": (3, 3, 0),
    "location": "View3D > Sidebar > Sorskoot",
    "description": (
        "Adds Sorskoot game-engine property groups to scene objects and exports "
        "them as a SORSKOOT_BJS_ENGINE GLTF2 extension."
    ),
    "category": "Import-Export",
}

import bpy

# Single umbrella extension name written into the GLTF file.
# Must match EXTENSION_NAME in the Babylon.js loader.
EXTENSION_NAME = "SORSKOOT_BJS_ENGINE"


# ---------------------------------------------------------------------------
# Property Group base class
# ---------------------------------------------------------------------------

class SorskootPropertyGroup:
    """
    Base class for a Sorskoot property group.

    Each subclass encapsulates everything needed for one logical feature:
    the bpy.props registrations, the sidebar UI layout, and the dict that
    gets embedded in the GLTF extension block.

    To add a new feature to the engine:

    1. Subclass :class:`SorskootPropertyGroup`.
    2. Set :attr:`key` and :attr:`label`.
    3. Override :meth:`get_properties`, :meth:`draw_panel`, and
       :meth:`export_data`.
    4. Append an instance to :data:`PROPERTY_GROUPS`.
    """

    #: Sub-key used inside the ``SORSKOOT_BJS_ENGINE`` GLTF extension block.
    key: str = ""
    #: Human-readable name shown as the panel label in the sidebar.
    label: str = ""

    def get_properties(self) -> dict:
        """
        Return a mapping of ``bpy.types.Object`` attribute names to bpy.props
        descriptors that should be registered for this group.

        Example::

            return {
                "my_flag": bpy.props.BoolProperty(name="My Flag", default=False),
                "my_value": bpy.props.FloatProperty(name="Value", default=1.0),
            }
        """
        return {}

    def register_properties(self):
        """Register all properties returned by :meth:`get_properties`."""
        for attr, prop in self.get_properties().items():
            setattr(bpy.types.Object, attr, prop)

    def unregister_properties(self):
        """Remove all properties returned by :meth:`get_properties`."""
        for attr in self.get_properties():
            try:
                delattr(bpy.types.Object, attr)
            except AttributeError:
                pass

    def draw_panel(self, layout, obj):
        """
        Draw the panel UI for this group into *layout*.

        :param layout: The Blender UI layout to draw into.
        :type layout: bpy.types.UILayout
        :param obj: The currently active Blender object.
        :type obj: bpy.types.Object
        """
        layout.label(text="(no properties defined)")

    def export_data(self, blender_object) -> dict | None:
        """
        Return a dict of data to embed under :attr:`key` in the GLTF extension
        block, or ``None`` if this group should not be exported for the given
        object (e.g. because the feature is disabled on it).

        :param blender_object: The Blender object being exported.
        :type blender_object: bpy.types.Object
        """
        return None


# ---------------------------------------------------------------------------
# Concrete property groups
# ---------------------------------------------------------------------------

class SpawnerPropertyGroup(SorskootPropertyGroup):
    """
    Property group for enemy-spawner settings.

    Exported as ``SORSKOOT_BJS_ENGINE.spawner`` in the GLTF node extension.
    """

    key = "spawner"
    label = "Spawner"

    def get_properties(self) -> dict:
        return {
            # Master switch – all other spawner controls are gated behind this.
            "spawner_enabled": bpy.props.BoolProperty(
                name="Spawner Enabled",
                default=False,
            ),
            # Identifier of the enemy prefab to spawn (must match a game-engine key).
            "spawner_enemy": bpy.props.StringProperty(
                name="Enemy Type",
                default="robot",
            ),
            # How many enemies to spawn around this node.
            "spawner_count": bpy.props.IntProperty(
                name="Count",
                default=3,
                min=1,
            ),
            # Spawn radius in Blender units around the node's world position.
            "spawner_radius": bpy.props.FloatProperty(
                name="Radius",
                default=2.0,
                min=0.1,
            ),
        }

    def draw_panel(self, layout, obj):
        layout.prop(obj, "spawner_enabled")
        col = layout.column()
        col.enabled = obj.spawner_enabled
        col.prop(obj, "spawner_enemy")
        col.prop(obj, "spawner_count")
        col.prop(obj, "spawner_radius")

    def export_data(self, blender_object) -> dict | None:
        if not blender_object.spawner_enabled:
            return None
        return {
            "enemy":  blender_object.spawner_enemy,
            "count":  blender_object.spawner_count,
            "radius": blender_object.spawner_radius,
        }


class ParticlesPropertyGroup(SorskootPropertyGroup):
    """
    Property group for particle-system settings.

    Exported as ``SORSKOOT_BJS_ENGINE.particles`` in the GLTF node extension.
    """

    key = "particles"
    label = "Particles"

    def get_properties(self) -> dict:
        return {
            # Master switch for particle emission on this node.
            "particles_enabled": bpy.props.BoolProperty(
                name="Particles Enabled",
                default=False,
            ),
            # JSON-file key or asset path for the particle definition.
            "particles_definition": bpy.props.StringProperty(
                name="Particles Definition",
                default="",
            ),
        }

    def draw_panel(self, layout, obj):
        layout.prop(obj, "particles_enabled")
        col = layout.column()
        col.enabled = obj.particles_enabled
        col.prop(obj, "particles_definition")

    def export_data(self, blender_object) -> dict | None:
        if not blender_object.particles_enabled:
            return None
        return {
            "definition": blender_object.particles_definition,
        }


# ---------------------------------------------------------------------------
# Registry
#
# Add a new SorskootPropertyGroup instance here to activate it throughout
# the add-on (property registration, UI panel, GLTF export).
# ---------------------------------------------------------------------------

PROPERTY_GROUPS: list[SorskootPropertyGroup] = [
    SpawnerPropertyGroup(),
    ParticlesPropertyGroup(),
]


# ---------------------------------------------------------------------------
# Dynamic sidebar panel factory
# ---------------------------------------------------------------------------

def _make_sidebar_panel(group: SorskootPropertyGroup) -> type:
    """
    Dynamically build a ``VIEW3D`` sidebar sub-panel for *group*.

    Using ``type()`` lets us keep each group fully self-contained: there is no
    need to write a separate ``bpy.types.Panel`` subclass for every feature.
    The generated class follows Blender's naming convention and is nested under
    the main :class:`VIEW3D_PT_Sorskoot` tab.

    :param group: The property group to create a panel for.
    :returns: A new ``bpy.types.Panel`` subclass ready to be registered.
    """
    def draw(self, context):
        layout = self.layout
        obj = context.object
        if obj is None:
            layout.label(text="No active object.", icon='ERROR')
            return
        group.draw_panel(layout, obj)

    cls_name = f"VIEW3D_PT_sorskoot_{group.key}"
    return type(
        cls_name,
        (bpy.types.Panel,),
        {
            "__doc__": f"Sorskoot '{group.label}' settings in the 3D Viewport sidebar.",
            "bl_label":     group.label,
            "bl_idname":    cls_name,
            "bl_space_type": "VIEW_3D",
            "bl_region_type": "UI",
            "bl_category":  "Sorskoot",
            "bl_parent_id": "VIEW3D_PT_sorskoot",
            "draw":         draw,
        },
    )


# ---------------------------------------------------------------------------
# Static UI panel (the Sorskoot tab header)
# ---------------------------------------------------------------------------

class VIEW3D_PT_Sorskoot(bpy.types.Panel):
    """
    Top-level panel that creates the **Sorskoot** tab in the 3D Viewport sidebar.

    Press :kbd:`N` in the 3D Viewport, then click the **Sorskoot** tab.
    Feature sub-panels generated from :data:`PROPERTY_GROUPS` appear below.
    """

    bl_label = "Sorskoot Engine"
    bl_idname = "VIEW3D_PT_sorskoot"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Sorskoot"

    def draw(self, context):
        self.layout.label(text="Sorskoot Game Engine Tools", icon='MONKEY')


# ---------------------------------------------------------------------------
# GLTF2 export hook
#
# The class name glTF2ExportUserExtension is a convention required by
# Blender's io_scene_gltf2 add-on.  Do not rename it.
# ---------------------------------------------------------------------------

class glTF2ExportUserExtension:
    """
    GLTF2 export hook that collects all active property groups into a single
    ``SORSKOOT_BJS_ENGINE`` extension block on each GLTF node.

    Because every group is stored under its own sub-key, multiple groups can
    coexist on the same node without overwriting each other.
    """

    def __init__(self):
        # Deferred import so the add-on loads even without io_scene_gltf2.
        from io_scene_gltf2.io.com.gltf2_io_extensions import Extension
        self.Extension = Extension

    def gather_node_hook(self, gltf2_node, blender_object, export_settings):
        """
        Called by the glTF2 exporter for each scene node.

        Iterates :data:`PROPERTY_GROUPS`, asks each group for its export data,
        and writes all non-None results into a single ``SORSKOOT_BJS_ENGINE``
        extension block on the node.

        :param gltf2_node: The glTF2 node being exported.
        :param blender_object: The source Blender object, or ``None``.
        :param export_settings: Current export settings (unused here).
        """
        if blender_object is None:
            return

        # Ask every group whether it has data to export for this object.
        extension_data = {}
        for group in PROPERTY_GROUPS:
            data = group.export_data(blender_object)
            if data is not None:
                extension_data[group.key] = data

        # Nothing active on this node – leave it untouched.
        if not extension_data:
            return

        if gltf2_node.extensions is None:
            gltf2_node.extensions = {}

        gltf2_node.extensions[EXTENSION_NAME] = self.Extension(
            name=EXTENSION_NAME,
            extension=extension_data,
            required=False,
        )


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

# The static tab-header panel.  glTF2ExportUserExtension must NOT be added
# here – it is not a bpy.types class and is discovered by io_scene_gltf2 by
# name automatically.
_STATIC_CLASSES = (
    VIEW3D_PT_Sorskoot,
)

# Populated by register(); kept so unregister() can remove the same classes.
_dynamic_panel_classes: list = []


def register():
    """
    Register the add-on with Blender.

    1. Calls :meth:`SorskootPropertyGroup.register_properties` on every group
       in :data:`PROPERTY_GROUPS`.
    2. Generates a sidebar panel for each group via :func:`_make_sidebar_panel`.
    3. Registers all static and dynamic panel classes with Blender.
    """
    global _dynamic_panel_classes

    for group in PROPERTY_GROUPS:
        group.register_properties()

    _dynamic_panel_classes = [_make_sidebar_panel(g) for g in PROPERTY_GROUPS]

    for cls in _STATIC_CLASSES:
        bpy.utils.register_class(cls)
    for cls in _dynamic_panel_classes:
        bpy.utils.register_class(cls)


def unregister():
    """
    Unregister the add-on from Blender.

    Removes all panels in reverse registration order, then removes all
    bpy.props attributes added by each property group.
    """
    global _dynamic_panel_classes

    for cls in reversed(_dynamic_panel_classes):
        bpy.utils.unregister_class(cls)
    for cls in reversed(_STATIC_CLASSES):
        bpy.utils.unregister_class(cls)

    for group in reversed(PROPERTY_GROUPS):
        group.unregister_properties()

    _dynamic_panel_classes = []


if __name__ == "__main__":
    # Running directly from the Scripting workspace registers the UI panels.
    # The GLTF export hook is only active when installed as an add-on.
    register()
