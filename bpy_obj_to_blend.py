import bpy, sys
bpy.ops.import_scene.obj(filepath=sys.argv[-1])
bpy.ops.wm.save_as_mainfile(filepath="obj2blend.blend")

