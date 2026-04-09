'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const userStr = searchParams.get('user');

    if (token && userStr) {
      localStorage.setItem('token', token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        window.location.href = '/dashboard';
      } catch (error) {
        console.error('Failed to parse user data:', error);
        window.location.href = '/login?error=auth_failed';
      }
    } else {
      window.location.href = '/login?error=auth_failed';
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#F9F9F6] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#9DAA9D] mx-auto mb-4" />
        <p className="text-[#6B7280]">Completing sign in...</p>
      </div>
    </div>
  );
}
