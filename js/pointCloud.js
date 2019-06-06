import * as THREE from "../node_modules/three/build/three.module.js";
import { getBoundsWithPointCloud } from './pointCloudManager.js';
import { degrees } from './math.js';
class PointCloud {

    constructor () {
    }

    static getRenderStyle() {
        return 'render-style-point-cloud';
    }

    configure(geometry, renderStyle) {

        this.dispose();

        this.pc = this.createPointCloud(geometry);

        if (renderStyle === PointCloud.getRenderStyle()) {
            this.show();
        } else {
            this.hide();
        }

    }

    updateMaterialProvider (materialProvider) {
        // do stuff
    }

    createPointCloud(geometry){

        // const pointsMaterialConfig =
        //     {
        //         size: 32,
        //         vertexColors: THREE.VertexColors
        //     };

        const map = new THREE.TextureLoader().load( "texture/dot_dugla.png" );
        const pointsMaterialConfig =
            {
                size: 64,
                vertexColors: THREE.VertexColors,
                map,
                transparent: true,
                depthTest: false,
                side: THREE.DoubleSide
            };

        let material = new THREE.PointsMaterial( pointsMaterialConfig );

        const uniforms = THREE.UniformsUtils.clone( THREE.ShaderLib.points.uniforms );
        // const { vertexShader, fragmentShader } = THREE.ShaderLib.points;
        //
        // const shaderMaterialConfig =
        //     {
        //         uniforms,
        //         vertexShader,
        //         fragmentShader,
        //         vertexColors: true
        //     };
        //
        // let material = new THREE.ShaderMaterial( shaderMaterialConfig );

        material.side = THREE.DoubleSide;

        let mesh = new THREE.Points( geometry, material );
        mesh.name = 'point_cloud';

        return { mesh };

    };

    addToScene (scene) {
        scene.add( this.pc.mesh );
    }

    renderLoopHelper () {
        // do stuff
    }

    hide () {
        this.pc.mesh.visible = false;
    }

    show () {
        this.pc.mesh.visible = true;
    }

    dispose () {

        if (this.pc) {
            let { material, geometry } = this.pc.mesh;
            [ material, geometry ].forEach(item => item.dispose());
        }

    }

    getThumbnailGeometryList () {
        return undefined;
    }

    getBounds() {
        return getBoundsWithPointCloud(this.pc.mesh);
    }

    getCameraPoseAlongAxis ({ axis, scaleFactor }) {

        const { center, radius } = this.getBounds();

        const dimen = scaleFactor * radius;

        const theta = Math.atan(radius/dimen);
        const fov = degrees( 2 * theta);

        const axes =
            {
                '-x': () => {
                    return new THREE.Vector3(-dimen, 0, 0);
                },
                '+x': () => {
                    return new THREE.Vector3(dimen, 0, 0);
                },
                '-y': () => {
                    return new THREE.Vector3(0, -dimen, 0);
                },
                '+y': () => {
                    return new THREE.Vector3(0, dimen, 0);
                },
                '-z': () => {
                    return new THREE.Vector3(0, 0, -dimen);
                },
                '+z': () => {
                    return new THREE.Vector3(0, 0, dimen);
                },
            };

        const vector = axes[ axis ]();
        let position = new THREE.Vector3();

        position.addVectors(center, vector);

        return { target:center, position, fov }
    }

}

export default PointCloud;
