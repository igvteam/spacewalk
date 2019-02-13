//::::::::::::::::::::::::::::: quantized_scalar.dsl :::::::::::::::::::::::::::::
include(../CoolColors.dsl);

float res = 512;

rayscene(

echo(8)
recursion(2) 
eyeRayEpsilon(1/100) 
threshold(1/256)

resolution(res, res)
crop(xrange(0, res-1) yrange(0, res-1))

pixel(1/1)

voxelization( disabled )

ior(air)

ambient( white )

background( slate_grey_dark )
)

// Positive xyRotation about the z-axis is ccw. 
// A rotation of zero will leave the location at
// lx = 0, ly = -distance, lz = 0

float distance, xyProjection, xyRotation, elevation, halfScreen;
float tx, ty, tz;
float lx, ly, lz;
float ux, uy, uz;

distance  = 50;
//elevation = 45*(.75);
elevation = 0;

xyProjection = cos(radians(elevation))*distance;

tx = 0;
ty = 0;
tz = 0;

xyRotation = 0;
lx = ( sin(radians(xyRotation))*xyProjection) + tx;
ly = (-cos(radians(xyRotation))*xyProjection) + ty;
lz = ( sin(radians( elevation))*    distance) + tz;

ux = 0;
uy = 0;
uz = 1;

halfScreen = (1);

camera(
    fovy(2*degrees(atan2(halfScreen, distance)))
    near_far(.001, 1000)
    imageplane(distance)
    location(lx, ly, lz)
    up(ux, uy, uz)
    target(tx, ty, tz)
)

// seed the random number generator
float unused = SeedRandom(12321);

Scalar _sinusoid	= UserScalar( name(SinusoidScalar) theSFreq(1) theS(1));
Scalar _noise 		= Noise3D(scale(1/4));
Scalar pos_noise 	= (_noise + 1.) / 2.;
Scalar _pow 		= Power(input(_noise) value(2) );
Scalar _gain 		= Gain(input(pos_noise) value(3/4));

Scalar s_scalar		= UserScalar( name(SScalar));
Scalar t_scalar		= UserScalar( name(TScalar));

float sfrequency = 8;
float tfrequency = 8;

Scalar quantized_s			= UserScalar( name(QuantizedScalar) sfreq(sfrequency) tfreq(tfrequency) scalar(s_scalar));
Scalar quantized_noise		= UserScalar( name(QuantizedScalar) sfreq(sfrequency) tfreq(tfrequency) scalar(pos_noise));
Scalar quantized_gain		= UserScalar( name(QuantizedScalar) sfreq(sfrequency) tfreq(tfrequency) scalar(_gain));
Scalar quantized_sinusoid	= UserScalar( name(QuantizedScalar) sfreq(sfrequency) tfreq(tfrequency) scalar(_sinusoid));


Shader sh;
//
//sh = MixShader( mix(_gain) shaders(red, white) );
//sh = MixShader( mix(quantized_gain) shaders(red, white) );
//
//sh = MixShader( mix(pos_noise) shaders(red, white) );
//sh = MixShader( mix(quantized_noise) shaders(red, white) );
//
//sh = MixShader( mix(quantized_s) shaders(red, white) );
sh = MixShader( mix(s_scalar) shaders(red, white) );

Group thing = Group( shader(sh) tesselation(2, 2) draw(yes) clip(no) shadow(cast(no) receive(no)) );

float east_west   = halfScreen;
float north_south = halfScreen;

Matrix4x3 ro;

ro.RotY(radians(0));
PushTransformation(ro);

ro.RotX(radians(90));
PushTransformation(ro);

RManRectangle( group(thing) west(-east_west) east(east_west) south(-north_south) north(north_south) height(0) )

PopTransformation();

PopTransformation();

