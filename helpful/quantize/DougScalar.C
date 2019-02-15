#include <string.h>
#include "Symbol.h"
#include "Neighborhood.h"
#include "DougScalar.h"
#include "RayScene.h"
#include "Triangle.h"
#include "Noise.h"
#include "ShadeTree.h"

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
PlateauScalar::PlateauScalar():UserScalar() {
    
	_levels	= 1.0;
    _frac	= 1.0/_levels; 
    
    _scalar	= NULL;

    Symbol* sym = new Symbol("PlateauScalar", Symbol::UserScalarType);
    sym->Usc = this;
    SymbolTable::yySymbolTable->Insert(sym);
}

PlateauScalar::~PlateauScalar(){;}

void PlateauScalar::PropagateNeighborhood(Neighborhood& neigh) {

    _neighborhood = neigh;
    _scalar->PropagateNeighborhood(_neighborhood);
}

UserScalar* PlateauScalar::Clone(){
    return (UserScalar*)new PlateauScalar();
}

void PlateauScalar::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("levels", sym->Name())){
		    _levels = sym->flt;
		}
	
		if (!strcmp("scalar", sym->Name())){
		    _scalar = sym->Sc;
		}
	
    }

	_frac	= 1.0/_levels;
}

double PlateauScalar::Evaluate() {
	
	float e = _scalar->Evaluate();
	
	e /=	_frac;
	e =		floor(e);
	e *=	_frac;
			
	return e;
}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::
ThreadScalar::ThreadScalar():UserScalar() {
	
	_doDarken		= DtFalse;
	
	_scalar				= NULL;
	
	_origin.Set(0., 0., 0.);
	
	_scalefactor		= 1.0;
	_biasValue			= 0.5;
	_gainValue			= 0.5;
	_abs_attenuation	= 0.3;
	_octaves			= 3;

    Symbol* sym = new Symbol("ThreadScalar", Symbol::UserScalarType);
    sym->Usc = this;
    SymbolTable::yySymbolTable->Insert(sym);

}

ThreadScalar::~ThreadScalar(){;}

UserScalar* ThreadScalar::Clone(){
    return (UserScalar*)new ThreadScalar();
}

void ThreadScalar::Set(SymbolTable& params) {
  
    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("doDarken", sym->Name())){
			
			if (!strcmp(sym->St, "yes")) { 
				_doDarken = DtTrue;
			} else {
				_doDarken = DtTrue;
			}

		}
		
		if (!strcmp("scale", sym->Name())){
		    _scalefactor = sym->flt;
		}
		
		if (!strcmp("origin", sym->Name())){
		    _origin = sym->p3d;
		}
	
		if (!strcmp("bias", sym->Name())){
		    _biasValue = sym->flt;
		}
	
		if (!strcmp("gain", sym->Name())){
		    _gainValue = sym->flt;
		}
	
		if (!strcmp("abs_attenuation", sym->Name())){
		    _abs_attenuation = sym->flt;
		}
	
		if (!strcmp("octaves", sym->Name())){
		    _octaves = (int)sym->flt;
		}
	
    }

	_scalar = new Noise3D(Shader::noise3d, _scalefactor, _origin);
  
}

