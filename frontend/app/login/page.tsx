'use client';
import { useEffect } from 'react';
import { CasdoorSDK } from '@/lib/casdoor';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/files');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogin = () => {
    // Redirect to Casdoor login page
    window.location.href = CasdoorSDK.getSigninUrl();
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">DeepTutor Writer</h1>
        <p className="text-gray-600 mb-8">Please sign in to access the collaboration platform.</p>
        
        <button 
          onClick={handleLogin}
          className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-200"
        >
          Sign in with Casdoor
        </button>
        
        <p className="mt-6 text-xs text-gray-500">
          Powered by Casdoor Authentication
        </p>
      </div>
    </div>
  );
}
