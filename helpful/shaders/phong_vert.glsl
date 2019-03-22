#define GAMMA_FACTOR 2
#define PI 3.14159265359
#define PI2 6.28318530718
#define PI_HALF 1.5707963267949
#define RECIPROCAL_PI 0.31830988618
#define RECIPROCAL_PI2 0.15915494
#define LOG2 1.442695
#define EPSILON 1e-6
#define saturate(a) clamp( a, 0.0, 1.0 )
#define whiteCompliment(a) ( 1.0 - saturate( a ) )

struct IncidentLight
{
    vec3 color;
    vec3 direction;
    bool visible;
};

struct ReflectedLight
{
    vec3 directDiffuse;
    vec3 directSpecular;
    vec3 indirectDiffuse;
    vec3 indirectSpecular;
};

struct GeometricContext
{
    vec3 position;
    vec3 normal;
    vec3 viewDir;
};

float pow2( const in float x ) { return x*x; }

float pow3( const in float x ) { return x*x*x; }

float pow4( const in float x ) { float x2 = x*x; return x2*x2; }

float average( const in vec3 color ) { return dot( color, vec3( 0.3333 ) ); }

float rand( const in vec2 uv ) {
    const highp float a = 12.9898, b = 78.233, c = 43758.5453;
    highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
    return fract(sin(sn) * c);
}

vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
    return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}

vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
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

float linearToRelativeLuminance( const in vec3 color ) {
    vec3 weights = vec3( 0.2126, 0.7152, 0.0722 );
    return dot( weights, color.rgb );
}

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
uniform mat3 uvTransform;
uniform float refractionRatio;

attribute vec4 tangent;
attribute vec3 color;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

varying vec3 vViewPosition;
varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vReflect;
varying vec3 vColor;

void main() {

    #if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP ) || defined( USE_ROUGHNESSMAP ) || defined( USE_METALNESSMAP )
    vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
    #endif

    #if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
    vUv2 = uv2;
    #endif

    #ifdef USE_COLOR
    vColor.xyz = color.xyz;
    #endif

    vec3 objectNormal = vec3( normal );

    #ifdef USE_TANGENT
    vec3 objectTangent = vec3( tangent.xyz );
    #endif

    vec3 transformedNormal = normalMatrix * objectNormal;

    #ifdef FLIP_SIDED
    transformedNormal = - transformedNormal;
    #endif

    #ifdef USE_TANGENT
    vec3 transformedTangent = normalMatrix * objectTangent;
    #ifdef FLIP_SIDED
    transformedTangent = - transformedTangent;
    #endif
    #endif

    #ifndef FLAT_SHADED
    vNormal = normalize( transformedNormal );
    #endif

    vec3 transformed = vec3( position );

    vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );

    gl_Position = projectionMatrix * mvPosition;

    vViewPosition = - mvPosition.xyz;

    #if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP )
    vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );
    #endif

    #ifdef USE_ENVMAP

    #if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG )

    vWorldPosition = worldPosition.xyz;

    #else

    vec3 cameraToVertex = normalize( worldPosition.xyz - cameraPosition );

    vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );

    #ifdef ENVMAP_MODE_REFLECTION
    vReflect = reflect( cameraToVertex, worldNormal );
    #else
    vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
    #endif

    #endif

    #endif

}
