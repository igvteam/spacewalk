#include <string.h>
#include "Utils.h"
#include "Symbol.h"
#include "Triangle.h"
#include "RayScene.h"
#include "Noise.h"
#include "DougShader.h"
#include "DougScalar.h"

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
QuantizeSTShader::QuantizeSTShader():UserShader() {

	_sPixels = 16.0;
	_tPixels = 16.0;

	_doRadial = DtFalse;

    Symbol* sym = new Symbol("QuantizeSTShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

QuantizeSTShader::~QuantizeSTShader(){;}

UserShader* QuantizeSTShader::Clone(){
    return (UserShader*)new QuantizeSTShader();
}

void QuantizeSTShader::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){

		Symbol* sym = (Symbol*)params.fSymTab[i];

		if (!strcmp("sPixels", sym->Name())){
			_sPixels = floorf(sym->flt);
		}

		if (!strcmp("tPixels", sym->Name())){
			_tPixels = floorf(sym->flt);
		}

		if (!strcmp("radial", sym->Name())){

			if (!strcmp(sym->St, "yes")) {
				_doRadial = DtTrue;
			} else {
				_doRadial = DtFalse;
			}

		}

    }

}

void QuantizeSTShader::Shade() {

	if (DtFalse == _doRadial) {

		float ss = floorf(_neighborhood.getS() * RayScene::XRes);
		ss = floor(ss /_sPixels);
		ss *= _sPixels;
		ss /= RayScene::XRes;

		float tt = floorf(_neighborhood.getT() * RayScene::YRes);
		tt = floor(tt /_tPixels);
		tt *= _tPixels;
		tt /= RayScene::YRes;

	    _neighborhood.SetST(ss, tt);

		return;
	}

	float halfXRes = RayScene::XRes / 2.0;
	float halfYRes = RayScene::YRes / 2.0;

	float x = _neighborhood.getS() * RayScene::XRes;
	float y = _neighborhood.getT() * RayScene::YRes;

	float xx = x - halfXRes;
	float yy = y - halfYRes;

	float r = sqrt(xx * xx + yy * yy);

	if (DtFudge > fabsf(r)) {

	    return;

	} // if (DtFudge > fabsf(r))


	// -PI to PI
	float rad = atan2(yy, xx);

	float theta = Util::Degrees(rad);

	// 0 to 360
	if (theta < 0.0) theta += 360.0;



	r = floor(r /_sPixels);
	r *= _sPixels;

	theta = floor(theta /_tPixels);
	theta *= _tPixels;


	float s = ((r * cos(Util::Radians(theta))) + halfXRes) / RayScene::XRes;
	float t = ((r * sin(Util::Radians(theta))) + halfYRes) / RayScene::YRes;

	s = Util::Clamp(s, 0, 1);
	t = Util::Clamp(t, 0, 1);

    _neighborhood.SetST(s, t);


}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
ShadowShader::ShadowShader():UserShader() {

	_inShadow	= new ConstantShader(0,0,0);
	_inLight	= new ConstantShader(1,1,1);

    Symbol* sym = new Symbol("ShadowShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

ShadowShader::~ShadowShader(){;}

UserShader* ShadowShader::Clone(){
    return (UserShader*)new ShadowShader();
}

void ShadowShader::PropagateNeighborhood(Neighborhood& neigh) {

    _neighborhood = neigh;
    _inShadow->PropagateNeighborhood(_neighborhood);
    _inLight->PropagateNeighborhood(_neighborhood);
}

void ShadowShader::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("light", sym->Name())){
		    _inShadow = sym->Sh;
		}
	
		if (!strcmp("shadow", sym->Name())){
		    _inLight = sym->Sh;
		}
	
    }
  
}

void ShadowShader::Shade() {

    _neighborhood._color.Set(0., 0., 0.);
  
	for (int i=0; i < RayScene::Scene->_lights.getArrayLength(); i++) {
	    
		Light* light = (Light*)(RayScene::Scene->_lights[i]);
	    
		if (!light->IsOn()) { 
		    continue; 
		}
	    
		_neighborhood.SetToLight(light->GetDirection(_neighborhood));
	
		float dotProduct = Vector3D::Dot(_neighborhood._toLight, _neighborhood._shadeNormal);
		
		if (dotProduct < 0.) { 
		    continue; 
		}
	    
		if (_neighborhood.getGeometry()->getRenderable()->_flags.isSet(Renderable::ReceiveShadow)){
	      
		    if (light->IsShadowSeeking()){
			
				if (!light->IsSeen(_neighborhood)) {
				    continue;
				}
			
		    } // if(light->ShadowSeeking)
		    
		} // if (ReceiveShadow)
	
		_neighborhood._color += light->Intensity(_neighborhood);
		
    } // for all lights

	_neighborhood._color.Clamp();
}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
DotDeluxeShader::DotDeluxeShader():UserShader() {
	_sfreq				= 1.0;
	_tfreq				= 1.0;
	
	_diskOpacity		= 1.0;
	_diskShader			= NULL;
	_diskRadius			= 0.350;
	_fuzz				= 0.025;

	_aspectRatio		= 1.0;
		
	_indices		= NULL;
	
	_sOffset			= NULL;
	_tOffset			= NULL;
	
	_backgroundShader	= NULL;


    Symbol* sym = new Symbol("DotDeluxeShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

DotDeluxeShader::~DotDeluxeShader(){;}

UserShader* DotDeluxeShader::Clone(){
    return (UserShader*)new DotDeluxeShader();
}

void DotDeluxeShader::PropagateNeighborhood(Neighborhood& neigh) {

    _neighborhood = neigh;
    
    if (_diskShader) _diskShader->PropagateNeighborhood(_neighborhood);
    
    _backgroundShader->PropagateNeighborhood(_neighborhood);
    
	if (_sOffset) _sOffset->PropagateNeighborhood(_neighborhood);
	if (_tOffset) _tOffset->PropagateNeighborhood(_neighborhood);
}

void DotDeluxeShader::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("color", sym->Name())){
		    _colors.append((void*)sym->Sh);
		}
	
		if (!strcmp("sOffset", sym->Name())){
		    _sOffset = sym->Sc;
		}
	
		if (!strcmp("tOffset", sym->Name())){
		    _tOffset = sym->Sc;
		}
	
		if (!strcmp("opacity", sym->Name())){
		    _diskOpacity = sym->flt;
		}
	
		if (!strcmp("shader", sym->Name())){
		    _diskShader = sym->Sh;
		}
	
		if (!strcmp("background", sym->Name())){
		    _backgroundShader = sym->Sh;
		}
	
		if (!strcmp("aspectRatio", sym->Name())){
		    _aspectRatio = sym->flt;
		}
	
		if (!strcmp("radius", sym->Name())){
		    _diskRadius = sym->flt;
		}
	
		if (!strcmp("fuzz", sym->Name())){
		    _fuzz = sym->flt;
		}
	
		if (!strcmp("sfreq", sym->Name())){
		    _sfreq = sym->flt;
		}
	
		if (!strcmp("tfreq", sym->Name())){
		    _tfreq = sym->flt;
		}
	
    }
    
    if (!_colors.isEmpty()) {
    	
	 	int ncols = int(_sfreq);
		int nrows = int(_tfreq);
		
		_indices = new int[ncols * nrows];
		
		int ncolors = _colors.getArrayLength();
		--ncolors;
		
		for (int i = 0; i < ncols * nrows; i++) {
			_indices[i] = Util::RandomRange(0, ncolors);
		}
		
    } // if (!_randomColorList.isEmpty())
    
}

