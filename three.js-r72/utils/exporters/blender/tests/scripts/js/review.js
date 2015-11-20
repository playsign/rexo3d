// modified by erno@playsign.net

var scene, renderer, camera, container, animation;
var hasMorph = false;
var prevTime = Date.now();
var clock = new THREE.Clock();

var loadTime = Date.now();


//console.log("monkey patching THREE.ImageLoader - replacing THREE.DDSLoader");
//THREE.ImageLoader = THREE.DDSLoader;


function render() {
    renderer.render( scene, camera );

    if ( hasMorph ) {

        var time = Date.now();

        animation.update( time - prevTime );

        prevTime = time;

    }
}

function animate() {

    requestAnimationFrame( animate );

    if ( animation !== null ) {

        var delta = clock.getDelta();
        THREE.AnimationHandler.update( delta );

    }

    render();

}

function onWindowResize() {

    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( container.offsetWidth, container.offsetHeight );

    render();

}

function setupScene( result, data ) {

    scene = new THREE.Scene();
    scene.add( new THREE.GridHelper( 10, 2.5 ) );

}

function setupLights() {

    var directionalLight = new THREE.DirectionalLight( 0xb8b8b8 );
    directionalLight.position.set(1, 1, 1).normalize();
    directionalLight.intensity = 1.0;
    scene.add( directionalLight );

    directionalLight = new THREE.DirectionalLight( 0xb8b8b8 );
    directionalLight.position.set(-1, 0.6, 0.5).normalize();
    directionalLight.intensity = 0.5;
    scene.add(directionalLight);

    directionalLight = new THREE.DirectionalLight();
    directionalLight.position.set(-0.3, 0.6, -0.8).normalize( 0xb8b8b8 );
    directionalLight.intensity = 0.45;
    scene.add(directionalLight);

}

function loadObject( data ) {

    var loader = new THREE.ObjectLoaderDds();
    scene = loader.parse( data );

    var hasLights = false;

    var lights = ['AmbientLight', 'DirectionalLight',
        'PointLight', 'SpotLight', 'HemisphereLight']

    var cameras = ['OrthographicCamera', 'PerspectiveCamera'];

    for ( i = 0; i < scene.children.length; i ++ ) {

        var lightIndex = lights.indexOf( scene.children[ i ].type );

        if ( lightIndex > -1 ) {

            hasLights = true;
            continue;

        }

        var cameraIndex = cameras.indexOf( scene.children[ i ].type );

        if ( cameraIndex > -1 ) {

            camera = scene.children[ i ];
            var container = document.getElementById( 'viewport' );

            orbit = new THREE.OrbitControls( camera, container );
            orbit.addEventListener( 'change', render );

            var aspect = container.offsetWidth / container.offsetHeight;
            camera.aspect = aspect;
            camera.updateProjectionMatrix();

        }

    }

    if ( ! ( hasLights ) ) setupLights();

    scene.add( new THREE.GridHelper( 10, 2.5 ) );

    render();

}

function loadGeometry( data, url ) {

    var loader = new THREE.JSONLoader();
    var texturePath = loader.extractUrlBase( url );
    data = loader.parse( data, texturePath );

    if ( data.materials === undefined ) {

        console.log('using default material');
        data.materials = [new THREE.MeshLambertMaterial( { color: 0xb8b8b8 } )];

    }

    var material = new THREE.MeshFaceMaterial( data.materials );
    var mesh;

    if ( data.geometry.animations !== undefined && data.geometry.animations.length > 0 ) {

        console.log( 'loading animation' );
        data.materials[ 0 ].skinning = true;
        mesh = new THREE.SkinnedMesh( data.geometry, material, false );

        var name = data.geometry.animations[0].name;
        animation = new THREE.Animation( mesh, data.geometry.animations[0] );

    } else {

        mesh = new THREE.Mesh( data.geometry, material );

        if ( data.geometry.morphTargets.length > 0 ) {

            console.log( 'loading morph targets' );
            data.materials[ 0 ].morphTargets = true;
            animation = new THREE.MorphAnimation( mesh );
            hasMorph = true;

        }

    }

    setupScene();
    setupLights();
    scene.add( mesh );

    if ( animation != null ) {

        console.log( 'playing animation' );
        animation.play();
        animate();

    } else {
        render();

    }
}

