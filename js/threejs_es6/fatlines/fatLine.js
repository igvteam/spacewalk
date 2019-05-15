import FatLineSegments from "./fatLineSegments.js";
import FatLineGeometry from "./fatLineGeometry.js";

class FatLine extends FatLineSegments {

   constructor (geometry, material) {

       super();

       this.type = 'FatLine';
       this.isFatLine = true;

       this.geometry = geometry !== undefined ? geometry : new FatLineGeometry();
       this.material = material !== undefined ? material : new FatLineMaterial( { color: Math.random() * 0xffffff } );

   }
}

export default FatLine;

