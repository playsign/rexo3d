#!/bin/bash

PATH=$HOME/Apps/blender-2.76-rc3-linux-glibc211-x86_64:$PATH

blender --background --python bpy_obj_to_blend.py -- "$1"

