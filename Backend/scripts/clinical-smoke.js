require('dotenv').config();
const jwt = require('jsonwebtoken');

const BASE = process.env.SMOKE_BASE_URL || process.env.BACKEND_BASE_URL;
const LOGIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || 'admin@lifelink.com';
const LOGIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || 'Admin@123';

if (!BASE) {
  throw new Error('Missing SMOKE_BASE_URL or BACKEND_BASE_URL environment variable.');
}

async function call(path, method = 'GET', token = null, body = null) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  let data = {};
  try {
    data = await response.json();
  } catch (_) {
    data = {};
  }

  return { status: response.status, data };
}

function getDoctorToken(adminUserId) {
  if (!adminUserId) {
    throw new Error('Cannot mint doctor token: admin user id missing from login response');
  }

  return jwt.sign(
    { userId: String(adminUserId), role: 'doctor' },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
}

(async () => {
  try {
    const login = await call('/api/auth/login', 'POST', null, {
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD
    });

    const hospitalToken = login?.data?.data?.token;
    const hospitalUserId = login?.data?.data?.user?.id;

    if (!hospitalToken) {
      throw new Error(`Login failed (${login.status}): ${JSON.stringify(login.data)}`);
    }

    const doctorToken = getDoctorToken(hospitalUserId);

    const patientFeatures = {
      age: 41,
      gender: 'female',
      bloodGroup: 'O+',
      hemoglobinLevel: 8.2,
      bloodLossEstimate: 1180,
      conditionType: 'postpartum',
      vitals: {
        systolicBP: 95,
        diastolicBP: 61,
        heartRate: 109
      },
      additionalClinicalContext: 'Anonymized acute hemorrhage context for smoke test'
    };

    const treatmentPlan = {
      unitsGiven: 2,
      bloodTypeUsed: 'O+',
      timing: 'immediate'
    };

    const analyze = await call('/api/doctor-clinical/cases/analyze', 'POST', doctorToken, {
      anonymizedPatientFeatures: patientFeatures,
      treatment: treatmentPlan,
      topK: 5
    });

    const similar = await call('/api/ml/find-similar-cases', 'POST', hospitalToken, {
      patientFeatures,
      topK: 5
    });

    const recommend = await call('/api/ml/recommend-treatment', 'POST', hospitalToken, {
      patientFeatures,
      topK: 5
    });

    const predict = await call('/api/ml/predict-outcome', 'POST', hospitalToken, {
      patientFeatures,
      treatmentPlan
    });

    const analytics = await call('/api/hospital/case-analytics', 'GET', hospitalToken);

    const results = [
      {
        endpoint: '/api/doctor-clinical/cases/analyze',
        status: analyze.status,
        success: analyze.data?.success,
        caseId: analyze.data?.data?.caseId,
        message: analyze.data?.message
      },
      {
        endpoint: '/api/ml/find-similar-cases',
        status: similar.status,
        similarCases: similar.data?.similarCases?.length,
        basedOnCases: similar.data?.basedOnCases,
        modelVersion: similar.data?.modelVersion
      },
      {
        endpoint: '/api/ml/recommend-treatment',
        status: recommend.status,
        recommendedUnits: recommend.data?.recommendedUnits,
        confidenceScore: recommend.data?.confidenceScore,
        successRate: recommend.data?.successRate
      },
      {
        endpoint: '/api/ml/predict-outcome',
        status: predict.status,
        riskLevel: predict.data?.riskLevel,
        survivalProbability: predict.data?.survivalProbability,
        modelVersion: predict.data?.modelVersion
      },
      {
        endpoint: '/api/hospital/case-analytics',
        status: analytics.status,
        totalCases: analytics.data?.data?.totalCases,
        averageUnitsPerCase: analytics.data?.data?.averageUnitsPerCase,
        weeklyTrendPoints: analytics.data?.data?.weeklyTrend?.length
      }
    ];

    console.log('CLINICAL_SMOKE_RESULTS');
    console.log(JSON.stringify(results, null, 2));

    const ok = results.every((item) => item.status >= 200 && item.status < 300);
    process.exit(ok ? 0 : 1);
  } catch (error) {
    console.error('CLINICAL_SMOKE_ERROR', error.message || error);
    process.exit(1);
  }
})();