void DotDeluxeShader::Shade() {

	int ncols = int(_sfreq);
	int nrows = int(_tfreq);

	Point2D location;	
	
	if (_aspectRatio > 1.0) {
		location.Set(_neighborhood.getS() * _aspectRatio, _neighborhood.getT());
	} else {
		location.Set(_neighborhood.getS(), _neighborhood.getT()/_aspectRatio);
	}
	
	if (_colors.isEmpty()) {	
		_diskShader->Shade();
	}
	
	_backgroundShader->Shade();
	_neighborhood._color = _backgroundShader->_neighborhood._color;
	
	int i = 0;
	for (int r = 0; r < nrows; r++) {
		
		for (int c = 0; c < ncols; c++) {
			
			// which tile.
			double s = (double(c)/_sfreq);
			double t = (double(r)/_tfreq);
			
			// the tile center
			s += (1.0/(2.0 * _sfreq));
			t += (1.0/(2.0 * _tfreq));
			
			QuantizedScalar* q = NULL;
			
			q = (QuantizedScalar*)_sOffset;
			s += q->Evaluate(c, r);
			
			q = (QuantizedScalar*)_tOffset;
			t += q->Evaluate(c, r);
			
			if (_aspectRatio > 1.0) {
				s *= _aspectRatio;
			} else {
				t /= _aspectRatio;
			}
			
			Point2D diskCenter(s, t);
			
			double distance = Point2D::Distance(location, diskCenter);

			double opacity = 1.0 - Util::SmoothStep(_diskRadius - _fuzz, _diskRadius, distance);
			opacity *= _diskOpacity;
		
			if (!_colors.isEmpty()) {	
				
				int ii = _indices[ i ];
				
				_diskShader = (Shader*)_colors[ ii ];
				_diskShader->PropagateNeighborhood(_neighborhood);
				_diskShader->Shade();
				
			} // if (!_randomColorList.isEmpty())
			
			_neighborhood._color = RGBTriple::Blend(_neighborhood._color, _diskShader->_neighborhood._color, opacity);
			
			++i;
				
		} // for(c)
		
	} // for(r)

}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
DotShader::DotShader():UserShader() {
	_sfreq				= 1.0;
	_tfreq				= 1.0;

	_diskShader			= NULL;
	_diskRadius			= 0.350;
	_fuzz				= 0.025;

	_backgroundShader	= NULL;

    Symbol* sym = new Symbol("DotShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

DotShader::~DotShader(){;}

UserShader* DotShader::Clone(){
    return (UserShader*)new DotShader();
}

void DotShader::PropagateNeighborhood(Neighborhood& neigh) {

    _neighborhood = neigh;
    
    _diskShader->PropagateNeighborhood(_neighborhood);
    
    _backgroundShader->PropagateNeighborhood(_neighborhood);
}

void DotShader::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("shader", sym->Name())){
		    _diskShader = sym->Sh;
		}
	
		if (!strcmp("background", sym->Name())){
		    _backgroundShader = sym->Sh;
		}
	
		if (!strcmp("radius", sym->Name())){
		    _diskRadius = sym->flt;
		}
	
		if (!strcmp("fuzz", sym->Name())){
		    _fuzz = sym->flt;
		}
	
		if (!strcmp("sfreq", sym->Name())){
		    _sfreq = sym->flt;
		}
	
		if (!strcmp("tfreq", sym->Name())){
		    _tfreq = sym->flt;
		}
	
    }
  
}

void DotShader::Shade() {

	double ss = Util::Repeat(_neighborhood.getS(), _sfreq);
	double tt = Util::Repeat(_neighborhood.getT(), _tfreq);
	
	Point2D location(ss, tt);	
	Point2D diskCenter(0.5, 0.5);

	double distance = Point2D::Distance(location, diskCenter);
	
	double opacity = 1.0 - Util::SmoothStep(_diskRadius - _fuzz, _diskRadius, distance);
	
	_diskShader->Shade();
	_backgroundShader->Shade();
	_neighborhood._color = _backgroundShader->_neighborhood._color * (1.0 - opacity) + _diskShader->_neighborhood._color * opacity;

}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
RGB2LabShader::RGB2LabShader():UserShader() {

    mShader = 0;

    Symbol* sym = new Symbol("RGB2LabShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

RGB2LabShader::~RGB2LabShader(){;}

UserShader* RGB2LabShader::Clone(){
    return (UserShader*)new RGB2LabShader();
}

void RGB2LabShader::PropagateNeighborhood(Neighborhood& neigh) {

    _neighborhood = neigh;
    mShader->PropagateNeighborhood(_neighborhood);
}

void RGB2LabShader::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("sh", sym->Name())){
		    mShader = sym->Sh;
		}
	
    }
  
}

void RGB2LabShader::Shade() {

    mShader->Shade();

    float r = mShader->_neighborhood._color.r();
    float g = mShader->_neighborhood._color.g();
    float b = mShader->_neighborhood._color.b();

    // :::::::::::::::::::::::::::::::::: RGB to Lab ::::::::::::::::::::::::::::::::::
    float X = (0.412453 * r + 0.357580 * g + 0.180423 * b) / 0.950456;
    float Y = (0.212671 * r + 0.715160 * g + 0.072169 * b) / 1.000000;
    float Z = (0.019334 * r + 0.119193 * g + 0.950227 * b) / 1.088754;

    float CIE_L, CIE_a, CIE_b;

    float fY;
    if (Y > 0.008856) {

	fY = pow(Y, 1.0/3.0);
	CIE_L = 116.0 * fY - 16.0 + 0.5;
    } else {

	fY = 7.787 * Y + 16.0 / 116.0;
	CIE_L = 903.3 * Y;
    }
    
    float _x;
    if (X > 0.008856) _x = pow(X, 1.0 / 3.0);
    else _x = 7.787 * X + 16.0 / 116.0;

    float fZ;
    if (Z > 0.008856) fZ = pow(Z, 1.0 / 3.0);
    else fZ = 7.787 * Z + 16.0 / 116.0;

    CIE_a = 500.0 * (_x - fY);
    CIE_b = 200.0 * (fY - fZ);

    fprintf(stderr, "RGB(%g, %g, %g) Lab(%g, %g, %g)\n", r, g, b, CIE_L, CIE_a, CIE_b);

    // !!!!!!!!!!!!!!!!!! darken the image !!!!!!!!!!!!!!!!!!
    // !!!!!!!!!!!!!!!!!! darken the image !!!!!!!!!!!!!!!!!!
    CIE_L *= .75;
    
    //float luminence = CIE_L / 100.0;
    //_neighborhood.fColor.Set(luminence, luminence, luminence);

    // :::::::::::::::::::::::::::::::::: Lab to RGB ::::::::::::::::::::::::::::::::::
    fY = pow((CIE_L + 16.0) / 116.0, 3.0);
    if (fY < 0.008856) fY = CIE_L / 903.3;
    Y = fY;

    if (fY > 0.008856) fY = pow(fY, 1.0/3.0);
    else fY = 7.787 * fY + 16.0/116.0;

    _x = CIE_a / 500.0 + fY;      
    if (_x > 0.206893)	X = pow(_x, 3.0);
    else X = (_x - 16.0/116.0) / 7.787;
 
    fZ = fY - CIE_b /200.0;      
    if (fZ > 0.206893) Z = pow(fZ, 3.0);
    else Z = (fZ - 16.0/116.0) / 7.787;

    X *= 0.950456;
    Y *= 1.000000;
    Z *= 1.088754;

    r =  3.240479 * X - 1.537150 * Y - 0.498535 * Z;
    g = -0.969256 * X + 1.875992 * Y + 0.041556 * Z;
    b =  0.055648 * X - 0.204043 * Y + 1.057311 * Z;

    _neighborhood._color.Set(r, g, b);
}

