#!/bin/bash
# parts adapted from three.js r72 (blender exporter test scripts)
PATH=$HOME/Apps/blender-2.76-rc3-linux-glibc211-x86_64:$PATH
# you must have blender setup to run from the command line
command -v blender >/dev/null 2>&1 || { echo >&2 "Blender is not accessible from the command line. Aborting."; exit 1; }

set -e

function roundup_pot {
    prev=1
    for p in 2 4 8 16 32 64 128 256 512 1024 2048; do
        if test $1 = $p; then
            echo $p
            return
        fi
        if test $1 -lt $p && test $1 -gt $prev; then
            echo $p # change to $prev to round down (and rename function)
            return
        fi
        prev=$p
    done
    echo $p
}

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

    echo check for/fix non-power-of-2 textures
    for f in *.png *.jpg; do
        test -f "$f" || continue
        arr=($(identify -format "%w %h" "$f"))
        w=${arr[0]}
        h=${arr[1]}
        if test -z "$w" -o -z "$h"; then
            echo failed to get dimensions of $f
            exit 1
        fi
        neww=$(roundup_pot $w)
        newh=$(roundup_pot $h)
        if test $neww = $w && test $newh = $h; then
            true
        else
            mkdir -p npot
            mv "$f" npot/
            convert -verbose -geometry ${neww}x${newh} "npot/$f" "$f"
        fi
            
    done

    echo finished exporting $f
    echo export can be found at "$destdir"/index.html

done

