'use client';

import { useState, useEffect, useCallback } from 'react';

export default function AdminPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [blacklistedIPs, setBlacklistedIPs] = useState<string[]>([]);
  const [newIP, setNewIP] = useState('');
  const [status, setStatus] = useState('');
  const [authCredentials, setAuthCredentials] = useState('');

  // Create handleLogout function first to avoid circular dependency
  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setAuthCredentials('');
    localStorage.removeItem('authCredentials');
    setUsername('');
    setPassword('');
  }, []);

  // Create fetchBlacklistedIPs as a useCallback to use it in the dependency array
  const fetchBlacklistedIPs = useCallback(async (credentials: string) => {
    try {
      const response = await fetch('/api/report', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        body: JSON.stringify({ action: 'list' })
      });

      if (response.ok) {
        const data = await response.json();
        setBlacklistedIPs(data.blacklistedIPs || []);
      } else {
        // If unauthorized, log the user out
        if (response.status === 401) {
          handleLogout();
        }
        setStatus('Failed to fetch blacklisted IPs');
      }
    } catch (error) {
      // Silence the unused variable error by actually using it
      console.error('Error fetching blacklisted IPs:', error);
      setStatus('Error fetching blacklisted IPs');
    }
  }, [handleLogout]);

  useEffect(() => {
    // Check if authentication credentials are stored in localStorage
    const storedAuth = localStorage.getItem('authCredentials');
    if (storedAuth) {
      setAuthCredentials(storedAuth);
      setIsAuthenticated(true);
      fetchBlacklistedIPs(storedAuth);
    }
  }, [fetchBlacklistedIPs]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create Base64 encoded credentials
    const credentials = btoa(`${username}:${password}`);
    
    try {
      // Test credentials with a list request
      const response = await fetch('/api/report', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        body: JSON.stringify({ action: 'list' })
      });

      if (response.ok) {
        // Save credentials and update state
        setAuthCredentials(credentials);
        localStorage.setItem('authCredentials', credentials);
        setIsAuthenticated(true);
        
        // Load the blacklisted IPs
        const data = await response.json();
        setBlacklistedIPs(data.blacklistedIPs || []);
        setStatus('');
      } else {
        setStatus('Invalid credentials');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setStatus('Login failed. Please try again.');
    }
  };

  const blacklistIP = async () => {
    if (!newIP) return;

    try {
      const response = await fetch('/api/report', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authCredentials}`
        },
        body: JSON.stringify({ action: 'blacklist', ip: newIP })
      });

      if (response.ok) {
        setStatus(`IP ${newIP} has been blacklisted`);
        setNewIP('');
        fetchBlacklistedIPs(authCredentials);
      } else {
        // If unauthorized, log the user out
        if (response.status === 401) {
          handleLogout();
        }
        setStatus('Failed to blacklist IP');
      }
    } catch (error) {
      console.error('Error blacklisting IP:', error);
      setStatus('Error blacklisting IP');
    }
  };

  const removeFromBlacklist = async (ip: string) => {
    try {
      const response = await fetch('/api/report', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authCredentials}`
        },
        body: JSON.stringify({ action: 'unblacklist', ip })
      });

      if (response.ok) {
        setStatus(`IP ${ip} has been removed from blacklist`);
        fetchBlacklistedIPs(authCredentials);
      } else {
        // If unauthorized, log the user out
        if (response.status === 401) {
          handleLogout();
        }
        setStatus('Failed to remove IP from blacklist');
      }
    } catch (error) {
      console.error('Error removing from blacklist:', error);
      setStatus('Error removing IP from blacklist');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-black border-2 border-white p-8 rounded-lg shadow-xl w-full max-w-md">
          <h1 className="text-white text-2xl mb-6 text-center">Admin Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full p-2 bg-black text-white border border-white rounded"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-2 bg-black text-white border border-white rounded"
            />
            <button
              type="submit"
              className="w-full p-2 bg-black text-white border border-white rounded hover:bg-gray-900"
            >
              Login
            </button>
            {status && <p className="text-red-500 text-center">{status}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-white text-2xl">IP Blacklist Management</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-800 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        <div className="bg-black border-2 border-white p-6 rounded-lg shadow-xl mb-8">
          <h2 className="text-white text-xl mb-4">Add IP to Blacklist</h2>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              placeholder="IP Address"
              className="flex-grow p-2 bg-black text-white border border-white rounded"
            />
            <button
              onClick={blacklistIP}
              className="px-4 py-2 bg-black text-white border border-white rounded hover:bg-gray-900"
            >
              Blacklist
            </button>
          </div>
        </div>

        <div className="bg-black border-2 border-white p-6 rounded-lg shadow-xl">
          <h2 className="text-white text-xl mb-4">Blacklisted IPs</h2>
          {blacklistedIPs.length === 0 ? (
            <p className="text-gray-400">No blacklisted IPs found</p>
          ) : (
            <ul className="space-y-2">
              {blacklistedIPs.map((ip) => (
                <li key={ip} className="flex justify-between items-center border-b border-gray-800 pb-2">
                  <span className="text-white">{ip}</span>
                  <button
                    onClick={() => removeFromBlacklist(ip)}
                    className="px-2 py-1 text-sm bg-red-800 text-white rounded hover:bg-red-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {status && (
          <div className="mt-4 p-4 bg-black border border-gray-600 rounded text-white">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}