//::::::::::::::::::::::::::::::::::::::::::::::::::::
ShowThatShader::ShowThatShader():UserShader() {

    Symbol* sym = new Symbol("ShowThatShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

ShowThatShader::~ShowThatShader(){;}

UserShader* ShowThatShader::Clone(){
    return (UserShader*)new ShowThatShader();
}

void ShowThatShader::Set(SymbolTable& params) {
    
    for (int i=0; i < params.fSymTab.getArrayLength(); i++){

		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("Show", sym->Name())){
		    sprintf(fShow, "%s", sym->St);
		}
	
    }

}

void ShowThatShader::Shade() {

    if (!strcmp(fShow, "compare_n_dot_toeye_with_fn_dot_toeye")){

		Vector3D n;
		n = _neighborhood._surfaceNormal;
		n.Normalize();

		Vector3D fn;
		fn = _neighborhood._facetNormal;
		
		float  n_dot_toeye = Vector3D::Dot( n, _neighborhood._ray._direction);
		float fn_dot_toeye = Vector3D::Dot(fn, _neighborhood._ray._direction);
		
		float value = fabs(n_dot_toeye - fn_dot_toeye);
		
		_neighborhood._color.Set(value, value, value);
	
//		if (value > .5) {
//			_neighborhood.fColor.Set(1.0, 0.0, 0.0);
//		} else {
//			_neighborhood.fColor.Set(0.0, 1.0, 0.0);
//		}
	
		return;
    }

    if (!strcmp(fShow, "facetnormal_dot_normal")){

		Vector3D n;
		n = _neighborhood._surfaceNormal;
		n.Normalize();

		Vector3D fn;
		fn = _neighborhood._facetNormal;
		fn.Normalize();
		
		float dp = Vector3D::Dot(fn, n);
	
		if (dp < 0.) {
			_neighborhood._color.Set(1.0, 0.0, 0.0);
		} else {
			_neighborhood._color.Set(0.0, 1.0, 0.0);
		}
		
		return;
    }

    if (!strcmp(fShow, "normal_dot_tolight")){

		Vector3D toLight;
		toLight.Set(-0.577350259, -0.577350259, 0.577350259);

		Vector3D n;
		n = _neighborhood._surfaceNormal;
		n.Normalize();
	
		float dp = Vector3D::Dot(n, toLight);
	
		if (dp < 0.) {
			_neighborhood._color.Set(1.0, 0.0, 0.0);
		} else {
			_neighborhood._color.Set(0.0, 1.0, 0.0);
		}
		
		return;
    }

    if (!strcmp(fShow, "facetnormal_dot_tolight")){

		Vector3D toLight;
		toLight.Set(-0.577350259, -0.577350259, 0.577350259);
	
		float dp = Vector3D::Dot(_neighborhood._facetNormal, toLight);
	
		if (dp < 0.) {
			_neighborhood._color.Set(1.0, 0.0, 0.0);
		} else {
			_neighborhood._color.Set(0.0, 1.0, 0.0);
		}
	
		return;
    }

    if (!strcmp(fShow, "shadenormal_dot_tolight")){

		Vector3D toLight;
		toLight.Set(-0.577350259, -0.577350259, 0.577350259);
	
		float dp = Vector3D::Dot(_neighborhood._shadeNormal, toLight);
	
		if (dp < 0.) {
			_neighborhood._color.Set(1.0, 0.0, 0.0);
		} else {
			_neighborhood._color.Set(0.0, 1.0, 0.0);
		}
	
		return;
    }

    if (!strcmp(fShow, "shadenormal_dot_toeye")){
		
		Vector3D toEye;
		toEye = -_neighborhood._ray._direction;
		
		float dp = Vector3D::Dot(_neighborhood._shadeNormal, toEye);
	
		//float dp = Vector3D::Dot(_neighborhood._shadeNormal, _neighborhood._ray._direction);
	
		if (dp < 0.) {
		    //_neighborhood.fColor.Set(fabs(dp), 0.0, 0.0);
			_neighborhood._color.Set(1.0, 0.0, 0.0);
		} else {
		    //_neighborhood.fColor.Set(0.0, dp, 0.0);
			_neighborhood._color.Set(0.0, 1.0, 0.0);
		}
	
		return;
    }

    if (!strcmp(fShow, "normal_dot_toeye")){
	
		Vector3D n;
		n = _neighborhood._surfaceNormal;
		n.Normalize();
		
		Vector3D toEye;
		toEye = -_neighborhood._ray._direction;
		
		float dp = Vector3D::Dot(n, toEye);
	
		if (dp < 0.) {
			_neighborhood._color.Set(1.0, 0.0, 0.0);
		} else {
			_neighborhood._color.Set(0.0, 1.0, 0.0);
		}
	
		return;
    }

    if (!strcmp(fShow, "facetnormal_dot_toeye")){
	
		Vector3D n;
		n = _neighborhood._facetNormal;
		n.Normalize();
		
		Vector3D toEye;
		toEye = -_neighborhood._ray._direction;
		
		float dp = Vector3D::Dot(n, toEye);
	
		if (dp < 0.) {
			_neighborhood._color.Set(1.0, 0.0, 0.0);
		} else {
			_neighborhood._color.Set(0.0, 1.0, 0.0);
		}
	
		return;
		
    }

    // show surface u v params.
    if (!strcmp(fShow, "UV")){
		_neighborhood._color.Set(_neighborhood.getU(), _neighborhood.getV(), 0.);
		return;
    }

    if (!strcmp(fShow, "U")){
		_neighborhood._color.Set(_neighborhood.getU(), 0., 0.);
		return;
    }

    if (!strcmp(fShow, "V")){
		_neighborhood._color.Set(0., _neighborhood.getV(), 0.);
		return;
    }

    // show shader s t params.
    if (!strcmp(fShow, "ST")){
		_neighborhood._color.Set(_neighborhood._s, _neighborhood._t, 0.);
		return;
    }

    if (!strcmp(fShow, "S")){
		_neighborhood._color.Set(_neighborhood._s, 0., 0.);
		return;
    }

    if (!strcmp(fShow, "T")){
		_neighborhood._color.Set(0., _neighborhood._t, 0.);
		return;
    }

}

//::::::::::::::::::::::::::::::::::::::::::::::::::::
ShowUVSpaceJacobianShader::ShowUVSpaceJacobianShader():UserShader() {
  
    fAccumulateXYZ = fAccumulateUV = 0;

    Symbol* sym = new Symbol("ShowUVSpaceJacobianShader", Symbol::UserShaderType);
    sym->Us = this;
    SymbolTable::yySymbolTable->Insert(sym);
}

ShowUVSpaceJacobianShader::~ShowUVSpaceJacobianShader(){;}

UserShader* ShowUVSpaceJacobianShader::Clone(){
    return (UserShader*)new ShowUVSpaceJacobianShader();
}

void ShowUVSpaceJacobianShader::Set(SymbolTable& params) {
  
    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("doShade", sym->Name())){
	
		} else if (!strcmp("doComputeRange", sym->Name())){
	
		} else if (!strcmp("theMinimum", sym->Name())){
	
		} else if (!strcmp("theMaximum", sym->Name())){
	
		}
	
    }

}

