import FatLineSegments from "./fatLineSegments.js";
import LineGeometry from "./line_geometry_es6.js";

class FatLine extends FatLineSegments {

   constructor (geometry, material) {

       super();

       this.type = 'FatLine';
       this.isFatLine = true;

       this.geometry = geometry !== undefined ? geometry : new LineGeometry();
       this.material = material !== undefined ? material : new FatLineMaterial( { color: Math.random() * 0xffffff } );

   }
}

export default FatLine;

