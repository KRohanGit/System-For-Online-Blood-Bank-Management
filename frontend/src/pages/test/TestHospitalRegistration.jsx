import React, { useState } from 'react';
import { authAPI } from '../../services/api';
import config from '../../config/config';

function TestHospitalRegistration() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testRegistration = async () => {
    setLoading(true);
    setResult(null);

    const testData = {
      hospitalName: 'Test Hospital API',
      officialEmail: 'test@hospital.com',
      licenseNumber: 'TEST-123-API',
      adminName: 'Test Admin',
      adminEmail: 'testadmin@hospital.com',
      password: 'TestPassword@123',
      license: new File(['test'], 'test.pdf', { type: 'application/pdf' })
    };

    try {
      console.log('📤 Sending test registration:', testData);
      const response = await authAPI.registerHospital(testData);
      console.log('📥 Received response:', response);
      setResult({ success: true, data: response });
    } catch (error) {
      console.error('❌ Test failed:', error);
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testAPIConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/health`);
      const data = await response.json();
      console.log('🏥 Backend health check:', data);
      setResult({ success: true, health: data });
    } catch (error) {
      console.error('❌ Backend not reachable:', error);
      setResult({ success: false, error: 'Backend server not responding' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1>Hospital Registration Test</h1>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testAPIConnection} 
          disabled={loading}
          style={{ padding: '10px 20px', marginRight: '10px', cursor: 'pointer' }}
        >
          Test Backend Connection
        </button>
        
        <button 
          onClick={testRegistration} 
          disabled={loading}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          Test Hospital Registration
        </button>
      </div>

      {loading && <p>⏳ Testing...</p>}

      {result && (
        <div style={{ 
          background: result.success ? '#d4edda' : '#f8d7da', 
          padding: '20px', 
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h3>{result.success ? '✅ Success' : '❌ Failed'}</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Click "Test Backend Connection" to verify the backend is running</li>
          <li>Click "Test Hospital Registration" to try registering</li>
          <li>Check browser console (F12) for detailed logs</li>
          <li>Check backend terminal for incoming requests</li>
        </ol>
      </div>
    </div>
  );
}

export default TestHospitalRegistration;
