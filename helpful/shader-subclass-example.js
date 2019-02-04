import * as THREE from "three";
import Stats from "stats.js";

import { Visual } from "./Visual";
import { TapTool } from "../tools/TapTool";
import { FFTVisualTool } from "../tools/FFTVisualTool";
import { MicTool } from "../tools/MicTool";
import { SequencerTool } from "../tools/SequencerTool";
import { SequencerVisualTool } from "../tools/SequencerVisualTool";

class MeshSpikyObjectMaterial extends THREE.MeshStandardMaterial {
  constructor(options) {
    super(options);
    //Array of x,y,z vectors with a w intensity 0-1
    this._spikes = options.spikes || [
      new THREE.Vector4(1,0,0,1),
      new THREE.Vector4(0,1,0,1),
      new THREE.Vector4(0,0,1,1),
    ];
  }

  onBeforeCompile(shader, renderer){

    this.shader = shader;

    shader.uniforms.spikeNormals = { value: this._spikes };
    shader.uniforms.spikeRadius = { value: 1.0 };

    let injectPos = shader.vertexShader.indexOf("#include <uv_pars_vertex>");
    let injectPos2 = shader.vertexShader.indexOf("#include <shadowmap_vertex>");

    if(injectPos === -1 || injectPos2 === -1) {
      throw new Error("Missing injection");
    }

    console.log(shader.vertexShader);

    shader.vertexShader =`
      ${shader.vertexShader.slice(0,injectPos)}
      uniform vec4 spikeNormals[${this._spikes.length}];
      uniform float spikeRadius;
      varying float spikeAmount; //Amount of spike to pass to fragment
      
      ${shader.vertexShader.slice(injectPos,injectPos2)}
      //Normalize model vertex (before transform)
      //And dot with the spikeNormals
      float pullAmount = 0.0;
      float pullDot;
      for(int i=0;i<${this._spikes.length};i++){
           pullDot = dot(spikeNormals[i].xyz, normal);
           pullAmount += pow(max(0.0, pullDot),100.0/spikeRadius) * spikeNormals[i].w;
      }
      pullAmount = min(1.0,pullAmount);
      pullAmount = smoothstep(0.0,1.0,pullAmount);
      spikeAmount = pullAmount;
      
      vec4 mvPosition2 = modelViewMatrix * vec4( transformed + normal*spikeAmount, 1.0 );
      gl_Position = projectionMatrix * mvPosition2;
      ${shader.vertexShader.slice(injectPos2)}
    `;

    console.log(shader.fragmentShader);
    //shader.fragmentShader += "no;";
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

export class SpikyBallVisual extends Visual {

  init(renderer) {
    window.document.body.style.backgroundColor = "#000000";
    window.document.body.style.overflow = "hidden";

    this._tapTool = new TapTool(100, "k");
    this._micTool = new MicTool(2048);
    this._visTool = new FFTVisualTool(this._micTool.bins);
    this._stats = new Stats();
    this._visBox = document.createElement("div");
    this._visBox.style.position = "absolute";
    this._visBox.style.bottom = 0;
    this._visBox.style.left = 0;
    this._visBox.appendChild(this._visTool.dom);
    window.document.body.appendChild(this._visBox);
    window.document.body.appendChild(this._stats.dom);

    const cam = this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    cam.position.z = 5;
    const hemiLight = new THREE.HemisphereLight( 0xeeeeff, 0x080820, 1 );
    this.add( hemiLight );
    const pointLight = new THREE.PointLight( 0xeeeeff, 1 );
    pointLight.position.set(1,2,3);
    this.add( pointLight );

    renderer.setClearColor(new THREE.Color(0.3,0.3,0.3,1.0));
    let g = new THREE.SphereBufferGeometry(1,200,200);
    let m = new MeshSpikyObjectMaterial({
      color: 0xDDDDDD,
      metalness: 0.7,
      roughness: 0.3,
      emissive: new THREE.Color(1.0,0.0,0.0),
      //Random Spikes
      /*spikes: Array.apply(null, {length: 20})
        .map((_,idx)=>{
          let rand1 = Math.random()*Math.PI - Math.PI/2;
          let rand2 = Math.random()*Math.PI*2;
          let rz = Math.sin(rand1);
          let rxy = Math.cos(rand1);
          let rx = rxy*Math.cos(rand2);
          let ry = rxy*Math.sin(rand2);
          let v3 = new THREE.Vector3(rx,ry,rz).normalize();
          return new THREE.Vector4(v3.x,v3.y,v3.z,1.0);
        })*/
      //XYZ Coil Shape
      spikes: Array.apply(null, {length: 70})
        .map((_,idx,arr)=>{
          const spins = 40;
          let sweep = idx/(arr.length-1);
          let y = (sweep*2-1)*0.8;
          let x = Math.sin(sweep*Math.PI*2*spins)*(Math.abs(y)-1.0);
          let z = Math.cos(sweep*Math.PI*2*spins)*(Math.abs(y)-1.0);
          let v3 = new THREE.Vector3(x,y,z).normalize();
          return new THREE.Vector4(v3.x,v3.y,v3.z,1.0);
        })
    });
    new THREE.TextureLoader()
        .load("visuals/SpikyBallVisual/sludge.jpg", function(t){
      m.map = t;
      m.metalnessMap = t;
      m.needsUpdate = true;
    });

    var path = "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/cube/SwedishRoyalCastle/";
    var format = '.jpg';
    var urls = [
      path + 'px' + format, path + 'nx' + format,
      path + 'py' + format, path + 'ny' + format,
      path + 'pz' + format, path + 'nz' + format
    ];
    var reflectionCube = new THREE.CubeTextureLoader().load( urls, function(t){
      console.log(t);
      m.envMap = t;
      m.needsUpdate = true; // is this needed?
    } );
    reflectionCube.format = THREE.RGBFormat;

    let ms = this.ms = new THREE.Mesh(g,m);
    this.add(ms);

    this._lastTime = Date.now();

    this._seq1 = new SequencerTool(this._tapTool, 1, [
      ()=>{ this.ms.material.shader.uniforms.spikeRadius.value = 1; },
      ()=>{ this.ms.material.shader.uniforms.spikeRadius.value = 2; },
      ()=>{ this.ms.material.shader.uniforms.spikeRadius.value = 4; },
      ()=>{ this.ms.material.shader.uniforms.spikeRadius.value = 8; },
      ()=>{ this.ms.material.shader.uniforms.spikeRadius.value = 12; },
      ()=>{ this.ms.material.shader.uniforms.spikeRadius.value = 8; },
      ()=>{ this.ms.material.shader.uniforms.spikeRadius.value = 4; },
      ()=>{ this.ms.material.shader.uniforms.spikeRadius.value = 2; },
    ]);
    this._seq1Vis = new SequencerVisualTool(this._seq1);
    this._visBox.appendChild(this._seq1Vis.dom);

    this._seq2 = new SequencerTool(this._tapTool, 1, [
      ()=>{ this.ms.material.emissive = new THREE.Color(1.0,0.0,0.0); },
      ()=>{ this.ms.material.emissive = new THREE.Color(1.0,1.0,1.0); },
    ]);
    this._seq2Vis = new SequencerVisualTool(this._seq2);
    this._visBox.appendChild(this._seq2Vis.dom);
  }

  getCubeFromIndex(offsetv2) {
    return this.cubes[offsetv2.y][offsetv2.x];
  }

  render(renderer) {
    if(!this._micTool.isConstructed) {
      return; //Not done setting up
    }

    this._stats.begin();
    this._visTool.update(this._micTool.data);
    const time = Date.now();
    const delta = time - this._lastTime;
    this._lastTime = time;

    const rotFrame = new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(Math.cos(time/1000),Math.sin(time/1000),0), Math.PI/1000 * delta);
    this.ms.quaternion.premultiply(rotFrame);
    if(typeof this.ms.material.shader === "object") {
      this.ms.material.shader.uniforms.spikeNormals.value.forEach((v4,idx,arr)=>{
        v4.w = this._micTool.data[Math.floor(idx*this._micTool.bins/arr.length)]/256;
      });
      this._seq1.update();
      this._seq1Vis.update();
      this._seq2.update();
      this._seq2Vis.update();
    }

    renderer.render(this, this.camera);
    this._stats.end();
  }
}
