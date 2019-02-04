import { BackSide, BoxBufferGeometry, FrontSide, Mesh, PlaneBufferGeometry, ShaderLib, ShaderMaterial } from "../js/threejs_es6/three.module";

let boxMesh;

if ( background && ( background.isCubeTexture || background.isWebGLRenderTargetCube ) ) {

    if ( boxMesh === undefined ) {

        const shaderMaterialConfig =
            {
                type: 'BackgroundCubeMaterial',
                uniforms: cloneUniforms( ShaderLib.cube.uniforms ),
                vertexShader: ShaderLib.cube.vertexShader,
                fragmentShader: ShaderLib.cube.fragmentShader,
                side: BackSide,
                depthTest: true,
                depthWrite: false,
                fog: false
            };

        boxMesh = new Mesh(new BoxBufferGeometry( 1, 1, 1 ), new ShaderMaterial( shaderMaterialConfig ));

        boxMesh.geometry.removeAttribute( 'normal' );
        boxMesh.geometry.removeAttribute( 'uv' );

        boxMesh.onBeforeRender = function ( renderer, scene, camera ) {

            this.matrixWorld.copyPosition( camera.matrixWorld );

        };

        // enable code injection for non-built-in material
        Object.defineProperty( boxMesh.material, 'map', {

            get: function () {

                return this.uniforms.tCube.value;

            }

        } );

        objects.update( boxMesh );

    }

    var texture = background.isWebGLRenderTargetCube ? background.texture : background;
    boxMesh.material.uniforms.tCube.value = texture;
    boxMesh.material.uniforms.tFlip.value = ( background.isWebGLRenderTargetCube ) ? 1 : - 1;

    if ( currentBackground !== background ||
        currentBackgroundVersion !== texture.version ) {

        boxMesh.material.needsUpdate = true;

        currentBackground = background;
        currentBackgroundVersion = texture.version;

    }

    // push to the pre-sorted opaque render list
    renderList.unshift( boxMesh, boxMesh.geometry, boxMesh.material, 0, 0, null );

}