void ShowUVSpaceJacobianShader::Shade() {

    _neighborhood.SetUVSpaceJacobian();
    _neighborhood.SetUVSpaceJacobianBBox();
	
    fprintf(stderr, "::::::::::::::::::::::::: pixel: %4d %4d :::::::::::::::::::::::::\n", 
	    RayScene::PixelX, RayScene::PixelY);

    fprintf(stderr, "Pu: %3.3g %3.3g %3.3g\n",
	    DtZero(0.0001, _neighborhood._tangentU.x()),
	    DtZero(0.0001, _neighborhood._tangentU.y()),
	    DtZero(0.0001, _neighborhood._tangentU.z()));

    fprintf(stderr, "Pv: %3.3g %3.3g %3.3g\n",
	    DtZero(0.0001, _neighborhood._tangentV.x()),
	    DtZero(0.0001, _neighborhood._tangentV.y()),
	    DtZero(0.0001, _neighborhood._tangentV.z()));

    fprintf(stderr, "Sx: %3.3g %3.3g %3.3g\n",
	    DtZero(0.0001, _neighborhood._screenSpaceXIncrement.x()),
	    DtZero(0.0001, _neighborhood._screenSpaceXIncrement.y()),
	    DtZero(0.0001, _neighborhood._screenSpaceXIncrement.z()));

    fprintf(stderr, "Sy: %3.3g %3.3g %3.3g\n",
	    DtZero(0.0001, _neighborhood._screenSpaceYIncrement.x()),
	    DtZero(0.0001, _neighborhood._screenSpaceYIncrement.y()),
	    DtZero(0.0001, _neighborhood._screenSpaceYIncrement.z()));

    fprintf(stderr, "Wx: %3.3g %3.3g %3.3g\n",
	    DtZero(0.0001, _neighborhood._worldSpaceXIncrement.x()),
	    DtZero(0.0001, _neighborhood._worldSpaceXIncrement.y()),
	    DtZero(0.0001, _neighborhood._worldSpaceXIncrement.z()));

    fprintf(stderr, "Wy: %3.3g %3.3g %3.3g\n",
	    DtZero(0.0001, _neighborhood._worldSpaceYIncrement.x()),
	    DtZero(0.0001, _neighborhood._worldSpaceYIncrement.y()),
	    DtZero(0.0001, _neighborhood._worldSpaceYIncrement.z()));

    fprintf(stderr, "uv space jacobian u: %3.3g %3.3g\n",
	    DtZero(0.0001, _neighborhood.fUVSpaceJacobian[0][0]),
	    DtZero(0.0001, _neighborhood.fUVSpaceJacobian[0][1]));

    fprintf(stderr, "uv space jacobian v: %3.3g %3.3g\n",
	    DtZero(0.0001, _neighborhood.fUVSpaceJacobian[1][0]),
	    DtZero(0.0001, _neighborhood.fUVSpaceJacobian[1][1]));

    fprintf(stderr, "u v: %3.3g %3.3g\n", _neighborhood.getU(),  _neighborhood.getV());

    fprintf(stderr, "uv space jacobian bbox: %3.3g %3.3g %3.3g %3.3g\n",
	    DtZero(0.0001, _neighborhood.fUVSpaceJacobianBBox.x0()),
	    DtZero(0.0001, _neighborhood.fUVSpaceJacobianBBox.y0()),
	    DtZero(0.0001, _neighborhood.fUVSpaceJacobianBBox.x1()),
	    DtZero(0.0001, _neighborhood.fUVSpaceJacobianBBox.y1()));

    fprintf(stderr, "ray parameter: %3.3g\n",DtZero(0.0001, _neighborhood._intersectionParameter.x()));

    fAccumulateXYZ += 2. * Vector3D::Norm(_neighborhood._worldSpaceYIncrement);
    fAccumulateUV  += 2. * sqrt(
	_neighborhood.fUVSpaceJacobian[1][0] * _neighborhood.fUVSpaceJacobian[1][0] +
	_neighborhood.fUVSpaceJacobian[1][1] * _neighborhood.fUVSpaceJacobian[1][1]);

    fprintf(stderr, "accumulation xyz: %3.3g\n", fAccumulateXYZ);
    fprintf(stderr, "accumulation  uv: %3.3g\n", fAccumulateUV);

}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
CheckShader::CheckShader():UserShader() {

    _sFrequency = 1;
    _tFrequency = 1;

    Symbol* sym = new Symbol("CheckShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

CheckShader::~CheckShader(){;}

UserShader* CheckShader::Clone(){
    return (UserShader*)new CheckShader();
}

void CheckShader::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
		
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("sfreq", sym->Name())){
		    _sFrequency = sym->flt;
		}
	
		if (!strcmp("tfreq", sym->Name())){
		    _tFrequency = sym->flt;
		}
	
		if (!strcmp("shader", sym->Name())){
		    _shaders.append((void*)sym->Sh);
		}
	
		if (!strcmp("theSFreq", sym->Name())){
		    _sFrequency = sym->flt;
		}
	
		if (!strcmp("theTFreq", sym->Name())){
		    _tFrequency = sym->flt;
		}
	
		if (!strcmp("theColor", sym->Name())){
		    _shaders.append((void*)sym->Sh);
		}
	
    }  

	
}

void CheckShader::Shade() {
    
    //
    // The index is setup so that a rectangle with a check pattern
    // that is sfreq = 3 and tfreq = 2 will result in the following
    // ordering of the list of shaders passed to CheckShader as params
    // where 0 is shader0, 1 is shader1, etc.:
    //
    //     3  4  5
    //     0  1  2
    //
    //  (t)
    //   |
    //   |
    //   |
    //   |________(s)
    //

    int col = Util::WhichTile(_neighborhood.getS(), _sFrequency);
    int row = Util::WhichTile(_neighborhood.getT(), _tFrequency);

	long index = row * long(_sFrequency) + col;
    index %= (_shaders.getArrayLength());

    Shader* sh = (Shader*) _shaders[index];
    
    float s	= Util::Repeat(_neighborhood.getS(), _sFrequency);
    float t	= Util::Repeat(_neighborhood.getT(), _tFrequency);
	_neighborhood.SetST(s, t);
    sh->PropagateNeighborhood(_neighborhood);
    sh->Shade();

    _neighborhood._color = sh->_neighborhood._color;

}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
InOutShader::InOutShader():UserShader() {
  
    fIn=0;
    fOut=0;

    Symbol* sym = new Symbol("InOutShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

InOutShader::~InOutShader(){;}

UserShader* InOutShader::Clone(){
    return (UserShader*)new InOutShader();
}

void InOutShader::Set(SymbolTable& params) {
  
    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol*	sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("theInside", sym->Name())){
		    fIn = sym->Sh;
		}
	
		if (!strcmp("theOutside", sym->Name())){
		    fOut = sym->Sh;
		}
	
    }
  
}

void InOutShader::Shade() {

	float dotproduct = Vector3D::Dot(_neighborhood._surfaceNormal, _neighborhood._ray._direction);
	
	if (dotproduct < 0.) {
	
		fOut->PropagateNeighborhood(_neighborhood);
		fOut->Shade();
		_neighborhood._color = fOut->_neighborhood._color;
    } else {
	
		fIn->PropagateNeighborhood(_neighborhood);
		fIn->Shade();
		_neighborhood._color = fIn->_neighborhood._color;
    }

}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
CylindricalShader::CylindricalShader():UserShader() {

    fShader = 0;

    Symbol* sym = new Symbol("CylindricalShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

CylindricalShader::~CylindricalShader(){;}

UserShader* CylindricalShader::Clone(){
    return (UserShader*)new CylindricalShader();
}

void CylindricalShader::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("theColor", sym->Name())){
		    fShader = sym->Sh;
		}
	
    }
  
}


void CylindricalShader::Shade() {


    Matrix4x3 m4x3;
    m4x3 = *(_neighborhood.getGeometry()->getRenderable()->_transform);
    m4x3.Invert();

    Point3D pt;
    pt = (_neighborhood._location) * m4x3;

    float cylU = Util::Degrees(DtPI + atan2(pt.y(), pt.x()))/360.;

    float cylV = (pt.z() + 1.)/2.;
  
    float oldU = _neighborhood.getU();
    float oldV = _neighborhood.getV();

    _neighborhood.SetUV(cylU, cylV);
    fShader->Shade();

    _neighborhood.SetUV(oldU, oldV);

}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

SphericalShader::SphericalShader():UserShader() {

    fShader = 0;

    Symbol* sym = new Symbol("SphericalShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

SphericalShader::~SphericalShader(){;}

UserShader* SphericalShader::Clone(){
    return (UserShader*)new SphericalShader();
}

void SphericalShader::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("theColor", sym->Name())){
		    fShader = sym->Sh;
		}
	
    }
  
}


void SphericalShader::Shade() {

    Vector3D sph;
    sph = _neighborhood._ray._direction;

    sph.ToSpherical();

    // rescale phi from (0 to 2*PI) to (0 to 1)
    float s = sph.z() / (2.*DtPI);

    // rescale theta from (0 to PI) to (0 to 1) and flip direction
    float t = 1. - (sph.y()/DtPI);

    fShader->PropagateNeighborhood(_neighborhood);
    fShader->_neighborhood.SetST(s, t);
    fShader->Shade();

}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
BackgroundShader::BackgroundShader():UserShader() {

    fShader = 0;

    Symbol* sym = new Symbol("BackgroundShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

BackgroundShader::~BackgroundShader(){;}

UserShader* BackgroundShader::Clone(){
    return (UserShader*)new BackgroundShader();
}

void BackgroundShader::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("theColor", sym->Name())){
		    fShader = sym->Sh;
		}
	
    }
  
}


