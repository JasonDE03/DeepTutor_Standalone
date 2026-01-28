'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CasdoorSDK } from '@/lib/casdoor';
import { useAuth } from '@/contexts/AuthContext';

export default function CallbackPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [status, setStatus] = useState('Authenticating...');

  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double invocation in Strict Mode
    if (processedRef.current) return;
    processedRef.current = true;

    // Casdoor redirects back with `code` and `state`
    // We strictly use Authorization Code Grant flow here as per best practices
    
    const handleCallback = async () => {
      try {
        // Log URL and query parameters for debugging
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        console.log("Callback URL:", window.location.href);
        console.log("URL Parameters:", {
          code: code ? `${code.substring(0, 10)}...` : 'missing',
          state: state ? `${state.substring(0, 10)}...` : 'missing',
          error: error || 'none'
        });

        // Check for OAuth errors in URL
        if (error) {
          const errorDesc = urlParams.get('error_description') || 'No description provided';
          throw new Error(`OAuth Error: ${error} - ${errorDesc}`);
        }

        // Check for required OAuth parameters
        if (!code || !state) {
          throw new Error(`Missing OAuth parameters. Code: ${code ? 'present' : 'missing'}, State: ${state ? 'present' : 'missing'}`);
        }

        console.log("Starting token exchange...");
        const res = await CasdoorSDK.exchangeForAccessToken();
        console.log("Exchange response:", res);
        
        if (res && res.access_token && res.access_token.length > 0) {
           setStatus('Fetching user profile...');
           
           let userInfo = null;
           try {
              const userRes = await fetch(`${CasdoorSDK.serverUrl}/api/get-account`, {
                  headers: { 'Authorization': `Bearer ${res.access_token}` }
              });
              const userData = await userRes.json();
              console.log("User profile response:", userData);
              if(userData.status === 'ok') {
                  userInfo = userData.data;
              }
           } catch(e) {
               console.warn("Could not fetch full profile, falling back to token decode", e);
           }
           
           if (!userInfo) {
               try {
                   const payload = JSON.parse(atob(res.access_token.split('.')[1]));
                  userInfo = {
                      id: payload.sub || payload.id,
                      name: payload.name,
                      avatar: payload.avatar,
                      email: payload.email,
                      isAdmin: payload.isAdmin || payload.isGlobalAdmin,
                      role: payload.roles?.[0]?.name || payload.roles?.[0] || 'viewer'
                  };
               } catch(e) {
                   throw new Error("Invalid token format");
               }
           }

           // Determine role logic
           let finalRole = userInfo.role || 'viewer';
           if (userInfo.isAdmin || userInfo.isGlobalAdmin || userInfo.name === 'admin' || userInfo.username === 'admin') {
               finalRole = 'admin';
           }

           const user = {
               id: userInfo.id || userInfo.sub,
               username: userInfo.name || userInfo.username || userInfo.displayName,
               email: userInfo.email,
               role: finalRole
           };
           
           console.log("Login success:", user);
           login(res.access_token, user);
           setStatus('Redirecting...');
           router.push('/files');
        } else {
            console.error("Exchange failed, response:", res);
             // Special handling for Invalid State to make it clearer
            if (res && res.error === 'Invalid State') {
                throw new Error("Session expired or invalid state. Please return to login page and try again.");
            }
            throw new Error(res?.msg || "No access token returned from Casdoor");
        }
      } catch (err: any) {
        console.error('Auth failed - Full error object:', err);
        console.error('Auth failed - Error type:', typeof err);
        console.error('Auth failed - Error constructor:', err?.constructor?.name);
        console.error('Auth failed - Is Error instance?:', err instanceof Error);
        
        let errMsg = "Unknown error";
        if (err instanceof Error) {
            errMsg = err.message;
        } else if (typeof err === 'string') {
            errMsg = err;
        } else {
             try {
                errMsg = JSON.stringify(err);
                if (errMsg === '{}') errMsg = "SDK returned empty error object (check console for manual fetch logs)";
             } catch (e) { 
                errMsg = String(err); 
             }
        }
        
        setStatus(`Authentication failed: ${errMsg}`);
      }
    };

    handleCallback();
  }, [login, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full">
        {status.startsWith('Authentication failed') || status.includes('expired') ? (
            <div>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">⚠️</span>
                </div>
                <h2 className="text-xl font-bold text-red-600 mb-2">Login Failed</h2>
                <p className="text-gray-600 mb-6 text-sm break-words">{status.replace('Authentication failed: ', '')}</p>
                
                <button 
                  onClick={() => router.push('/login')}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Return to Login
                </button>
            </div>
        ) : (
            <>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-700 font-medium">{status}</p>
                <p className="text-xs text-gray-500 mt-2">Please wait while we set up your session...</p>
            </>
        )}
      </div>
    </div>
  );
}
