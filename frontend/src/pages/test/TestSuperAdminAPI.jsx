import React, { useState } from 'react';

function TestSuperAdminAPI() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testFetchPending = async () => {
    setLoading(true);
    setResult(null);

    const token = localStorage.getItem('token');
    
    if (!token) {
      setResult({ success: false, error: 'No token found. Please login as super admin first.' });
      setLoading(false);
      return;
    }

    try {
      console.log('📤 Fetching pending users with token:', token.substring(0, 20) + '...');
      
      const response = await fetch('http://localhost:5000/api/superadmin/users/pending', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log('📥 Response:', data);
      
      setResult({ success: response.ok, data, status: response.status });
    } catch (error) {
      console.error('❌ Error:', error);
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testFetchStats = async () => {
    setLoading(true);
    setResult(null);

    const token = localStorage.getItem('token');
    
    if (!token) {
      setResult({ success: false, error: 'No token found. Please login as super admin first.' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/superadmin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      setResult({ success: response.ok, data, status: response.status });
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1>Super Admin API Test</h1>

      <div style={{ marginBottom: '20px', background: '#f0f0f0', padding: '15px', borderRadius: '8px' }}>
        <p><strong>Token Status:</strong> {localStorage.getItem('token') ? '✅ Found' : '❌ Not Found'}</p>
        {localStorage.getItem('token') && (
          <p style={{ fontSize: '12px', wordBreak: 'break-all' }}>
            <strong>Token:</strong> {localStorage.getItem('token').substring(0, 50)}...
          </p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testFetchPending} 
          disabled={loading}
          style={{ padding: '10px 20px', marginRight: '10px', cursor: 'pointer' }}
        >
          Test Fetch Pending Users
        </button>
        
        <button 
          onClick={testFetchStats} 
          disabled={loading}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          Test Fetch Stats
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
          {result.status && <p><strong>Status Code:</strong> {result.status}</p>}
          <pre style={{ fontSize: '12px', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>First, login as Super Admin at <a href="/signin">/signin</a></li>
          <li>Then come back to this page</li>
          <li>Click "Test Fetch Pending Users" to see if the API returns pending approvals</li>
          <li>Check browser console (F12) and backend terminal for logs</li>
        </ol>
      </div>
    </div>
  );
}

export default TestSuperAdminAPI;
