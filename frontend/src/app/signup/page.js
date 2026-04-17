'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Check, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { authAPI } from '@/lib/api';

const passwordRequirements = [
  { regex: /.{8,}/, label: 'At least 8 characters' },
  { regex: /[A-Z]/, label: 'One uppercase letter' },
  { regex: /[a-z]/, label: 'One lowercase letter' },
  { regex: /[0-9]/, label: 'One number' },
  { regex: /[!@#$%^&*(),.?":{}|<>]/, label: 'One special character' },
];

export default function Signup() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [tempToken, setTempToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const otpRefs = useRef([]);
  const { login: authLogin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const passwordStrength = useMemo(() => {
    const passed = passwordRequirements.filter(req => req.regex.test(password)).length;
    if (passed === 0) return { score: 0, color: 'bg-slate-200', label: '', textColor: 'text-slate-400' };
    if (passed <= 1) return { score: 1, color: 'bg-rose-500', label: 'Weak', textColor: 'text-rose-500' };
    if (passed <= 3) return { score: 2, color: 'bg-amber-500', label: 'Medium', textColor: 'text-amber-500' };
    return { score: 3, color: 'bg-emerald-500', label: 'Strong', textColor: 'text-emerald-500' };
  }, [password]);

  const handleSubmitDetails = async (e) => {
    e.preventDefault();
    setError('');

    if (passwordStrength.score < 3) {
      setError('Please meet all password requirements');
      return;
    }

    setLoading(true);

    try {
      const result = await authAPI.registerInit(email, password, name);
      setTempToken(result.tempToken);
      setMaskedEmail(result.email);
      setResendTimer(60);
      setStep(2);
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors && errors.length > 0) {
        setError(errors[0]);
      } else {
        setError(err.response?.data?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (newOtp.every(digit => digit) && newOtp.join('').length === 6) {
      handleVerifyOTP(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;
    
    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    
    if (pastedData.length === 6) {
      handleVerifyOTP(pastedData);
    } else {
      otpRefs.current[pastedData.length]?.focus();
    }
  };

  const handleVerifyOTP = async (otpCode) => {
    setLoading(true);
    setError('');

    try {
      const result = await authAPI.registerVerify(tempToken, otpCode);
      localStorage.setItem('token', result.token);
      if (result.refreshToken) {
        localStorage.setItem('refreshToken', result.refreshToken);
      }
      await authLogin(result.token, result.refreshToken, result);
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    
    setResendLoading(true);
    setError('');

    try {
      const result = await authAPI.resendOTP(email);
      setMaskedEmail(result.email);
      setResendTimer(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setError('');
    setOtp(['', '', '', '', '', '']);
  };

  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/google`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-slate-200/40 dark:bg-slate-700/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-slate-300/30 dark:bg-slate-600/30 rounded-full blur-3xl"></div>
        <div className="absolute top-3/4 left-1/4 w-64 h-64 bg-slate-200/20 dark:bg-slate-700/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl mb-4 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-700 dark:from-slate-200 to-slate-900 dark:to-slate-100 bg-clip-text text-transparent">
            Nerd
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Your AI Study Companion</p>
        </div>

        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/50 dark:border-slate-700/50">
          {step === 1 ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Create account</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Start your learning journey today</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-xl text-sm animate-shake">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-3.5 mb-6 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-all duration-200 flex items-center justify-center gap-3 shadow-sm hover:shadow-md group"
              >
                <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-medium text-slate-700 dark:text-slate-200">Continue with Google</span>
              </button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-white dark:bg-slate-800 text-sm text-slate-500 dark:text-slate-400">or continue with email</span>
                </div>
              </div>

              <form onSubmit={handleSubmitDetails} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-500 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all duration-200 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                      placeholder="Your full name"
                      required
                      minLength={2}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-500 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all duration-200 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-500 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all duration-200 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                      placeholder="Create a strong password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {password && (
                  <>
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              passwordStrength.score >= level ? passwordStrength.color : 'bg-slate-200 dark:bg-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                      {passwordStrength.label && (
                        <p className={`text-xs font-medium ${passwordStrength.textColor}`}>
                          {passwordStrength.label} password
                        </p>
                      )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 space-y-2">
                      {passwordRequirements.map((req, idx) => {
                        const isMet = req.regex.test(password);
                        return (
                          <div key={idx} className="flex items-center gap-3 text-sm">
                            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                              isMet ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-200 dark:bg-slate-600'
                            }`}>
                              {isMet ? (
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500"></div>
                              )}
                            </div>
                            <span className={isMet ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>
                              {req.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-medium shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 hover:shadow-xl hover:shadow-emerald-300 dark:hover:shadow-emerald-900/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 group"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Sending code...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
                <Link href="/login" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">Sign in</Link>
              </p>
            </>
          ) : (
            <>
              <div className="mb-8">
                <button
                  type="button"
                  onClick={handleBack}
                  className="mb-4 p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Verify your email</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  We sent a code to <span className="font-medium">{maskedEmail}</span>
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-xl text-sm animate-shake">
                  {error}
                </div>
              )}

              <div className="mb-8">
                <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOTPChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-14 text-center text-2xl font-bold bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-500 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all duration-200 text-slate-800 dark:text-slate-100"
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleVerifyOTP(otp.join(''))}
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-medium shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 hover:shadow-xl hover:shadow-emerald-300 dark:hover:shadow-emerald-900/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <div className="mt-6 text-center">
                  {resendTimer > 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Resend code in <span className="font-medium">{resendTimer}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={resendLoading}
                      className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-medium disabled:opacity-50"
                    >
                      {resendLoading ? 'Sending...' : 'Resend verification code'}
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  <span className="font-medium">Tip:</span> Check your spam folder if you don't receive the email within a few minutes.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
