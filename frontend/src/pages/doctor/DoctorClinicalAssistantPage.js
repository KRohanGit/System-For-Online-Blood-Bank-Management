import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import doctorClinicalAPI from '../../services/doctorClinicalAPI';
import './DoctorClinicalAssistantPage.css';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CONDITION_TYPES = ['trauma', 'surgery', 'postpartum', 'oncology', 'anemia', 'internal_bleeding', 'other'];
const TIMING_OPTIONS = ['immediate', 'within_1_hour', 'within_3_hours', 'within_6_hours', 'delayed', 'unknown'];

const RISK_COLORS = {
  low: '#16a34a',
  moderate: '#f59e0b',
  high: '#f97316',
  critical: '#dc2626'
};

const initialForm = {
  age: '',
  gender: 'unknown',
  bloodGroup: 'O+',
  hemoglobinLevel: '',
  bloodLossEstimate: '',
  conditionType: 'trauma',
  systolicBP: '',
  diastolicBP: '',
  heartRate: '',
  additionalClinicalContext: '',
  unitsGiven: '',
  bloodTypeUsed: 'O+',
  timing: 'unknown'
};

function DoctorClinicalAssistantPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const parseNumber = (value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  };

  const payload = useMemo(() => ({
    anonymizedPatientFeatures: {
      age: parseNumber(form.age),
      gender: form.gender,
      bloodGroup: form.bloodGroup,
      hemoglobinLevel: parseNumber(form.hemoglobinLevel),
      bloodLossEstimate: parseNumber(form.bloodLossEstimate),
      conditionType: form.conditionType,
      vitals: {
        systolicBP: parseNumber(form.systolicBP),
        diastolicBP: parseNumber(form.diastolicBP),
        heartRate: parseNumber(form.heartRate)
      },
      additionalClinicalContext: form.additionalClinicalContext
    },
    treatment: {
      unitsGiven: parseNumber(form.unitsGiven),
      bloodTypeUsed: form.bloodTypeUsed,
      timing: form.timing
    },
    topK: 12
  }), [form]);

  const analyzeCase = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await doctorClinicalAPI.analyzeClinicalCase(payload);
      if (response?.success) {
        setAnalysis(response.data);
      } else {
        setError(response?.message || 'Unable to analyze this case.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Case analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    if (!analysis?.recommendation) return [];

    const recommended = Number(analysis.recommendation.recommendedUnits || 0);
    const average = Number(analysis.recommendation?.evidenceSummary?.avgUnitsFromSimilarCases || 0);
    return [
      { name: 'Recommended', units: recommended },
      { name: 'Historical Avg', units: average }
    ];
  }, [analysis]);

  const riskData = useMemo(() => {
    if (!analysis?.prediction) return [];

    const survival = Number(analysis.prediction.survivalProbability || 0);
    return [
      { name: 'Survival Probability', value: Number((survival * 100).toFixed(1)) },
      { name: 'Residual Risk', value: Number(((1 - survival) * 100).toFixed(1)) }
    ];
  }, [analysis]);

  const riskLevel = analysis?.prediction?.riskLevel || 'moderate';

  return (
    <div className="doctor-clinical-assistant-page">
      <div className="assistant-grid">
        <section className="assistant-card">
          <h3>AI Clinical Assistant</h3>
          <p className="assistant-subtitle">Enter anonymized patient parameters and run the case intelligence workflow.</p>

          <div className="assistant-form-grid">
            <label>
              Age
              <input name="age" type="number" value={form.age} onChange={handleInputChange} min="0" max="120" />
            </label>

            <label>
              Gender
              <select name="gender" value={form.gender} onChange={handleInputChange}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="unknown">Unknown</option>
              </select>
            </label>

            <label>
              Blood Group
              <select name="bloodGroup" value={form.bloodGroup} onChange={handleInputChange}>
                {BLOOD_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
              </select>
            </label>

            <label>
              Hemoglobin (g/dL)
              <input name="hemoglobinLevel" type="number" step="0.1" value={form.hemoglobinLevel} onChange={handleInputChange} />
            </label>

            <label>
              Blood Loss Estimate (mL)
              <input name="bloodLossEstimate" type="number" value={form.bloodLossEstimate} onChange={handleInputChange} />
            </label>

            <label>
              Condition Type
              <select name="conditionType" value={form.conditionType} onChange={handleInputChange}>
                {CONDITION_TYPES.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
              </select>
            </label>

            <label>
              Systolic BP
              <input name="systolicBP" type="number" value={form.systolicBP} onChange={handleInputChange} />
            </label>

            <label>
              Diastolic BP
              <input name="diastolicBP" type="number" value={form.diastolicBP} onChange={handleInputChange} />
            </label>

            <label>
              Heart Rate
              <input name="heartRate" type="number" value={form.heartRate} onChange={handleInputChange} />
            </label>

            <label>
              Planned Units
              <input name="unitsGiven" type="number" value={form.unitsGiven} onChange={handleInputChange} />
            </label>

            <label>
              Planned Blood Type
              <select name="bloodTypeUsed" value={form.bloodTypeUsed} onChange={handleInputChange}>
                {BLOOD_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
              </select>
            </label>

            <label>
              Planned Timing
              <select name="timing" value={form.timing} onChange={handleInputChange}>
                {TIMING_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>

          <label className="assistant-context-label">
            Clinical Context Notes
            <textarea
              name="additionalClinicalContext"
              value={form.additionalClinicalContext}
              onChange={handleInputChange}
              rows={3}
              placeholder="Only anonymized clinical context"
            />
          </label>

          <button type="button" className="assistant-analyze-btn" onClick={analyzeCase} disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze Case'}
          </button>

          {error && <div className="assistant-error">{error}</div>}
        </section>

        <section className="assistant-card">
          <h3>AI Output</h3>
          {!analysis && <p className="assistant-placeholder">Run analysis to see similar cases, recommendations, and predicted outcomes.</p>}

          {analysis && (
            <>
              <div className="assistant-key-metrics">
                <div>
                  <span>Case ID</span>
                  <strong>{analysis.caseId}</strong>
                </div>
                <div>
                  <span>Recommended Units</span>
                  <strong>{analysis.recommendation?.recommendedUnits ?? '--'}</strong>
                </div>
                <div>
                  <span>Preferred Blood Group</span>
                  <strong>{analysis.recommendation?.preferredBloodGroup ?? '--'}</strong>
                </div>
                <div>
                  <span>Risk Level</span>
                  <strong style={{ color: RISK_COLORS[riskLevel] || '#334155' }}>{riskLevel.toUpperCase()}</strong>
                </div>
              </div>

              <div className="assistant-reasoning">{analysis.recommendation?.reasoning}</div>
              <div className="assistant-reasoning">{analysis.prediction?.reasoning}</div>

              <div className="assistant-charts-grid">
                <div className="chart-shell">
                  <h4>Units Comparison</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="units" fill="#0ea5a4" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-shell">
                  <h4>Outcome Probability</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={riskData} dataKey="value" nameKey="name" outerRadius={72}>
                        <Cell fill="#16a34a" />
                        <Cell fill="#dc2626" />
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="assistant-similar-cases">
                <h4>Similar Cases Found ({analysis?.similarCases?.length || 0})</h4>
                <div className="assistant-case-list">
                  {(analysis?.similarCases || []).slice(0, 6).map((item) => (
                    <div key={`${item.caseId}-${item.similarityScore}`} className="assistant-case-item">
                      <div>
                        <strong>{item.caseId}</strong>
                        <p>{item.conditionType} • {item.bloodGroup}</p>
                      </div>
                      <div>
                        <span>Similarity {(Number(item.similarityScore || 0) * 100).toFixed(1)}%</span>
                        <p>{item.treatmentSummary?.unitsGiven || 0} units • {item.treatmentSummary?.timing || 'unknown'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default DoctorClinicalAssistantPage;