void BackgroundShader::Shade() {

    fShader->PropagateNeighborhood(_neighborhood);

    float s = float(RayScene::PixelX) / RayScene::XRes;
	float t = float(RayScene::PixelY) / RayScene::YRes;
  
    fShader->_neighborhood.SetST(s, t);

    fShader->Shade();

}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
FacetShader::FacetShader():UserShader() {
	
    Symbol* sym = new Symbol("FacetShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

FacetShader::~FacetShader(){;}

UserShader* FacetShader::Clone(){ return (UserShader*)new FacetShader(); }

void FacetShader::Set(SymbolTable& params) {;}

void FacetShader::Shade() {
	
	_neighborhood.SetNormal(_neighborhood._facetNormal);
	
    if (Vector3D::Dot(_neighborhood._surfaceNormal, _neighborhood._ray._direction) > 0.) {

		_neighborhood.SetShadeNormal( -(_neighborhood._surfaceNormal) );
    } else {

		_neighborhood.SetShadeNormal( _neighborhood._surfaceNormal );
    }
    
	_neighborhood._shadeNormal.Normalize();
	
}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
BumpShader::BumpShader():UserShader() {

    _scalar		= NULL;
	_amplitude	= new ConstantScalar(1.0);

    Symbol* sym = new Symbol("BumpShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

BumpShader::~BumpShader(){;}

UserShader* BumpShader::Clone(){
    return (UserShader*)new BumpShader();
}

void BumpShader::PropagateNeighborhood(Neighborhood& neigh) {

    _neighborhood = neigh;
    _scalar->PropagateNeighborhood(_neighborhood);
    _amplitude->PropagateNeighborhood(_neighborhood);
}

void BumpShader::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("scalar", sym->Name())){
		    _scalar = sym->Sc;
		}
	
		if (!strcmp("amplitude", sym->Name())){
	
		    if (sym->SameType(Symbol::ScalarType)) {
				_amplitude = sym->Sc;
		    } else {
				_amplitude = new ConstantScalar(sym->flt);
		    }

		}
	
    }
  
}

void BumpShader::Shade() {

    _neighborhood.SetUVSpaceJacobian();
    _neighborhood.SetUVSpaceJacobianBBox();

	float _denom	= 2.0;
    float delta_xyz	= Util::Min(Vector3D::Norm(_neighborhood._worldSpaceXIncrement),Vector3D::Norm(_neighborhood._worldSpaceYIncrement)) / _denom;
 
	Point3D original_scalar_xyz;
	original_scalar_xyz = _neighborhood._location;

	Neighborhood probeNeighborhood;
	probeNeighborhood = _neighborhood;

	
	// - u
    probeNeighborhood.SetLocation(original_scalar_xyz - (delta_xyz * Vector3D::Normalize(probeNeighborhood._tangentU)));
	_scalar->PropagateNeighborhood(probeNeighborhood);
	
	Point3D locU0;
    locU0 = probeNeighborhood._location + ((_scalar->Evaluate()) * probeNeighborhood._shadeNormal);
	
	// + u
    probeNeighborhood.SetLocation(original_scalar_xyz + (delta_xyz * Vector3D::Normalize(probeNeighborhood._tangentU)));
	_scalar->PropagateNeighborhood(probeNeighborhood);
	
	Point3D locU1;
    locU1 = probeNeighborhood._location + ((_scalar->Evaluate()) * probeNeighborhood._shadeNormal);
	
	// - v
    probeNeighborhood.SetLocation(original_scalar_xyz - (delta_xyz * Vector3D::Normalize(probeNeighborhood._tangentV)));
	_scalar->PropagateNeighborhood(probeNeighborhood);
	
	Point3D locV0;
    locV0 = probeNeighborhood._location + ((_scalar->Evaluate()) * probeNeighborhood._shadeNormal);
	
	// + v
    probeNeighborhood.SetLocation(original_scalar_xyz + (delta_xyz * Vector3D::Normalize(probeNeighborhood._tangentV)));
	_scalar->PropagateNeighborhood(probeNeighborhood);
	
	Point3D locV1;
    locV1 = probeNeighborhood._location + ((_scalar->Evaluate()) * probeNeighborhood._shadeNormal);





	// new method 
//	Vector3D old_shade_normal;
//	old_shade_normal = _neighborhood._shadeNormal;
//
//	Vector3D bump_normal;
//	bump_normal = Vector3D::Normalize(Vector3D::Cross( Vector3D::Normalize(locU1 - locU0), Vector3D::Normalize(locV1 - locV0) ));
//    
//    float dot_product = Vector3D::Dot(_neighborhood._shadeNormal, bump_normal);
//    
//    float a_cos = Util::Degrees(acos(dot_product));
//    
//    float smoothness = 1.0 - Util::SmoothStep(45., 90., a_cos);
//
//	_neighborhood._shadeNormal.SetX(Util::Lirp(old_shade_normal.x(), bump_normal.x(), smoothness));
//	_neighborhood._shadeNormal.SetY(Util::Lirp(old_shade_normal.y(), bump_normal.y(), smoothness));
//	_neighborhood._shadeNormal.SetZ(Util::Lirp(old_shade_normal.z(), bump_normal.z(), smoothness));
 
 
    	
	// legacy method
//    _neighborhood.SetPartials(Vector3D::Normalize(locU1 - locU0), Vector3D::Normalize(locV1 - locV0));
//    _neighborhood.SetNormal( Vector3D::Cross( _neighborhood._tangentU, _neighborhood._tangentV ) );
//	
//    if (Vector3D::Dot(_neighborhood._surfaceNormal, _neighborhood._ray._direction) > 0.) _neighborhood._shadeNormal = -_neighborhood._surfaceNormal;
//    else _neighborhood._shadeNormal = _neighborhood._surfaceNormal;
 
 
    	
	// new new "delta" method
    _neighborhood.SetPartials(Vector3D::Normalize(locU1 - locU0), Vector3D::Normalize(locV1 - locV0));

    Vector3D delta;
    delta = Vector3D::Cross( _neighborhood._tangentU, _neighborhood._tangentV);
	
	Vector3D n;
	n = Vector3D::Normalize(_neighborhood._surfaceNormal + _amplitude->Evaluate() * delta);
	_neighborhood.SetNormal(n);
	
    if (Vector3D::Dot(_neighborhood._surfaceNormal, _neighborhood._ray._direction) > 0.) _neighborhood._shadeNormal = -_neighborhood._surfaceNormal;
    else _neighborhood._shadeNormal = _neighborhood._surfaceNormal;









    _neighborhood.ValidateShadeNormal();

}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
WiggleSTShader::WiggleSTShader():UserShader() {

 	_doMod			= DtTrue;
    mScalar			= NULL;
    mAttenuation	= NULL;

    mSXOffset = 1.7;
    mTXOffset = 5.3;

    mSYOffset = 3.9;
    mTYOffset = 7.5;

    mSZOffset = 3.1;
    mTZOffset = 5.7;

    Symbol* sym = new Symbol("WiggleSTShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

WiggleSTShader::~WiggleSTShader(){;}

UserShader* WiggleSTShader::Clone(){
    return (UserShader*)new WiggleSTShader();
}

void WiggleSTShader::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("scalar", sym->Name())){  mScalar = sym->Sc; }
	
		if (!strcmp("theScalar", sym->Name())){ mScalar = sym->Sc; }
	
		if (!strcmp("attenuation", sym->Name())){
	
		    if (sym->SameType(Symbol::ScalarType)) {
				mAttenuation = sym->Sc;
		    } else {
				mAttenuation = new ConstantScalar(sym->flt);
		    }
	
		}
	
		if (!strcmp("theAttenuation", sym->Name())){
	
		    if (sym->SameType(Symbol::ScalarType)) {
				mAttenuation = sym->Sc;
		    } else {
				mAttenuation = new ConstantScalar(sym->flt);
		    }
	
		}
	
		if (!strcmp("doMod", sym->Name())){
			if (!strcmp(sym->St, "yes")) { 
				_doMod = DtTrue;
			} else {
				_doMod = DtFalse;
			}
		}
	
		if (!strcmp("sx", sym->Name())){  mSXOffset = sym->flt; }
		if (!strcmp("sy", sym->Name())){  mSYOffset = sym->flt; }
		if (!strcmp("sz", sym->Name())){  mSZOffset = sym->flt; }
	
		if (!strcmp("tx", sym->Name())){  mTXOffset = sym->flt; }
		if (!strcmp("ty", sym->Name())){  mTYOffset = sym->flt; }
		if (!strcmp("tz", sym->Name())){  mTZOffset = sym->flt; }
	
		if (!strcmp("theSX", sym->Name())){  mSXOffset = sym->flt; }
		if (!strcmp("theSY", sym->Name())){  mSYOffset = sym->flt; }
		if (!strcmp("theSZ", sym->Name())){  mSZOffset = sym->flt; }
	
		if (!strcmp("theTX", sym->Name())){  mTXOffset = sym->flt; }
		if (!strcmp("theTY", sym->Name())){  mTYOffset = sym->flt; }
		if (!strcmp("theTZ", sym->Name())){  mTZOffset = sym->flt; }
	
    }
  
}

