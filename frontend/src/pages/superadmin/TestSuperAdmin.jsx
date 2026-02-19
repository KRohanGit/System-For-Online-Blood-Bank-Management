import React, { useEffect, useState } from 'react';
import config from '../../config/config';

function TestSuperAdmin() {
  const [token, setToken] = useState(null);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);

    if (storedToken) {
      // Test API call
      fetch(`${config.API_URL}/superadmin/stats`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`
        }
      })
      .then(res => res.json())
      .then(data => {
        setTestResult({ success: true, data });
      })
      .catch(err => {
        setTestResult({ success: false, error: err.message });
      });
    }
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1>Super Admin Test Page</h1>
      
      <div style={{ background: '#f5f5f5', padding: '20px', marginTop: '20px', borderRadius: '8px' }}>
        <h2>Token Status:</h2>
        <p><strong>Token Found:</strong> {token ? '✅ Yes' : '❌ No'}</p>
        {token && (
          <p style={{ fontSize: '12px', wordBreak: 'break-all' }}>
            <strong>Token:</strong> {token.substring(0, 50)}...
          </p>
        )}
      </div>

      {testResult && (
        <div style={{ background: testResult.success ? '#d4edda' : '#f8d7da', padding: '20px', marginTop: '20px', borderRadius: '8px' }}>
          <h2>API Test Result:</h2>
          <p><strong>Status:</strong> {testResult.success ? '✅ Success' : '❌ Failed'}</p>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h2>Quick Links:</h2>
        <a href="/signin" style={{ display: 'block', marginBottom: '10px' }}>← Back to Sign In</a>
        <a href="/superadmin/dashboard" style={{ display: 'block' }}>Go to Super Admin Dashboard</a>
      </div>
    </div>
  );
}

export default TestSuperAdmin;