double ThreadScalar::Evaluate() {

    if (!_neighborhood.UVSpaceJacobianValid()) {
    	_neighborhood.SetUVSpaceJacobian();
    }
    
    Point3D old = _neighborhood._location;

    float maximum = Util::Max(Vector3D::Norm(_neighborhood._worldSpaceXIncrement), Vector3D::Norm(_neighborhood._worldSpaceYIncrement));

    float nyquist = 2. * maximum;
  
    Point3D loc = old / nyquist;
    if (nyquist > 1.) {
	
		loc = old / nyquist;
	
		_neighborhood.SetLocation(loc);
		_scalar->PropagateNeighborhood(_neighborhood);
		
		float s = _scalar->Evaluate();
		s = Util::Gain(Util::Bias(fabs(s) * _abs_attenuation, _biasValue), _gainValue);
		
		return Util::Clamp(s, 0.0, 1.0);
    }
  
    nyquist = 1./nyquist;
    
	float turb = 1.0;
    float octave;
    int loops;
    for (octave = 1., loops = 0; loops < _octaves; octave *= 2., loops++){
	
		if(octave > nyquist) break;
	
		loc = old * octave;
	
		_neighborhood.SetLocation(loc);
	
		_scalar->PropagateNeighborhood(_neighborhood);
	    
	    float s = _scalar->Evaluate();
		s = Util::Gain(Util::Bias(fabs(s) * _abs_attenuation, _biasValue), _gainValue);
	    
	    // We either darken or multiply
		if (_doDarken) {
			
			if (s < turb) {
				turb = s;
			}
			
		} else {
			turb *= s;
		}
		
    }
 
	return Util::Clamp(turb, 0.0, 1.0);
   
}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::
SinusoidScalar::SinusoidScalar():UserScalar() {

    mSFreq = 1.;
    mTFreq = 1.;

    mSPhase = 0.;
    mTPhase = 0.;

    mS = DtTrue;
    mT = DtTrue;

    Symbol* sym=0;

    sym = new Symbol("SinusoidScalar", Symbol::UserScalarType);
    sym->Usc = this;
    SymbolTable::yySymbolTable->Insert(sym);

}

SinusoidScalar::~SinusoidScalar(){;}

UserScalar* SinusoidScalar::Clone(){
    return (UserScalar*)new SinusoidScalar();
}

void SinusoidScalar::Set(SymbolTable& params) {
  
    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("theS", sym->Name())){
		    mS = DtBool(Util::Clamp(sym->flt, 0., 1.));
		}
	
		if (!strcmp("theT", sym->Name())){
		    mT = DtBool(Util::Clamp(sym->flt, 0., 1.));
		}
	
		if (!strcmp("theSFreq", sym->Name())){
		    mSFreq = sym->flt;
		}
	
		if (!strcmp("theTFreq", sym->Name())){
		    mTFreq = sym->flt;
		}
	
		if (!strcmp("theSPhase", sym->Name())){
		    mSPhase = sym->flt;
		}
	
		if (!strcmp("theTPhase", sym->Name())){
		    mTPhase = sym->flt;
		}
	
    }

}

double SinusoidScalar::Evaluate() {


    float s=0.;
    float t=0.;

    if (mS){
		s = _neighborhood.getS();
		s = sin( 2. * DtPI * mSFreq * s + mSPhase * DtPI);
		s = (s + 1.)/2.;
    }

    if (mT){
		t = _neighborhood.getT();
		t = sin( 2. * DtPI * mTFreq * t + mTPhase * DtPI);
		t = (t + 1.)/2.;
    }

    if (mS && mT) {
		return s * t;
    }

    if (mS) {
		return s;
    }

    if (mT) {
		return t;
    }

    return 0.;
}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::
SScalar::SScalar():UserScalar() {

    Symbol* sym=0;

    sym = new Symbol("SScalar", Symbol::UserScalarType);
    sym->Usc = this;
    SymbolTable::yySymbolTable->Insert(sym);

}

SScalar::~SScalar(){;}

UserScalar* SScalar::Clone(){
    return (UserScalar*)new SScalar();
}

double SScalar::Evaluate() {


    return _neighborhood.getS();
}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::
TScalar::TScalar():UserScalar() {

    Symbol* sym=0;

    sym = new Symbol("TScalar", Symbol::UserScalarType);
    sym->Usc = this;
    SymbolTable::yySymbolTable->Insert(sym);

}

TScalar::~TScalar(){;}

UserScalar* TScalar::Clone(){
    return (UserScalar*)new TScalar();
}

double TScalar::Evaluate() {


    return _neighborhood.getT();
}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::
TriangleIndexScalar::TriangleIndexScalar():UserScalar() {

    _doOddEven = DtTrue;

    Symbol* sym=0;

    sym = new Symbol("TriangleIndexScalar", Symbol::UserScalarType);
    sym->Usc = this;
    SymbolTable::yySymbolTable->Insert(sym);

}

TriangleIndexScalar::~TriangleIndexScalar(){;}

UserScalar* TriangleIndexScalar::Clone(){
    return (UserScalar*)new TriangleIndexScalar();
}

void TriangleIndexScalar::Set(SymbolTable& params) {
  
    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym  = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("doOddEven", sym->Name())){
		    _doOddEven = DtBool(Util::Clamp(sym->flt, 0., 1.));
		}
	
    }

}	

