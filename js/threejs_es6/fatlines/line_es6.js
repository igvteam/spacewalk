import LineSegmentsES6 from "./line_segments_es6.js";
import LineGeometry from "./line_geometry_es6.js";

class LineES6 extends LineSegmentsES6 {

   constructor (geometry, material) {

       super();

       this.type = 'LineES6';
       this.isLineES6 = true;

       this.geometry = geometry !== undefined ? geometry : new LineGeometry();
       this.material = material !== undefined ? material : new LineMaterial( { color: Math.random() * 0xffffff } );

   }
}

export default LineES6;