void WiggleSTShader::PropagateNeighborhood(Neighborhood& neigh) {

    _neighborhood = neigh;
    mAttenuation->PropagateNeighborhood(_neighborhood);
}

void WiggleSTShader::Shade() {

    Point3D xyz = _neighborhood._location;

    _neighborhood.SetLocation(xyz.x() + mSXOffset, xyz.y() + mSYOffset, xyz.z() + mSZOffset);
    mScalar->PropagateNeighborhood(_neighborhood);
    float s_offset = mScalar->Evaluate();

    _neighborhood.SetLocation(xyz.x() + mTXOffset, xyz.y() + mTYOffset, xyz.z() + mTZOffset);
    mScalar->PropagateNeighborhood(_neighborhood);
    float t_offset = mScalar->Evaluate();

    _neighborhood.SetLocation(xyz.x(), xyz.y(), xyz.z());

    float s = _neighborhood.getS();
    float t = _neighborhood.getT();

    float attenuation = mAttenuation->Evaluate();
    s += s_offset * attenuation;
    t += t_offset * attenuation;

	if (_doMod) {
	    s = Util::Mod(s, 1.);
	    t = Util::Mod(t, 1.);
	} else {
	    s = Util::Clamp(s, 0., 1.);
	    t = Util::Clamp(t, 0., 1.);
	}

    _neighborhood.SetST(s, t);

}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
ModSTShader::ModSTShader():UserShader() {

    mSFreq = 0;
    mTFreq = 0;

    Symbol* sym = new Symbol("ModSTShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

ModSTShader::~ModSTShader(){;}

UserShader* ModSTShader::Clone(){
    return (UserShader*)new ModSTShader();
}

void ModSTShader::Set(SymbolTable& params) {


    for (int i=0; i < params.fSymTab.getArrayLength(); i++){

	Symbol* sym = (Symbol*)params.fSymTab[i];

	if (!strcmp("theSFreq", sym->Name())){
	    mSFreq = sym->flt;
	}

	if (!strcmp("theTFreq", sym->Name())){
	    mTFreq = sym->flt;
	}

    }  

}

void ModSTShader::Shade() {

	
    float s = _neighborhood.getS();
    s = Util::Mod(s *mSFreq, 1.);

    float t = _neighborhood.getT();
    t = Util::Mod(t * mTFreq, 1.);

    _neighborhood.SetST(s, t);
}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
RadialDistortSTShader::RadialDistortSTShader():UserShader() {

	_power = 1./2.;
	_scale = 1./8.;

    Symbol* sym = new Symbol("RadialDistortSTShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

RadialDistortSTShader::~RadialDistortSTShader(){;}

UserShader* RadialDistortSTShader::Clone(){
    return (UserShader*)new RadialDistortSTShader();
}

void RadialDistortSTShader::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){

		Symbol* sym = (Symbol*)params.fSymTab[i];

		if (!strcmp("scale", sym->Name())){
		    _scale = sym->flt;
		}

		if (!strcmp("power", sym->Name())){
		    _power = sym->flt;
		}

    }

}

void RadialDistortSTShader::Shade() {

	float halfXRes = RayScene::XRes / 2.0;
	float halfYRes = RayScene::YRes / 2.0;

	float x = _neighborhood.getS() * RayScene::XRes;
	float y = _neighborhood.getT() * RayScene::YRes;

	float xx = x - halfXRes;
	float yy = y - halfYRes;

	float r = sqrt(xx * xx + yy * yy);

	if (DtFudge > fabsf(r)) {

		// Do nothing since the centroid of the image is the
		// still point on the image
	    return;

	}

	// -PI to PI
	float theta = atan2(yy, xx);

//	float deg = Util::Degrees(theta);
//
//	// 0 to 360
//	if (deg < 0.0) deg += 360.0;

//	float rr = r;

	float dimen = sqrt(RayScene::XRes * RayScene::XRes + RayScene::YRes * RayScene::YRes);
	float rr = powf((r * dimen * _scale), _power);

	float s = ((rr * cos(theta)) + halfXRes) / RayScene::XRes;
	float t = ((rr * sin(theta)) + halfYRes) / RayScene::YRes;

	s = Util::Clamp(s, 0, 1);
	t = Util::Clamp(t, 0, 1);

//	cerr << "s, t " << s << ", " << t  << std::endl;

    _neighborhood.SetST(s, t);

}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
SelectionShader::SelectionShader():UserShader() {

	_doSpline = DtFalse;
	
    Symbol* sym = new Symbol("SelectionShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

SelectionShader::~SelectionShader(){;}

UserShader* SelectionShader::Clone(){
    return (UserShader*)new SelectionShader();
}

void SelectionShader::Set(SymbolTable& params) {


    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("selector", sym->Name())){
		    mSelector = sym->Sc;
		}
	
		if (!strcmp("color", sym->Name())){
		    mColors.append((void*)sym->Sh);
		}
	
		if (!strcmp("spline", sym->Name())){
			if (!strcmp(sym->St, "yes")) { 
				_doSpline = DtTrue;
			} else {
				_doSpline = DtFalse;
			}
		}
	
    }  

}

void SelectionShader::PropagateNeighborhood(Neighborhood& neigh) {
    _neighborhood = neigh;
    mSelector->PropagateNeighborhood(_neighborhood);
}

void SelectionShader::Shade() {
	
	// 0 to 1
    float selection = Util::Clamp(mSelector->Evaluate(), 0., 1.0 - DtMinFloat); 
	
    selection *= float(mColors.getArrayLength());
    
	int index = int(floor(selection));
	if (index == mColors.getArrayLength()) {
		--index;
	}
		
    if (!_doSpline || mColors.getArrayLength() <= 4) {
	
	    Shader* sh = (Shader*) mColors[index];
	
	    sh->PropagateNeighborhood(_neighborhood);
	    sh->Shade();
	
	    _neighborhood._color = sh->_neighborhood._color;
    } else {
    	
     	RGBTriple colors[4];
     	
     	GrowableArray knots;
     	
     	int length = mColors.getArrayLength();
     	
    	int knot_index[4];
    	knot_index[0] = (index == 0) ? length - 1 : index - 1;
   		knot_index[1] = index;
  		knot_index[2] = (index + 1) % length;
  		knot_index[3] = (index + 2) % length;
    	    	
    	for (int i = 0; i < 4; i++) {
	 	
		    Shader* sh = (Shader*) mColors[knot_index[i]];
		
		    sh->PropagateNeighborhood(_neighborhood);
		    sh->Shade();
		
		    colors[i] = sh->_neighborhood._color;
		    knots.append((void*)&colors[i]);
	    		
    	}
    	
    	// param is 0 to 1
    	float param = selection - (floor(selection));
    	
     	_neighborhood._color = RGBTriple::Spline(param, knots);
     	
    }
    
}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
LightContributionShader::LightContributionShader():UserShader() {

    Symbol* sym = new Symbol("LightContributionShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

LightContributionShader::~LightContributionShader(){;}

UserShader* LightContributionShader::Clone(){
    return (UserShader*)new LightContributionShader();
}

void LightContributionShader::Set(SymbolTable& params) {;}

void LightContributionShader::Shade() {


    _neighborhood._color.Set(0., 0., 0.);
  
    Light* light=0;
    for (int i=0; i < RayScene::Scene->_lights.getArrayLength(); i++) {
    
	light = (Light*)(RayScene::Scene->_lights[i]);
    
	if (!light->IsOn()) { 
      
	    continue; 
	}
    
	_neighborhood.SetToLight(light->GetDirection(_neighborhood));

	float dotProduct = Vector3D::Dot(_neighborhood._toLight, _neighborhood._shadeNormal);
	if (dotProduct < 0.) { 
	    continue; 
	}
    
	if (_neighborhood.getGeometry()->getRenderable()->_flags.isSet(Renderable::ReceiveShadow)){
      
	    if (light->IsShadowSeeking()){
	
		DtBool isSeen;
		isSeen = light->IsSeen(_neighborhood);
	
		if (!isSeen) { 
		    continue;
		}
	
	    }
	}

	_neighborhood._color += light->Intensity(_neighborhood);
    }

    // average all the light contributions 
    float r, g, b;
    r = _neighborhood._color.r() / RayScene::Scene->_lights.getArrayLength();
    g = _neighborhood._color.g() / RayScene::Scene->_lights.getArrayLength();
    b = _neighborhood._color.b() / RayScene::Scene->_lights.getArrayLength();
    _neighborhood._color.Set(r, g, b);
}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
SolarizeShader::SolarizeShader():UserShader() {

    mShader = 0;

    Symbol* sym = new Symbol("SolarizeShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

SolarizeShader::~SolarizeShader(){;}

UserShader* SolarizeShader::Clone(){
    return (UserShader*)new SolarizeShader();
}

void SolarizeShader::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("sh", sym->Name())){
		    mShader = sym->Sh;
		}
	
    }
  
}

void SolarizeShader::PropagateNeighborhood(Neighborhood& neigh) {

    _neighborhood = neigh;
    mShader->PropagateNeighborhood(_neighborhood);
}

void SolarizeShader::Shade() {

    mShader->Shade();

    RGBTriple rgb;
    rgb = mShader->_neighborhood._color;

    if (mShader->_neighborhood._color.r() < .5){ rgb.SetR(1. - mShader->_neighborhood._color.r()); }
    if (mShader->_neighborhood._color.g() < .5){ rgb.SetG(1. - mShader->_neighborhood._color.g()); }
    if (mShader->_neighborhood._color.b() < .5){ rgb.SetB(1. - mShader->_neighborhood._color.b()); }

    _neighborhood._color = rgb;
  
}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
FunHouseMirrorSTShader::FunHouseMirrorSTShader():UserShader() {

    mSScale  = 1./6.;
    mSOffset = 1.5;

    mTScale  = 1./6.;
    mTOffset = 1.5;

    Symbol* sym = new Symbol("FunHouseMirrorSTShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

FunHouseMirrorSTShader::~FunHouseMirrorSTShader(){;}

UserShader* FunHouseMirrorSTShader::Clone(){
    return (UserShader*)new FunHouseMirrorSTShader();
}

void FunHouseMirrorSTShader::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("sOffset", sym->Name())){
		    mSOffset = sym->flt;
		}
	
		if (!strcmp("tOffset", sym->Name())){
		    mTOffset = sym->flt;
		}
	
		if (!strcmp("sScale", sym->Name())){
		    mSScale = sym->flt;
		}
	
		if (!strcmp("tScale", sym->Name())){
		    mTScale = sym->flt;
		}
	
    }
  
}

void FunHouseMirrorSTShader::Shade() {

    float maxX = (float)(RayScene::XRes - 1);
    float maxY = (float)(RayScene::YRes - 1);

    float pixelX = _neighborhood.getS() * maxX;
    float pixelY = _neighborhood.getT() * maxY;

    float scaleFactor = (3.0/5.0);
    float C1 =   1.15 * scaleFactor * 2;
    float C2 = 160.0 * scaleFactor / 2.0;
    float C3 =  89.0 * scaleFactor;


    pixelX = pixelX + sin(Util::Radians(C1 * pixelX)) * C2;
    pixelY = pixelY + sin(Util::Radians(     pixelY)) * (C3/C3);


//    pixelX = Util::Clamp(pixelX, 0.0, maxX);
//    pixelY = Util::Clamp(pixelY, 0.0, maxY);

    _neighborhood.SetST(pixelX/maxX, pixelY/maxY);



	return;




    float s = _neighborhood.getS();
    float t = _neighborhood.getT();

    s += cos((s - mSOffset) * (2. * DtPI)) * mSScale;
    t += cos((t - mTOffset) * (2. * DtPI)) * mTScale;

    s = Util::ReflectEdge(s, 0, 1);
    t = Util::ReflectEdge(t, 0, 1);

    _neighborhood.SetST(s, t);
  
}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
STTransformShader::STTransformShader():UserShader() {
    
    mWrapping = STTransformShader::mNoWrap;
    _transform.Unit();

    Symbol* sym = new Symbol("STTransformShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

STTransformShader::~STTransformShader(){;}

UserShader* STTransformShader::Clone(){
    return (UserShader*)new STTransformShader();
}

void STTransformShader::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("transform", sym->Name())){
		    _transform = sym->m3x2;
		}
	
		if (!strcmp("nowrap", sym->Name())){
		    mWrapping = STTransformShader::mNoWrap;
		}
	
		if (!strcmp("swrap", sym->Name())){
		    mWrapping |= STTransformShader::mSWrap;
		}
	
		if (!strcmp("twrap", sym->Name())){
		    mWrapping |= STTransformShader::mTWrap;
		}
	
		if (!strcmp("stwrap", sym->Name())){
		    mWrapping |= STTransformShader::mSWrap;
		    mWrapping |= STTransformShader::mTWrap;
		}
	
    }

  
}

void STTransformShader::Shade() {

    Point2D in;
    in.Set(_neighborhood.getS(), _neighborhood.getT());

    Point2D out;
    out = in * _transform;

    _neighborhood.SetST(out.x(), out.y());

    if(mWrapping == STTransformShader::mSWrap) {
		_neighborhood.SetST( Util::Mod(_neighborhood.getS(), 1.), out.y() );
    }

    if(mWrapping == STTransformShader::mTWrap) {
		_neighborhood.SetST( out.x(), Util::Mod(_neighborhood.getT(), 1.) );
    }

    if(mWrapping == (STTransformShader::mSWrap|STTransformShader::mTWrap)) {
		_neighborhood.SetST( Util::Mod(_neighborhood.getS(), 1.), Util::Mod(_neighborhood.getT(), 1.) );
    }

    _neighborhood.SetST(
		Util::Clamp(_neighborhood.getS(), DtFudge, 1.-DtFudge),
		Util::Clamp(_neighborhood.getT(), DtFudge, 1.-DtFudge)
	);

}

ulong STTransformShader::mNoWrap = 0x0;
ulong STTransformShader::mSWrap = 0x1;
ulong STTransformShader::mTWrap = 0x2;

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
STWeaveShader::STWeaveShader():UserShader() {

    mBumpsPlease = 0.0;

    mFuzz = 0.05;

    mSFreq = mTFreq = 4.0;

    mSWidth = mTWidth = 0.3;
    mSLower = 0.5 - (mSWidth/2.0);
    mSUpper = 0.5 + (mSWidth/2.0);

    mTLower = 0.5 - (mTWidth/2.0);
    mTUpper = 0.5 + (mTWidth/2.0);

    mBackgroundShader = 0;

    mTShader = 0;
    mSShader = 0;

    Symbol* sym = new Symbol("STWeaveShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

STWeaveShader::~STWeaveShader(){;}

UserShader* STWeaveShader::Clone(){
    return (UserShader*)new STWeaveShader();
}

void STWeaveShader::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("fuzz", sym->Name())){
		    mFuzz = sym->flt;
		}
	
		if (!strcmp("bumpsPlease", sym->Name())){
		    mBumpsPlease = sym->flt;
		}
	
		if (!strcmp("sWidth", sym->Name())){
		    mSWidth = sym->flt;
		    mSLower = 0.5 - (mSWidth/2.0);
		    mSUpper = 0.5 + (mSWidth/2.0);
		}
	
		if (!strcmp("sfreq", sym->Name())){
		    mSFreq = sym->flt;
		}
	
		if (!strcmp("sColor", sym->Name())){
		    mSShader = sym->Sh;
		}
	
		if (!strcmp("tWidth", sym->Name())){
		    mTWidth = sym->flt;
		    mTLower = 0.5 - (mTWidth/2.0);
		    mTUpper = 0.5 + (mTWidth/2.0);
		}
	
		if (!strcmp("tfreq", sym->Name())){
		    mTFreq = sym->flt;
		}
		
		if (!strcmp("tColor", sym->Name())){
		    mTShader = sym->Sh;
		}
	
		if (!strcmp("back", sym->Name())){
		    mBackgroundShader = sym->Sh;
		}
	
    }
  
}