double TriangleIndexScalar::Evaluate() {

	Triangle* triangle = (Triangle*) _neighborhood.getGeometry();
	
	float scalar;
	if (_doOddEven) {
		
		if ( Util::IsOdd(triangle->_triangleListIndex) ) {
			
			scalar = 1.0;
		} else {
			
			scalar = 0.0;
		}
		
	} else {
		
		scalar = ((float)triangle->_triangleListIndex);
		scalar /= ((float)RayScene::Scene->_triangleList.getArrayLength());
		scalar = Util::Clamp(scalar, 0., 1.);
		
	}
	
    return scalar;
}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::
CheckScalar::CheckScalar():UserScalar() {

	_sFreq 				= 1.0;
	_tFreq 				= 1.0;

	_doRandom			= DtFalse;
	_randomValueCount	= 0;
	_randomValues		= NULL;

    Symbol* sym = new Symbol("CheckScalar", Symbol::UserScalarType);
    sym->Usc = this;
    SymbolTable::yySymbolTable->Insert(sym);
}

CheckScalar::~CheckScalar(){;}

UserScalar* CheckScalar::Clone(){
    return (UserScalar*)new CheckScalar();
}

void CheckScalar::Set(SymbolTable& params) {
  
    int i;
    for (i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym;
		sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("sfreq", sym->Name())){
		    _sFreq = sym->flt;
		}
	
		if (!strcmp("tfreq", sym->Name())){
		    _tFreq = sym->flt;
		}
	
		if (!strcmp("theSFreq", sym->Name())){
		    _sFreq = sym->flt;
		}
	
		if (!strcmp("theTFreq", sym->Name())){
		    _tFreq = sym->flt;
		}
	
		if (!strcmp("doPolar", sym->Name())){
			
			if (!strcmp(sym->St, "yes")) { 
				_doPolar = DtTrue;
			} else {
				_doPolar = DtFalse;
			}

		}
	
		if (!strcmp("doRandom", sym->Name())){
			
			if (!strcmp(sym->St, "yes")) { 
				_doRandom = DtTrue;
			} else {
				_doRandom = DtFalse;
			}

		}
	
	}
		
    if (_doRandom) {
	
		_randomValueCount = int(_sFreq * _tFreq);
	
		_randomValues = new float[_randomValueCount];
	
		for (i=0; i < _randomValueCount; i++){
		    _randomValues[i] = Util::Random();
		}
		
    }

}

double CheckScalar::Evaluate() {

    float s	= 0.0;
    float t	= 0.0;
    if (_doPolar){
	
		float a = (_neighborhood.getS() - .5)*2.;
		float b = (_neighborhood.getT() - .5)*2.;
	    
		float radius	= sqrt(a*a + b*b);  
		float theta		= atan2(a, b);
	
		s = radius/M_SQRT2;
		t = (theta + DtPI)/(2.*DtPI);
	
    } else {
	
		s = _neighborhood.getS();
		t = _neighborhood.getT();
    }

    if (_doRandom) {

		int col = Util::WhichTile(s, _sFreq);
		int row = Util::WhichTile(t, _tFreq);

		int index = row * int(_sFreq) + col;
	
		return _randomValues[ index ];
	
    }
		
	s	= Util::Repeat(s, _sFreq);
	t	= Util::Repeat(t, _tFreq);

	if (s < .5){

	    if (t < .5) return 0.;
	    else return 1.;

	} else {

	    if (t < .5) return 1.;
	    else return 0.;

	}


	
}

//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
CandyCaneScalar::CandyCaneScalar():UserScalar() {
  
    _frequency = 1.;
    _tilt = 0.;
    _phase = 0.;

    Symbol* sym=0;

    sym = new Symbol("CandyCaneScalar", Symbol::UserScalarType);
    sym->Usc = this;
    SymbolTable::yySymbolTable->Insert(sym);
}

CandyCaneScalar::~CandyCaneScalar(){;}

UserScalar* CandyCaneScalar::Clone(){
    return (UserScalar*)new CandyCaneScalar();
}

