import * as THREE from '../../js/threejs_es6/three.module.js';
import OrbitControls from "../../js/threejs_es6/orbit-controls-es6.js";
import { appleCrayonColorThreeJS } from '../../js/color.js'
import SpotLightDropShadow from "../../js/spotLightDropShadow.js";

let spotlightDropshadow;

let main = (container) => {

    String.prototype.format = function () {

        var str = this;

        for ( var i = 0; i < arguments.length; i ++ ) {

            str = str.replace( '{' + i + '}', arguments[ i ] );

        }
        return str;

    };

    var camera, scene, renderer;
    var splineHelperObjects = [];
    var splinePointsLength = 4;
    var positions = [];
    var point = new THREE.Vector3();

    var geometry = new THREE.BoxBufferGeometry( 20, 20, 20 );
    var transformControl;

    var ARC_SEGMENTS = 200;

    var splines = {};

    var params = {
        uniform: true,
        tension: 0.5,
        centripetal: true,
        chordal: true,
        addPoint: addPoint,
        removePoint: removePoint,
        exportSpline: exportSpline
    };

    init(container);
    animate();

    function init(container) {

        scene = new THREE.Scene();
        scene.background = appleCrayonColorThreeJS('steel');

        camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 10000 );

        const d = 2400;
        camera.position.set( 0.5 * d, 0.75 * d, d );
        scene.add( camera );


        // Ambient
        const ambientColor = appleCrayonColorThreeJS('snow');
        const ambientLight = new THREE.AmbientLight( ambientColor );
        scene.add( ambientLight );

        const spotlightDropshadowConfig =
            {
                color: appleCrayonColorThreeJS('lime'),
                intensity: 1.5,
                shadowSize: 1024,
                near: 0.8e3,
                distance: 4e3,
                angle: Math.PI/8,
                penumbra: 0.1,
                doShowHelper: true
            };

        spotlightDropshadow = new SpotLightDropShadow(spotlightDropshadowConfig);
        spotlightDropshadow.addToScene(scene);

        const near = 0.8e3;
        const distance = 3e3;
        // spotlightDropshadow.pose({ position: new THREE.Vector3(-400, 1500, -400), target: new THREE.Vector3(-400, 0, -400), near, distance });
        spotlightDropshadow.pose({ position: new THREE.Vector3(-400, 1500, -400), target: new THREE.Vector3(0, 0, 0), near, distance });

        const dimen = 2000;
        const translation = -200;

        const planeGeometry = new THREE.PlaneBufferGeometry( dimen, dimen );
        planeGeometry.rotateX( - Math.PI / 2 );

        const shadowMaterial = new THREE.ShadowMaterial( { opacity: 0.2 } );

        const planeMesh = new THREE.Mesh( planeGeometry, shadowMaterial );
        planeMesh.position.y = translation;
        planeMesh.receiveShadow = true;

        scene.add( planeMesh );

        // place grid just above shadow receiving planeMesh
        var gridHelper = new THREE.GridHelper( dimen, 100 );
        gridHelper.position.y = translation + 1;
        gridHelper.material.opacity = 0.25;
        gridHelper.material.transparent = true;
        scene.add( gridHelper );

        renderer = new THREE.WebGLRenderer( { antialias: true } );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

        container.appendChild( renderer.domElement );

        // Controls
        let orbitControls = new OrbitControls( camera, renderer.domElement );
        orbitControls.damping = 0.2;
        orbitControls.addEventListener( 'change', render );

        /*******
         * Curves
         *********/

        for ( var i = 0; i < splinePointsLength; i ++ ) {
            addSplineObject( positions[ i ] );
        }

        positions = [];

        for ( var i = 0; i < splinePointsLength; i ++ ) {
            positions.push( splineHelperObjects[ i ].position );
        }

        var geometry = new THREE.BufferGeometry();
        geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( ARC_SEGMENTS * 3 ), 3 ) );

        var curve = new THREE.CatmullRomCurve3( positions );
        curve.curveType = 'catmullrom';
        curve.mesh = new THREE.Line( geometry.clone(), new THREE.LineBasicMaterial( { color: 0xff0000, opacity: 0.35 } ) );
        curve.mesh.castShadow = true;
        splines.uniform = curve;

        curve = new THREE.CatmullRomCurve3( positions );
        curve.curveType = 'centripetal';
        curve.mesh = new THREE.Line( geometry.clone(), new THREE.LineBasicMaterial( { color: 0x00ff00, opacity: 0.35 } ) );
        curve.mesh.castShadow = true;
        splines.centripetal = curve;

        curve = new THREE.CatmullRomCurve3( positions );
        curve.curveType = 'chordal';
        curve.mesh = new THREE.Line( geometry.clone(), new THREE.LineBasicMaterial( { color: 0x0000ff, opacity: 0.35 } ) );
        curve.mesh.castShadow = true;
        splines.chordal = curve;

        for ( var k in splines ) {

            var spline = splines[ k ];
            scene.add( spline.mesh );

        }

        load( [ new THREE.Vector3( 289.76843686945404, 452.51481137238443, 56.10018915737797 ),
            new THREE.Vector3( - 53.56300074753207, 171.49711742836848, - 14.495472686253045 ),
            new THREE.Vector3( - 91.40118730204415, 176.4306956436485, - 6.958271935582161 ),
            new THREE.Vector3( - 383.785318791128, 491.1365363371675, 47.869296953772746 ) ] );

    }

    function addSplineObject( position ) {

        var material = new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } );
        var object = new THREE.Mesh( geometry, material );

        if ( position ) {

            object.position.copy( position );

        } else {

            object.position.x = Math.random() * 1000 - 500;
            object.position.y = Math.random() * 600;
            object.position.z = Math.random() * 800 - 400;

        }

        object.castShadow = true;
        object.receiveShadow = true;
        scene.add( object );
        splineHelperObjects.push( object );
        return object;

    }

    function addPoint() {

        splinePointsLength ++;

        positions.push( addSplineObject().position );

        updateSplineOutline();

    }

    function removePoint() {

        if ( splinePointsLength <= 4 ) {

            return;

        }
        splinePointsLength --;
        positions.pop();
        scene.remove( splineHelperObjects.pop() );

        updateSplineOutline();

    }

    function updateSplineOutline() {

        for ( var k in splines ) {

            var spline = splines[ k ];

            var splineMesh = spline.mesh;
            var position = splineMesh.geometry.attributes.position;

            for ( var i = 0; i < ARC_SEGMENTS; i ++ ) {

                var t = i / ( ARC_SEGMENTS - 1 );
                spline.getPoint( t, point );
                position.setXYZ( i, point.x, point.y, point.z );

            }

            position.needsUpdate = true;

        }

    }

    function exportSpline() {

        var strplace = [];

        for ( var i = 0; i < splinePointsLength; i ++ ) {

            var p = splineHelperObjects[ i ].position;
            strplace.push( 'new THREE.Vector3({0}, {1}, {2})'.format( p.x, p.y, p.z ) );

        }

        console.log( strplace.join( ',\n' ) );
        var code = '[' + ( strplace.join( ',\n\t' ) ) + ']';
        prompt( 'copy and paste code', code );

    }

    function load( new_positions ) {

        while ( new_positions.length > positions.length ) {

            addPoint();

        }

        while ( new_positions.length < positions.length ) {

            removePoint();

        }

        for ( var i = 0; i < positions.length; i ++ ) {

            positions[ i ].copy( new_positions[ i ] );

        }

        updateSplineOutline();

    }

    function animate() {
        requestAnimationFrame( animate );
        render();
    }

    function render() {

        splines.uniform.mesh.visible = params.uniform;
        splines.centripetal.mesh.visible = params.centripetal;
        splines.chordal.mesh.visible = params.chordal;

        spotlightDropshadow.update();

        renderer.render( scene, camera );
    }


};

export { main };
