#ifndef __DOUG_SCALAR__
#define __DOUG_SCALAR__

#include "UserScalar.h"

class PlateauScalar : public UserScalar {

	private:
		float _frac;
		float _levels;
		
		Scalar* _scalar;

	public:
		PlateauScalar();
		virtual ~PlateauScalar();
  
    	override void PropagateNeighborhood(Neighborhood& neigh);
		override double Evaluate();

		override UserScalar* Clone();

		override void Set(SymbolTable& params);

		override void Print(FILE* fp) const;

};

inline void PlateauScalar::Print(FILE* fp) const { fprintf(fp, "Class PlateauScalar\n"); }

class ThreadScalar : public UserScalar {

 private:
	DtBool _doDarken;
	Scalar*	_scalar;
	Point3D _origin;
	float	_scalefactor;
	float	_biasValue;
	float	_gainValue;
	float	_abs_attenuation;
	int	_octaves;
	
 public:
  ThreadScalar();
  virtual ~ThreadScalar();

  override double Evaluate();

  override UserScalar* Clone();

  override void Set(SymbolTable& params);

  override void Print(FILE* fp) const;

};

inline void ThreadScalar::Print(FILE* fp) const { fprintf(fp, "Class ThreadScalar\n"); }

class SinusoidScalar : public UserScalar {

 private:
  float mSFreq;
  float mTFreq;
  float mSPhase;
  float mTPhase;
  DtBool mS;
  DtBool mT;

 public:
  SinusoidScalar();
  virtual ~SinusoidScalar();

  override double Evaluate();

  override UserScalar* Clone();

  override void Set(SymbolTable& params);

  override void Print(FILE* fp) const;

};

inline void SinusoidScalar::Print(FILE* fp) const { fprintf(fp, "Class SinusoidScalar\n"); }

class SScalar : public UserScalar {

 public:
  SScalar();
  virtual ~SScalar();

  override double Evaluate();

  override UserScalar* Clone();

  override void Print(FILE* fp) const;

};

inline void SScalar::Print(FILE* fp) const { fprintf(fp, "Class SScalar\n"); }

class TScalar : public UserScalar {

 public:
  TScalar();
  virtual ~TScalar();

  override double Evaluate();

  override UserScalar* Clone();

  override void Print(FILE* fp) const;

};

inline void TScalar::Print(FILE* fp) const { fprintf(fp, "Class TScalar\n"); }

class TriangleIndexScalar : public UserScalar {
	
	private:
	DtBool _doOddEven;
	
	public:
	TriangleIndexScalar();
	virtual ~TriangleIndexScalar();

	override double Evaluate();

	override UserScalar* Clone();

	override void Set(SymbolTable& params);

	override void Print(FILE* fp) const;

};

inline void TriangleIndexScalar::Print(FILE* fp) const { fprintf(fp, "Class TriangleIndexScalar\n"); }

class CheckScalar : public UserScalar {

 private:
  float _sFreq;
  float _tFreq;

  DtBool _doRandom;
  int _randomValueCount;
  float* _randomValues;

  DtBool _doPolar;

 public:
  CheckScalar();
  virtual ~CheckScalar();

  override double Evaluate();

  override UserScalar* Clone();

  override void Set(SymbolTable& params);

  override void Print(FILE* fp) const;

};

inline void CheckScalar::Print(FILE* fp) const { fprintf(fp, "Class CheckScalar\n"); }

class CandyCaneScalar : public UserScalar {

 private:
  float _frequency;
  float _tilt;
  float _phase;

 public:
  CandyCaneScalar();
  virtual ~CandyCaneScalar();

  override double Evaluate();

  override UserScalar* Clone();

  override void Set(SymbolTable& params);

  override void Print(FILE* fp) const;

};

inline void CandyCaneScalar::Print(FILE* fp) const { fprintf(fp, "Class CandyCaneScalar\n"); }

class BarycentricScalar : public UserScalar {

 private:
  float mTolerance;
  float mFuzz;

 public:
  BarycentricScalar();
  virtual ~BarycentricScalar();

  override double Evaluate();

  override UserScalar* Clone();

  override void Set(SymbolTable& params);

  override void Print(FILE* fp) const;

};

inline void BarycentricScalar::Print(FILE* fp) const { fprintf(fp, "Class BarycentricScalar\n"); }

class ParametricScalar : public UserScalar {

 private:
  float fTolerance;
  float fUFreq;
  float fVFreq;

 public:
  ParametricScalar();
  virtual ~ParametricScalar();

  override double Evaluate();

  override UserScalar* Clone();

  override void Set(SymbolTable& params);

  override void Print(FILE* fp) const;

};

inline void ParametricScalar::Print(FILE* fp) const { fprintf(fp, "Class ParametricScalar\n"); }

class QuantizedScalar : public UserScalar {

	private:
		float _sfreq;
		float _tfreq;

		GrowableArray _quantizedValues;
		DtBool _scalarIsEvaluated;

		Scalar* _scalar;

		DtBool _doRandomize;
    	int* _indices;
		
		float _xOffset;
		float _yOffset;
		float _zOffset;

	public:
		QuantizedScalar();
		virtual ~QuantizedScalar();
  
		void Initialize();
		override double Evaluate();
		float Evaluate(int col, int row);

		override UserScalar* Clone();

		override void Set(SymbolTable& params);

		override void Print(FILE* fp) const;

};

inline void QuantizedScalar::Print(FILE* fp) const { fprintf(fp, "Class QuantizedScalar\n"); }

void InitDougScalar();

#endif