function loadBufferGeometry( data ) {

    var loader = new THREE.BufferGeometryLoader();

    var bufferGeometry = loader.parse( data );

    var material = new THREE.MeshLambertMaterial( { color: 0xb8b8b8 } );
    var mesh = new THREE.Mesh( bufferGeometry, material );
    setupScene();
    setupLights();
    scene.add( mesh );

    render();

}

function loadData( data, url ) {

    if ( data.metadata.type === 'Geometry' ) {

        loadGeometry( data, url );

    } else if ( data.metadata.type === 'Object' ) {

        loadObject( data );

    } else if ( data.metadata.type === 'BufferGeometry' ) {

        loadBufferGeometry( data );

    } else {

        console.warn( 'can not determine type' );

    }
    // console.log("calling dds fixup");
    // fixupCompressedTextures(scene);
    
}

function init( url ) {

    container = document.createElement( 'div' );
    container.id = 'viewport';
    document.body.appendChild( container );

    renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true  } );
    renderer.setSize( container.offsetWidth, container.offsetHeight );
    renderer.setClearColor( 0x000000, 0 );
    container.appendChild( renderer.domElement );
    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    var aspect = container.offsetWidth / container.offsetHeight;
    camera = new THREE.PerspectiveCamera( 50, aspect, 0.01, 500 );
    orbit = new THREE.OrbitControls( camera, container );
    orbit.addEventListener( 'change', render );
    camera.position.z = 5;
    camera.position.x = 5;
    camera.position.y = 5;
    var target = new THREE.Vector3( 0, 1, 0 );
    camera.lookAt( target );
    orbit.target = target;
    camera.updateProjectionMatrix();

    window.addEventListener( 'resize', onWindowResize, false );

	var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function ( x ) {

        if ( xhr.readyState === xhr.DONE ) {

            if ( xhr.status === 200 || xhr.status === 0  ) {
                
                // var loadDataLater = function() {

                //     console.log("delayed loadData");
                    loadData( JSON.parse( xhr.responseText ), url );
                // };
                // window.setTimeout(loadDataLater, 5000);

            } else {

                console.error( 'could not load json ' + xhr.status );

            }

        }

    };
    xhr.open( 'GET', url, true );
    xhr.withCredentials = false;
    xhr.send( null );

}

function fixupCompressedTextures(o3dRoot) {
    console.log("traversing");
    o3dRoot.traverse(function(o3d) {
        var mat = o3d.material;
        if (!mat)
            return;
        console.log("doing", o3d.id);
        var newmats = [];

        // for (var i = 0; i < mats.length; i++) {
        //     var map = mats[i].map;
        //     /* xxx basic version. todo: one that handles lightMaps too, and keeps same type of material as in orginal. (consider checking old type and making same kind of replacement, or check if it works just to replace the .map in existing material */
        //     if (!map || !map.sourceFile) {
        //         /* keep as-is */
        //         newmats.push(mats[i]);
        //         continue;
        //     }
        //     console.log("doing material", i, "of o3d", o3d.id);
        //     var isDds = /\.dds$/i.test(map.sourceFile);
        //     if (!isDds)
        //         continue;
        //     var newmap = THREE.ImageUtils.loadCompressedTexture(map.sourceFile);
        //     newmap.wrapS = newmap.wrapT = THREE.RepeatWrapping;
        //     map.repeat.set(1, 1);
        //     map.minFilter = map.magFilter = THREE.LinearFilter;
        //     map.anisotropy = 4;
        //     newmats.push(new THREE.MeshBasicMaterial({map: newmap}));
        // }

        if (!mat.map) {
            /* keep as-is */
            return;
        }
        console.log("doing material of o3d", o3d.id);
        var isDds = /\.dds$/i.test(map.sourceFile);
        if (!isDds)
            return;
        var newmap = THREE.ImageUtils.loadCompressedTexture(map.sourceFile);
        newmap.wrapS = newmap.wrapT = THREE.RepeatWrapping;
        map.repeat.set(1, 1);
        map.minFilter = map.magFilter = THREE.LinearFilter;
        map.anisotropy = 4;
        newmats.push(new THREE.MeshBasicMaterial({map: newmap}));

        var newFM= new MeshFaceMaterial(newmats);
        // var newMesh = new THREE.Mesh(oldMesh.geometry, newFM);
        o3d.materials = newFM;
        o3d.needsUpdate = true;
        o3d.materials.needsUpdate = true;
    });
}
