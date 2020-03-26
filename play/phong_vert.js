export default /* glsl */`
#define PHONG
#define PI 3.14159265359
#define PI2 6.28318530718
#define PI_HALF 1.5707963267949
#define RECIPROCAL_PI 0.31830988618
#define RECIPROCAL_PI2 0.15915494
#define LOG2 1.442695
#define EPSILON 1e-6

#ifndef saturate
// <tonemapping_pars_fragment> may have defined saturate() already
#define saturate(a) clamp( a, 0.0, 1.0 )
#endif

#define whiteComplement(a) ( 1.0 - saturate( a ) )

float pow2( const in float x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float average( const in vec3 color ) { return dot( color, vec3( 0.3333 ) ); }

// expects values in the range of [0,1]x[0,1], returns values in the [0,1] range.
// do not collapse into a single function per: http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract(sin(sn) * c);
}

#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float max3( vec3 v ) { return max( max( v.x, v.y ), v.z ); }
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif

struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};

struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};

struct GeometricContext {
	vec3 position;
	vec3 normal;
	vec3 viewDir;
#ifdef CLEARCOAT
	vec3 clearcoatNormal;
#endif
};

vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}

vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	// dir can be either a direction vector or a normal vector
	// upper-left 3x3 of matrix is assumed to be orthogonal
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}

vec3 projectOnPlane(in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {
	float distance = dot( planeNormal, point - pointOnPlane );
	return - distance * planeNormal + point;
}

float sideOfPlane( in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {
	return sign( dot( point - pointOnPlane, planeNormal ) );
}

vec3 linePlaneIntersect( in vec3 pointOnLine, in vec3 lineDirection, in vec3 pointOnPlane, in vec3 planeNormal ) {
	return lineDirection * ( dot( planeNormal, pointOnPlane - pointOnLine ) / dot( planeNormal, lineDirection ) ) + pointOnLine;
}

mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}

// https://en.wikipedia.org/wiki/Relative_luminance
float linearToRelativeLuminance( const in vec3 color ) {
	vec3 weights = vec3( 0.2126, 0.7152, 0.0722 );
	return dot( weights, color.rgb );
}

bool isPerspectiveMatrix( mat4 m ) {
  return m[ 2 ][ 3 ] == - 1.0;
}

#ifdef USE_UV
#ifdef UVS_VERTEX_ONLY
		vec2 vUv;
#else
		varying vec2 vUv;
#endif
	uniform mat3 uvTransform;
#endif

#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
	attribute vec2 uv2;
	varying vec2 vUv2;
	uniform mat3 uv2Transform;
#endif

#ifdef USE_ENVMAP

#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) ||defined( PHONG )
#define ENV_WORLDPOS
#endif
	
#ifdef ENV_WORLDPOS		
		varying vec3 vWorldPosition;
#else
		varying vec3 vReflect;
		uniform float refractionRatio;
#endif
	
#endif

#ifdef USE_COLOR
	varying vec3 vColor;
#endif

varying vec3 vViewPosition;

#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif

void main() {

#ifdef USE_UV
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
#endif

#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
	vUv2 = ( uv2Transform * vec3( uv2, 1 ) ).xy;
#endif

#ifdef USE_COLOR
	vColor.xyz = color.xyz;
#endif

	vec3 objectNormal = vec3( normal );
	
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif

	vec3 transformedNormal = objectNormal;
	
#ifdef USE_INSTANCING
	// this is in lieu of a per-instance normal-matrix
	// shear transforms in the instance matrix are not supported
	mat3 m = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( m[ 0 ], m[ 0 ] ), dot( m[ 1 ], m[ 1 ] ), dot( m[ 2 ], m[ 2 ] ) );
	transformedNormal = m * transformedNormal;
#endif

transformedNormal = normalMatrix * transformedNormal;

#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif

#ifdef USE_TANGENT
	vec3 transformedTangent = ( modelViewMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	
#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
#endif

#endif

#ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED
	vNormal = normalize( transformedNormal );
#endif

	vec3 transformed = vec3( position );
	
	vec4 mvPosition = vec4( transformed, 1.0 );
	
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif

    mvPosition = modelViewMatrix * mvPosition;
    
    gl_Position = projectionMatrix * mvPosition;

	vViewPosition = - mvPosition.xyz;

#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP )

	vec4 worldPosition = vec4( transformed, 1.0 );
	
#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
#endif
	
	worldPosition = modelMatrix * worldPosition;
#endif

#ifdef USE_ENVMAP

#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
#else
		vec3 cameraToVertex;
		if ( isOrthographic ) { 
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		
#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
#endif

#endif
	
#endif

}
`;
