//::::::::::::::::::::::::::: dot_deluxe.dsl ::::::::::::::::::::::::::
include(../CoolColors.dsl);

float frame_count = (<Frame>) + 1;
float percent_done = frame_count / 600;

float orbitAngle = percent_done * 360;

float xres = 320;
float yres = 240;

rayscene(

echo(8)
recursion(2) 
eyeRayEpsilon(1/100) 
threshold(1/256)

resolution(xres, yres)
crop(xrange(0, xres-1) yrange(0, yres-1))

pixel(1/1)

voxelization( disabled )
//voxelization( parent(automatic) nesting(2) )

ior(air)

ambient( white )

background(white)
)

float cameraDistance	= 50;
float orbitRadius		= 15;

Matrix3x2 trans;
trans.Trans(orbitRadius, 0);

Matrix3x2 rote;
rote.Rote( radians(orbitAngle) );

Point2D a;
Point2D b;
Point2D c;
Point2D d;
Point2D target2D;
Point2D camera2D;

// target
a.Set(0, 0);

// camera
b.Set(0, -cameraDistance);

c = b * trans;
d = c * rote;
camera2D = d;

b = a * trans;
c = b * rote;
target2D = c;

float tx = target2D.x;
float ty = target2D.y;

float cx = camera2D.x;
float cy = camera2D.y;

float halfScreen = 10;

camera(
    fovy(2*degrees(atan2(halfScreen, cameraDistance)))
    near_far(.001, 1000)
    imageplane(cameraDistance)
    location(cx, cy, 0)
    up(0, 0, 1)
    target(tx, ty, 0)
)

float unused = SeedRandom(173);

Shader show_s  	= UserShader( name(ShowThatShader) Show("S") );
Shader show_t	= UserShader( name(ShowThatShader) Show("T") );

float _sfreq = 4*4;
float _tfreq = 3*4;

Scalar _noise	= Noise3D(scale(4/10));
Scalar _pnoise	= (_noise + 1.) / 2.;

Scalar _q	= UserScalar( name(QuantizedScalar) sfreq(_sfreq) tfreq(_tfreq) scalar(_pnoise));

Scalar _soffset	= UserScalar( name(QuantizedScalar) sfreq(_sfreq) tfreq(_tfreq) scalar(_noise/7) xoffset(17) yoffset(-31) zoffset(11));
Scalar _toffset	= UserScalar( name(QuantizedScalar) sfreq(_sfreq) tfreq(_tfreq) scalar(_noise/7) xoffset(23) yoffset(-13) zoffset(31));

// kid color pallete
Shader _pink	= ConstantShader(254, 78,142)/255;
Shader _blue	= ConstantShader( 72,175,254)/255;
Shader _orange	= ConstantShader(255,119,  1)/255;
Shader _green	= ConstantShader( 96,214,  0)/255;

float _radius	= (1/(2 * _sfreq))/0.50;
Shader _dot		= 
UserShader( 
//
name(DotDeluxeShader) 
//
color(_green) 
color(_pink) 
color(_blue) 
color(_orange) 
//
background(white) 
//
sfreq(_sfreq) tfreq(_tfreq) 
//
opacity(3/4) 
//
radius(_radius) 
fuzz(0.0125) 
//
aspectRatio(_sfreq/_tfreq)
//
sOffset(_soffset) tOffset(_toffset)
);

Shader sh = _dot;

Group thing = Group( shader(sh) tesselation(2, 2) draw(yes) clip(no) shadow(cast(no) receive(no)) );

float east_west		= (halfScreen * (xres/yres));
float north_south	= (halfScreen              );

Matrix4x3 rx;
Matrix4x3 ry;
Matrix4x3 rz;
Matrix4x3 tr;

// Translate rectangle to a location on the circle of orbit. The rectangle will marching
// along this circle and be rendered at each location.
rz.RotZ(radians(orbitAngle));

// Translate rectangle to a location on the circle of orbit. The rectangle will marching
// along this circle and be rendered at each location.
tr.Trans(orbitRadius, 0, 0);

// orient the rectangle out of it's default position (lying in the xy plane) to lye in the xz plane.
rx.RotX(radians(90));

PushTransformation(rz);
PushTransformation(tr);
PushTransformation(rx);
RManRectangle( group(thing) west(-east_west) east(east_west) south(-north_south) north(north_south) height(0) )
PopTransformation();
PopTransformation();
PopTransformation();


