'use client';
import { useState } from 'react';
import { authAPI } from '@/lib/api';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const result = await authAPI.forgotPassword(email);
      setMessage(result.message);
      if (result.resetToken) {
        console.log('Reset token (dev only):', result.resetToken);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F6] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1A2436]">Nerd</h1>
          <p className="text-[#6B7280] mt-2">AI Study Companion</p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-[#1A2436] mb-2">Reset Password</h2>
          <p className="text-sm text-[#6B7280] mb-6">Enter your email and we'll send you a link to reset your password.</p>
          
          {message && (
            <div className="mb-4 p-3 bg-green-100 text-green-600 rounded text-sm">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-600 rounded text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#1A2436] mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 p-3 border border-[#9DAA9D] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DAA9D]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#9DAA9D] text-white rounded-lg hover:bg-[#7A8B7A] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-[#6B7280]">
            Remember your password?{' '}
            <Link href="/login" className="text-[#9DAA9D] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