void STWeaveShader::PropagateNeighborhood(Neighborhood& neigh) {

    _neighborhood = neigh;

    mSShader->PropagateNeighborhood(_neighborhood);
    mTShader->PropagateNeighborhood(_neighborhood);
    if (mBackgroundShader) mBackgroundShader->PropagateNeighborhood(_neighborhood);

}

void STWeaveShader::Shade() {

    if (mBumpsPlease > 0.0) {
	doBumps();
    } else {
	doShade();
    }
}

void STWeaveShader::doShade() {

    float ss = Util::Repeat(_neighborhood.getS(), mSFreq);
    float tt = Util::Repeat(_neighborhood.getT(), mTFreq);

    int col = Util::WhichTile(_neighborhood.getS(), mSFreq);
    int row = Util::WhichTile(_neighborhood.getT(), mTFreq);

    RGBTriple color(0., 0., 0.);
    mBackgroundShader->Shade();
    color = mBackgroundShader->_neighborhood._color;
    
    float layerOpacity = 0.0;
    RGBTriple layerColor(0.0, 0.0, 0.0);
    if ((Util::IsEven(row) && Util::IsOdd(col)) || (Util::IsOdd(row) && Util::IsEven(col))) {

	// vertical bar
	mTShader->Shade();
	layerColor   = mTShader->_neighborhood._color;
	layerOpacity = Util::SmoothPulse(mSLower, mSUpper, mFuzz, ss);
	color.SetR( Util::Lirp(color.r(), layerColor.r(), layerOpacity) );
	color.SetG( Util::Lirp(color.g(), layerColor.g(), layerOpacity) );
	color.SetB( Util::Lirp(color.r(), layerColor.r(), layerOpacity) );
	
	// horizontal bar
	mSShader->Shade();
	layerColor   = mSShader->_neighborhood._color;
	layerOpacity = Util::SmoothPulse(mTLower, mTUpper, mFuzz, tt);
	color.SetR( Util::Lirp(color.r(), layerColor.r(), layerOpacity) );
	color.SetG( Util::Lirp(color.g(), layerColor.g(), layerOpacity) );
	color.SetB( Util::Lirp(color.b(), layerColor.b(), layerOpacity) );
	
    } else {
	
	// horizontal bar
	mSShader->Shade();
	layerColor   = mSShader->_neighborhood._color;
	layerOpacity = Util::SmoothPulse(mTLower, mTUpper, mFuzz, tt);
	color.SetR( Util::Lirp(color.r(), layerColor.r(), layerOpacity) );
	color.SetG( Util::Lirp(color.g(), layerColor.g(), layerOpacity) );
	color.SetB( Util::Lirp(color.b(), layerColor.b(), layerOpacity) );

	// vertical bar
	mTShader->Shade();
	layerColor   = mTShader->_neighborhood._color;
	layerOpacity = Util::SmoothPulse(mSLower, mSUpper, mFuzz, ss);
	color.SetR( Util::Lirp(color.r(), layerColor.r(), layerOpacity) );
	color.SetG( Util::Lirp(color.g(), layerColor.g(), layerOpacity) );
	color.SetB( Util::Lirp(color.b(), layerColor.b(), layerOpacity) );

    }

    _neighborhood._color = color;
}

