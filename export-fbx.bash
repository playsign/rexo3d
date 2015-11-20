#!/bin/bash

PATH=$HOME/Apps/blender-2.76-rc3-linux-glibc211-x86_64:$PATH
CS_EXE=fbxtools/bin/x64/release/ConvertScene/ConvertScene

set -e
set -x

for f in "$@"; do
    tmpdir=fbxtmpdir$$
    mkdir $tmpdir
    ff="${f##*/}"
    cp "$f" $tmpdir/
    cd $tmpdir
    ../$CS_EXE "$ff"
    ffbase="${ff%%.fbx}"
    ffobj="${ffbase}_obj.obj"
    mv -v "$ffbase.fbm"/* .
    blender --background --python ../bpy_obj_to_blend.py -- "$ffobj"
    ffblend="${ffbase}.blend"
    mv obj2blend.blend "$ffblend"
    cd ..
    env TEXTURE_SRC_DIR=$PWD/$tmpdir bash export-blend.bash "$tmpdir/$ffblend"
    
    echo rm -r $tmpdir
done
