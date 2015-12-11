"use strict";
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* global requestAnimationFrame */
/* global THREE */

// (c) 2015 Playsign Ltd
// Parts adapted from review.js from ThreeJS r72

var THREE = THREE || "appease jslint";

var App = {
    init: function() {
    },
    hasMorph: false,
    prevTime: Date.now(),
    clock: new THREE.Clock(),    
    orbit: null, /* OrbitControls */
    scene: null,
    camera: null,
    animation: null,
    container: null,
    renderer: null,
    render: function() {
        this.renderer.render(this.scene, this.camera);
        if ( this.hasMorph ) {
            var time = Date.now();
            this.animation.update( time - this.prevTime );        
            this.prevTime = time;
        }
    },
    
    animate: function() {        
        var thisIsThis = this;
        requestAnimationFrame(function() { thisIsThis.animate(); } );
        if ( this.animation !== null ) {
            var delta = this.clock.getDelta();
            THREE.AnimationHandler.update( delta );
        }
        this.render();
    },

    onWindowResize: function() {
        var div = this.container, cam = this.camera;
        cam.aspect = div.offsetWidth / div.offsetHeight;
        cam.updateProjectionMatrix();
        this.renderer.setSize( div.offsetWidth, div.offsetHeight );
        this.render();
    },

    setupScene: function( result, data ) {
        this.scene = new THREE.Scene();
        this.scene.add( new THREE.GridHelper( 10, 2.5 ) );
    },

    setupLights: function() {

        var directionalLight = new THREE.DirectionalLight( 0xb8b8b8 );
        directionalLight.position.set(1, 1, 1).normalize();
        directionalLight.intensity = 1.0;
        this.scene.add( directionalLight );

        directionalLight = new THREE.DirectionalLight( 0xb8b8b8 );
        directionalLight.position.set(-1, 0.6, 0.5).normalize();
        directionalLight.intensity = 0.5;
        this.scene.add(directionalLight);

        directionalLight = new THREE.DirectionalLight();
        directionalLight.position.set(-0.3, 0.6, -0.8).normalize( 0xb8b8b8 );
        directionalLight.intensity = 0.45;
        this.scene.add(directionalLight);
    },
   
    loadObject: function( data ) {
        var loader = new THREE.ObjectLoaderDds();
        this.scene = loader.parse( data );
        
        var hasLights = false;
        
        var lights = ['AmbientLight', 'DirectionalLight',
                      'PointLight', 'SpotLight', 'HemisphereLight']
        
        var cameras = ['OrthographicCamera', 'PerspectiveCamera'];
        
        for (var i = 0; i < this.scene.children.length; i ++ ) {
            
            var lightIndex = lights.indexOf( this.scene.children[ i ].type );
            
            if ( lightIndex > -1 ) {
                
                hasLights = true;
                continue;
                
            }
            
            var cameraIndex = cameras.indexOf( this.scene.children[ i ].type );
            
            if ( cameraIndex > -1 ) {
                
                this.setCamera(this.scene.children[ i ]);
                var container = document.getElementById( 'viewport' );
                
                this.orbit = new THREE.OrbitControls( this.camera, container );
                var thisIsThis = this;
                this.orbit.addEventListener( 'change', function() { thisIsThis.render(); } );
                
                var aspect = container.offsetWidth / container.offsetHeight;
                this.camera.aspect = aspect;
                this.camera.updateProjectionMatrix();
                
            }
            
        }
        
        if ( ! ( hasLights ) ) this.setupLights();
        
        this.scene.add( new THREE.GridHelper( 10, 2.5 ) );
        
        this.render();

    },
    
    loadGeometry: function( data, url ) {

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
            this.animation = new THREE.Animation( mesh, data.geometry.animations[0] );

        } else {
            
            mesh = new THREE.Mesh( data.geometry, material );
            
            if ( data.geometry.morphTargets.length > 0 ) {

                console.log( 'loading morph targets' );
                data.materials[ 0 ].morphTargets = true;
                this.animation = new THREE.MorphAnimation( mesh );
                this.hasMorph = true;
                
            }
            
        }
        
        this.setupScene();
        this.setupLights();
        this.scene.add( mesh );
        
        if ( this.animation != null ) {
            
            console.log( 'playing animation' );
            this.animation.play();
            this.animate();
            
        } else {
            this.render();
            
        }
    },

    loadBufferGeometry: function ( data ) {
        var loader = new THREE.BufferGeometryLoader();
        var bufferGeometry = loader.parse( data );
        var material = new THREE.MeshLambertMaterial( { color: 0xb8b8b8 } );
        var mesh = new THREE.Mesh( bufferGeometry, material );
        this.setupScene();
        this.setupLights();
        this.scene.add( mesh );
        this.render();
    },

    loadData: function( data, url ) {
        if ( data.metadata.type === 'Geometry' ) {
            this.loadGeometry( data, url );
        } else if ( data.metadata.type === 'Object' ) {
            this.loadObject( data );
        } else if ( data.metadata.type === 'BufferGeometry' ) {
            this.loadBufferGeometry( data );
        } else {
            console.warn( 'can not determine type' );
        }
    },

    ddsLoaderMonkeyPatch: function() {
        console.log(
            "monkey patching THREE.ImageLoader - replacing with THREE.DDSLoader");
        THREE.OrigImageLoader = THREE.ImageLoader;
        THREE.ImageLoader = THREE.DDSLoader;
    },

    ddsLoaderMonkeyUnPatch: function() {
        console.log(
            "restoring patching THREE.ImageLoader");
        THREE.ImageLoader = THREE.OrigImageLoader;
    },

    loadScene: function( url ) {
        var div;
        this.container = div = document.createElement( 'div' );
        div.id = 'viewport';
        document.body.appendChild( div );

        this.renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true  } );
        this.renderer.setSize( div.offsetWidth, div.offsetHeight );
        this.renderer.setClearColor( 0x000000, 0 );
        div.appendChild( this.renderer.domElement );
        this.renderer.gammaInput = true;
        this.renderer.gammaOutput = true;

        var aspect = div.offsetWidth / div.offsetHeight;
        this.setCamera(new THREE.PerspectiveCamera( 50, aspect, 0.01, 500 ));
        this.orbit = new THREE.OrbitControls( this.camera, div );
        var thisIsThis = this;
        this.orbit.addEventListener( 'change', function() { thisIsThis.render(); });
        this.camera.position.z = 5;
        this.camera.position.x = 5;
        this.camera.position.y = 5;
        var target = new THREE.Vector3( 0, 1, 0 );
        this.camera.lookAt( target );
        this.orbit.target = target;
        this.camera.updateProjectionMatrix();
        var thisIsThis = this;
        window.addEventListener(
            'resize', function() { thisIsThis.onWindowResize(); }, false );

        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function ( x ) {

            if ( xhr.readyState === xhr.DONE ) {

                if ( xhr.status === 200 || xhr.status === 0  ) {
                    
                    // var loadDataLater = function() {

                    //     console.log("delayed loadData");
                    thisIsThis.loadData( JSON.parse( xhr.responseText ), url );
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

    },
    
    setCamera: function(camera) {
        this.camera = camera;
        console.log("camera set to", camera);
    },

};