void STWeaveShader::doBumps() {

    int col = Util::WhichTile(_neighborhood.getS(), mSFreq);
    int row = Util::WhichTile(_neighborhood.getT(), mTFreq);

    if ((Util::IsEven(row) && Util::IsOdd(col)) || (Util::IsOdd(row) && Util::IsEven(col))) {

	// bumps on vertical edges
	mSShader->Shade();
	_neighborhood = mSShader->_neighborhood;
    } else {
	
	// bumps on horizontal edges
	mTShader->Shade();
	_neighborhood = mTShader->_neighborhood;
    }

}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
LUTShader::LUTShader():UserShader() {

    mTexture = 0;
    mMask = 0;

    Symbol* sym = new Symbol("LUTShader", Symbol::UserShaderType);
    sym->Us = this;

    SymbolTable::yySymbolTable->Insert(sym);
}

LUTShader::~LUTShader(){;}

UserShader* LUTShader::Clone(){
    return (UserShader*)new LUTShader();
}

void LUTShader::Set(SymbolTable& params) {

    int j = 0;
    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("texture", sym->Name())){
		    mTexture = sym->tex;
		}
	
		if (!strcmp("negate", sym->Name())){
		    mIntensityTransform = mNegate;
		    for (j = 0; j < 256; j++) mLUT[j] = 255 - j;
		}
	
		if (!strcmp("bitclip", sym->Name())){
	
		    mIntensityTransform = mBitClip;
	      
		    mMask = ((UCHAR_MAX) >> 2);
	
		    for (j = 0; j < 256; j++) {
	
			DtByte b = DtByte(j);
			mLUT[j] = b & mMask;
			//fprintf(stderr, "LUTShader::Set j(%d) b(%u) mask(%u) b&mask(%u)\n", j, b, mMask, b&mMask);
		    }
	
		} // if (!strcmp("bitclip")
	
    } // for (i)
  
}

void LUTShader::Shade() {
  
    float r = _neighborhood._color.r();
    float g = _neighborhood._color.g();
    float b = _neighborhood._color.b();

    r *= 255.;
    g *= 255.;
    b *= 255.;

    DtByte rr = mLUT[DtByte(r)];
    DtByte gg = mLUT[DtByte(g)];
    DtByte bb = mLUT[DtByte(b)];

    // contrast stretch of bitclipping
    if (mIntensityTransform == mBitClip) {

	float numer, denom, value;

	//
	numer = float(rr);
	denom = float(DtByte(mMask));
	value = (numer/denom) * 255.;
	rr = DtByte(value);
	//
	numer = float(gg);
	denom = float(DtByte(mMask));
	value = (numer/denom) * 255.;
	gg = DtByte(value);
	//
	numer = float(bb);
	denom = float(DtByte(mMask));
	value = (numer/denom) * 255.;
	bb = DtByte(value);
    }

    _neighborhood._color.Set(float(rr)/255., float(gg)/255., float(bb)/255.);

}

const unsigned long LUTShader::mNegate;
const unsigned long LUTShader::mBitClip;

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
void InitDougShader() {

    UserShader* ust = NULL;

    ust = new QuantizeSTShader;

    ust = new ShadowShader;

    ust = new DotDeluxeShader;

    ust = new DotShader;

    ust = new RGB2LabShader;

    ust = new ShowThatShader;

    ust = new ShowUVSpaceJacobianShader;

    ust = new CheckShader;

    ust = new InOutShader;

    ust = new CylindricalShader;

    ust = new SphericalShader;

    ust = new BackgroundShader;

    ust = new FacetShader;

    ust = new BumpShader;

    ust = new WiggleSTShader;

    ust = new ModSTShader;

    ust = new RadialDistortSTShader;

    ust = new SelectionShader;

    ust = new LightContributionShader;

    ust = new SolarizeShader;

    ust = new FunHouseMirrorSTShader;

    ust = new STTransformShader;

    ust = new STWeaveShader;

    ust = new LUTShader;
}




