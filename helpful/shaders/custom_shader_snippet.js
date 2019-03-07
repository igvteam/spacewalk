class MeshCustomStandardMaterial extends THREE.MeshStandardMaterial {

    constructor(options) {
        super(options);
        //setup any new parameter here
    }

    //hooks into THREE.js renderer internals
    onBeforeCompile(shader, renderer){

        this.shader = shader;

        //add new uniforms here
        //shader.uniforms.cubemapLightmap = { value: this._myMap };

        //inject stuff into .vertexShader or .fragmentShader here

        //console.log(shader.fragmentShader);
        // debug logs help to read the fully compiled shader to pick your injection points
        // an example can be found below from one of my projects.
        // It injects a new "varying float" which you'd probably want to inject your new CubeTexture,
        // and then adds some extra code to play with PBR values based on that amount

        let injectPos3 = shader.fragmentShader.indexOf("#include <lights_physical_fragment>");
        let injectPos4 = shader.fragmentShader.indexOf("#include <fog_fragment>");

        shader.fragmentShader = `
      varying float spikeAmount;
      ${shader.fragmentShader.slice(0,injectPos3)}
      float perpToCamera = length(cross(normal, vViewPosition))/10.0;
      metalnessFactor *= perpToCamera;
      metalnessFactor += spikeAmount;
      totalEmissiveRadiance += spikeAmount*2.0;
      ${shader.fragmentShader.slice(injectPos3,injectPos4)}
      gl_FragColor *= perpToCamera;
      ${shader.fragmentShader.slice(injectPos4)}
    `;
    }
}