void CandyCaneScalar::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("frequency", sym->Name())){
		    _frequency = sym->flt;
		}
	
		if (!strcmp("phase", sym->Name())){
		    _phase = sym->flt;
		}
	
		if (!strcmp("tilt", sym->Name())){
		    _tilt = sym->flt;
		}
	
    }
  
}

double CandyCaneScalar::Evaluate() {
	
    //float m = DtMod( _neighborhood.fS * _frequency + _tilt * _neighborhood.fT + _phase, 1.);
	float m = Util::Mod( _neighborhood._t * _frequency + _tilt * _neighborhood._s + _phase, 1.);
 
    if (m > .5) return 1.;
    else return 0.;

}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::
BarycentricScalar::BarycentricScalar():UserScalar() {
  	mTolerance = mFuzz = 0.0;
    Symbol* sym = new Symbol("BarycentricScalar", Symbol::UserScalarType);
    sym->Usc = this;
    SymbolTable::yySymbolTable->Insert(sym);
}

BarycentricScalar::~BarycentricScalar(){;}

UserScalar* BarycentricScalar::Clone(){ return (UserScalar*)new BarycentricScalar(); }

void BarycentricScalar::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
		if (!strcmp("theFuzz", sym->Name()))		{ mFuzz = sym->flt; }
		if (!strcmp("theTolerance", sym->Name()))	{ mTolerance = sym->flt; }
    }

}

double BarycentricScalar::Evaluate() {

	float a = Util::SmoothStep(mTolerance - mFuzz, mTolerance + mFuzz, _neighborhood._barycentricCoordinate.x());
	float b = Util::SmoothStep(mTolerance - mFuzz, mTolerance + mFuzz, _neighborhood._barycentricCoordinate.y());
	float c = Util::SmoothStep(mTolerance - mFuzz, mTolerance + mFuzz, _neighborhood._barycentricCoordinate.z());
	return a * b * c;
}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::
ParametricScalar::ParametricScalar():UserScalar() {

    fTolerance = 0.;
    fUFreq = 0.;
    fVFreq = 0.;

    Symbol* sym=0;

    sym = new Symbol("ParametricScalar", Symbol::UserScalarType);
    sym->Usc = this;
    SymbolTable::yySymbolTable->Insert(sym);
}

ParametricScalar::~ParametricScalar(){;}

UserScalar* ParametricScalar::Clone(){
    return (UserScalar*)new ParametricScalar();
}

void ParametricScalar::Set(SymbolTable& params) {

    for (int i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym;
	
		sym = 0;
		sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("theTolerance", sym->Name())){
		    fTolerance = sym->flt;
		}
	
		if (!strcmp("theUfreq", sym->Name())){
		    fUFreq = sym->flt;
		}
	
		if (!strcmp("theVfreq", sym->Name())){
		    fVFreq = sym->flt;
		}
	
    }

}

double ParametricScalar::Evaluate() {

    double trash;

    double uMod;
    uMod = modf( _neighborhood.getU()*fUFreq, &trash );

    double vMod;
    vMod = modf( _neighborhood.getV()*fVFreq, &trash );
  
    if ( uMod < fTolerance/2. || uMod > 1. - fTolerance/2. ) return 1.;

    if ( vMod < fTolerance/2. || vMod > 1. - fTolerance/2. ) return 1.;
  
    return 0.;
}

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
QuantizedScalar::QuantizedScalar():UserScalar() {

    _sfreq 				= 1.0;
    _tfreq 				= 1.0;
    
    _scalarIsEvaluated	= DtFalse;
    
    _scalar 			= NULL;
    
    _doRandomize		= DtFalse;
	_indices		= NULL;

    _xOffset			= 0.0;
    _yOffset			= 0.0;
    _zOffset			= 0.0;

    Symbol* sym = new Symbol("QuantizedScalar", Symbol::UserScalarType);
    sym->Usc = this;
    SymbolTable::yySymbolTable->Insert(sym);
}

QuantizedScalar::~QuantizedScalar(){;}

UserScalar* QuantizedScalar::Clone(){
    return (UserScalar*)new QuantizedScalar();
}

