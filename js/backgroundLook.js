import * as THREE from "../node_modules/three/build/three.module.js";


class BackgroundLook {

    constructor({ northColor, southColor, }) {

        const uniforms =
            {
                north:
                    {
                        type:"c",
                        value : northColor
                    },
                south:
                    {
                        type:"c",
                        value : southColor
                    }
            };

        const material = new THREE.ShaderMaterial({
            uniforms,
            depthWrite: false,
            vertexShader: `
        varying vec2 vUv;
        
        void main() {
            vUv = uv;
            gl_Position = vec4( position, 1.0 );    
        }
      `,
            fragmentShader: `
        varying vec2 vUv;
        uniform vec3 north;
        uniform vec3 south;
        void main() {
            vec3 lerp = mix(north, south, 1.0 - vUv.y);     
            gl_FragColor = vec4(lerp, 1.0);
        }
      `
        });


        const size = 2;
        const denom = 2;
        // const denom = 4;
        this.camera = new THREE.OrthographicCamera(-size/denom, size/denom, size/denom, -size/denom);

        const tesselation = 4;
        const quad = new THREE.PlaneBufferGeometry(size, size, tesselation, tesselation);

        const mesh = new THREE.Mesh(quad, material);

        this.scene = new THREE.Scene();
        this.scene.add(mesh);


    }

}

export default BackgroundLook
