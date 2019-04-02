
let scene;
let renderer;
let camera;
let orbitControl;
let composer;
let stats;
let group;

let main = (threejs_canvas_container) => {

    const { devicePixelRatio, innerWidth, innerHeight } = window;
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x000000);
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(innerWidth, innerHeight);

    threejs_canvas_container.appendChild( renderer.domElement );

    const [ near, far, fov ] = [ 3, 10, 65 ];
    camera = new THREE.PerspectiveCamera(fov, innerWidth / innerHeight, near, far);
    camera.position.z = 7;

    orbitControl = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControl.screenSpacePanning = false;
    orbitControl.target = new THREE.Vector3(0, 0, 0);
    orbitControl.update();

    scene = new THREE.Scene();

    setup(threejs_canvas_container, scene, renderer, camera);

    animate();

};

let setup = (container, scene, renderer, camera) => {

    group = new THREE.Object3D();
    scene.add( group );

    const dimen = 70;
    [ [ dimen, -dimen, -dimen ], [ dimen, -dimen, dimen ], [ dimen, dimen, -dimen ] ].forEach((xyz) => {
        let pointLight = new THREE.PointLight( 0xddffdd, 0.8 );
        pointLight.position.z = xyz[ 0 ];
        pointLight.position.y = xyz[ 1 ];
        pointLight.position.x = xyz[ 2 ];
        scene.add( pointLight );
    });

    scene.add( new THREE.AmbientLight(0xffffff, 0.05) );

    let geometry = new THREE.SphereBufferGeometry( 3, 48, 24 );

    for (let i = 0; i < 120; i++) {

        let material = new THREE.MeshStandardMaterial();
        material.roughness = 0.5 * Math.random() + 0.25;
        material.metalness = 0;
        material.color.setHSL( Math.random(), 1.0, 0.3 );

        let  mesh = new THREE.Mesh( geometry, material );
        mesh.position.x = Math.random() * 4 - 2;
        mesh.position.y = Math.random() * 4 - 2;
        mesh.position.z = Math.random() * 4 - 2;
        mesh.rotation.x = Math.random();
        mesh.rotation.y = Math.random();
        mesh.rotation.z = Math.random();

        mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.random() * 0.2 + 0.05;
        group.add( mesh );
    }


    stats = new Stats();
    container.appendChild( stats.dom );

    composer = new THREE.EffectComposer( renderer );
    let renderPass = new THREE.RenderPass( scene, camera );
    composer.addPass( renderPass );
    let saoPass = new THREE.SAOPass( scene, camera, false, true );
    composer.addPass( saoPass );

    let gui = new dat.GUI();
    gui.add( saoPass.params, 'output', {
        'Beauty': THREE.SAOPass.OUTPUT.Beauty,
        'Beauty+SAO': THREE.SAOPass.OUTPUT.Default,
        'SAO': THREE.SAOPass.OUTPUT.SAO,
        'Depth': THREE.SAOPass.OUTPUT.Depth,
        'Normal': THREE.SAOPass.OUTPUT.Normal
    } ).onChange((value) => {  saoPass.params.output = parseInt( value ); } );

    gui.add( saoPass.params, 'saoBias', - 1, 1 );
    gui.add( saoPass.params, 'saoIntensity', 0, 1 );
    gui.add( saoPass.params, 'saoScale', 0, 10 );
    gui.add( saoPass.params, 'saoKernelRadius', 1, 100 );
    gui.add( saoPass.params, 'saoMinResolution', 0, 1 );
    gui.add( saoPass.params, 'saoBlur' );
    gui.add( saoPass.params, 'saoBlurRadius', 0, 200 );
    gui.add( saoPass.params, 'saoBlurStdDev', 0.5, 150 );
    gui.add( saoPass.params, 'saoBlurDepthCutoff', 0.0, 0.1 );

    window.addEventListener('resize', onWindowResize, false );

};

let onWindowResize = () => {

    const {innerWidth, innerHeight } = window;

    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( innerWidth, innerHeight );

    composer.setSize( innerWidth, innerHeight );

};

let animate = () => {
    requestAnimationFrame( animate );
    stats.begin();
    render();
    stats.end();
};

let render = () => {
    composer.render();

};