void QuantizedScalar::Set(SymbolTable& params) {

    _scalarIsEvaluated = DtFalse;

    int i;
    for (i=0; i < params.fSymTab.getArrayLength(); i++){
	
		Symbol* sym = (Symbol*)params.fSymTab[i];
	
		if (!strcmp("randomize", sym->Name())){
			if (!strcmp(sym->St, "yes")) { 
				_doRandomize = DtTrue;
			} else {
				_doRandomize = DtFalse;
			}
		}
	
		if (!strcmp("sfreq", sym->Name())){
		    _sfreq = sym->flt;
		}
	
		if (!strcmp("tfreq", sym->Name())){
		    _tfreq = sym->flt;
		}
	
		if (!strcmp("scalar", sym->Name())){
		    _scalar = sym->Sc;
		}
	
		if (!strcmp("xoffset", sym->Name())){
		    _xOffset = sym->flt;
		}
	
		if (!strcmp("yoffset", sym->Name())){
		    _yOffset = sym->flt;
		}
	
		if (!strcmp("zoffset", sym->Name())){
		    _zOffset = sym->flt;
		}
	
    }

    int length = int(_sfreq * _tfreq);

    float *f = new float[length];

    for (i=0; i < length; i++){
	
		f[i] = 0.0;
		float *fp = &f[i];
		_quantizedValues.append( (void*)fp );
    }
    
    if (_doRandomize) {
    	
	 	int ncols = int(_sfreq);
		int nrows = int(_tfreq);
		
		_indices = new int[ncols * nrows];
		
		for (int i = 0; i < ncols * nrows; i++) {
			_indices[i] = Util::RandomRange(0, (ncols * nrows));
		}
		
    } // if (_doRandomize)

}

void QuantizedScalar::Initialize() {

	if (_scalarIsEvaluated == DtTrue) {
		
		return; 
	} else {
		
		_scalarIsEvaluated = !_scalarIsEvaluated;
	}
	
	float sIncrement = 1./_sfreq;
	float tIncrement = 1./_tfreq;

	float sDelta = sIncrement/2.;
	float tDelta = tIncrement/2.;

    int s;
    int t;

	float sparam;
	float tparam;

	for (tparam = 0., t = 0; t < int(_tfreq); tparam += tIncrement, t++) {
		
	    for (sparam = 0., s = 0; s < int(_sfreq); sparam += sIncrement, s++) {
	    	
			Neighborhood evaluator;

			evaluator.Invalidate();
	
			evaluator.SetUV(sparam + sDelta, tparam + tDelta);	
			evaluator.SetST(sparam + sDelta, tparam + tDelta);
	
			_neighborhood.getGeometry()->GetNeighborhoodInfo(evaluator, ulong(DtLocation|DtPartials|DtNormal));
	
			Point3D old = evaluator._location; 
			evaluator.SetLocation(old.x() + _xOffset, old.y() + _yOffset, old.z() + _zOffset);
	
			_scalar->PropagateNeighborhood(evaluator);
			
			int col = Util::WhichTile(evaluator.getS(), _sfreq);
			int row = Util::WhichTile(evaluator.getT(), _tfreq);
	
			int index = row * int(_sfreq) + col;
	
			float* value = (float*)_quantizedValues[index];
			(*value) = _scalar->Evaluate();

	    } // for(s)

	} // for(t)
}

double QuantizedScalar::Evaluate() {

	int col = Util::WhichTile(_neighborhood.getS(), _sfreq);
	int row = Util::WhichTile(_neighborhood.getT(), _tfreq);

	return Evaluate(col, row);
}

float QuantizedScalar::Evaluate(int col, int row) {
	
    if (_scalarIsEvaluated == DtFalse) {	
    	Initialize();
    }

    int index = 0;
	if (_doRandomize) {
		
  		index = _indices[ row * int(_sfreq) + col ];
  			
	} else {
		
   		index = row * int(_sfreq) + col;
	}
	
    float* value = (float*) _quantizedValues[index];
    return (*value);
}

void InitDougScalar() {

    UserScalar* ust=0;

	ust = new PlateauScalar;
	
    ust = new ThreadScalar;

    ust = new SinusoidScalar;

    ust = new SScalar;

    ust = new TScalar;

    ust = new TriangleIndexScalar;

    ust = new CheckScalar;

    ust = new CandyCaneScalar;

    ust = new BarycentricScalar;

    ust = new ParametricScalar;

    ust = new QuantizedScalar;

}


