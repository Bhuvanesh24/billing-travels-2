import { useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { useDrive } from '../services/useDrive';
import { Lock, User, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const { login } = useAuth();
    const { signIn } = useDrive();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [shaking, setShaking] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Please enter both username and password');
            triggerShake();
            return;
        }

        const success = login(username, password);
        if (!success) {
            setError('Invalid username or password');
            triggerShake();
        }
    };

    const triggerShake = () => {
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Company Header */}
                <div className="text-center mb-8">
                    <h1
                        className="text-3xl font-bold mb-2"
                        style={{ color: '#8B0000' }}
                    >
                        SRI GOKILAM TRAVELS
                    </h1>
                    <p className="text-sm text-slate-500">Invoice Management System</p>
                </div>

                {/* Login Card */}
                <div
                    className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-8 transition-transform ${shaking ? 'animate-shake' : ''}`}
                >
                    <div className="flex justify-center mb-6">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: '#FFF5F5', color: '#8B0000' }}
                        >
                            <Lock size={28} />
                        </div>
                    </div>

                    <h2 className="text-xl font-semibold text-slate-900 text-center mb-1">
                        Welcome Back
                    </h2>
                    <p className="text-sm text-slate-400 text-center mb-6">
                        Sign in to continue
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Username
                            </label>
                            <div className="relative">
                                <User
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 outline-none text-sm"
                                    style={{ '--tw-ring-color': '#8B0000' } as React.CSSProperties}
                                    placeholder="Enter username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <Lock
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="w-full pl-10 pr-12 py-2.5 border border-slate-300 rounded-lg focus:ring-2 outline-none text-sm"
                                    style={{ '--tw-ring-color': '#8B0000' } as React.CSSProperties}
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full text-white py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm"
                            style={{ backgroundColor: '#8B0000' }}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor = '#A52A2A')
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor = '#8B0000')
                            }
                        >
                            Sign In to ERP
                        </button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-100"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase tracking-widest font-black">
                                <span className="bg-white px-4 text-slate-300">Cloud Sync (Optional)</span>
                            </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => signIn()}
                          className="w-full bg-white border border-slate-200 text-slate-700 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm"
                        >
                          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                          Connect Google Drive
                        </button>
                    </form>
                </div>
            </div>

            {/* Shake animation style */}
            <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
        </div>
    );
}
