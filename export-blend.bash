#!/bin/bash
# parts adapted from three.js r72 (blender exporter test scripts)
PATH=$HOME/Apps/blender-2.76-rc3-linux-glibc211-x86_64:$PATH
# you must have blender setup to run from the command line
command -v blender >/dev/null 2>&1 || { echo >&2 "Blender is not accessible from the command line. Aborting."; exit 1; }

set -e

for f in "$@"; do
    blender --background "$f" --python o3d_export_blender_script.py -- \
        out.json --vertices --normals \
        --materials --faceMaterials --indent \
        --copyTextures  --maps --textureFolder="." --embedGeometry --scene --applyModifiers --uvs --faces --geometryType=BufferGeometry 

    python o3d_review.py -t derp out.json
    mkdir -p b2t
    ff="${f##*/}"
    destdir="b2t/${ff%%.blend}"
    mv review-out/derp "$destdir"
    blenddir=$(dirname "$f")
    cp "$blenddir/"*.dds "$destdir" || true
    cp "$blenddir/"*.png "$destdir" || true
    
    echo flipping dds files
    cd b2t/"${ff%%.blend}"
    for df in *.dds; do
       convert -flip "$df" "$df.png" || break
       nvcompress -bc1 "$df.png" "$df"
       rm "$df.png"
    done

    for f in *.tga; do
        test -f "$f" && convert "$f" "$f.png" && rename s/tga.png/png/ "$f.png"
    done
    sed -i 's/\.tga"/.png"/g' derp.json

    test -d "$destdir/derp" && mv "$destdir/derp/"* "$destdir" && rmdir "$destdir/derp"

    echo finished exporting $f
    echo export can be found at "$destdir"/index.html

done
