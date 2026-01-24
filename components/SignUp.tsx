import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Mail, Lock, User, Upload, Loader2, Eye, EyeOff, CheckCircle, ArrowRight } from 'lucide-react';
import { authService } from '../services/authService';

interface SignUpProps {
    onClose: () => void;
    onSwitchToSignIn: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onClose, onSwitchToSignIn }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const getPasswordStrength = (pwd: string) => {
        if (pwd.length < 6) return { strength: 'weak', color: 'bg-red-500', text: 'Weak' };
        if (pwd.length < 10) return { strength: 'medium', color: 'bg-yellow-500', text: 'Medium' };
        if (pwd.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)) {
            return { strength: 'strong', color: 'bg-green-500', text: 'Strong' };
        }
        return { strength: 'medium', color: 'bg-yellow-500', text: 'Medium' };
    };

    const passwordStrength = password ? getPasswordStrength(password) : null;

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password || !username) {
            setError('Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        try {
            const { session } = await authService.signUp(email, password, username);
            if (session) {
                // Auto-confirmed (Email confirmation disabled in Supabase)
                onClose();
            } else {
                // Email confirmation required
                setIsSuccess(true);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create account');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative glass-dark p-10 rounded-[40px] w-full max-w-md shadow-2xl border border-white/10"
            >
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                {isSuccess ? (
                    <div className="flex flex-col items-center text-center py-8">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle className="text-green-500" size={40} />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4">Check your email</h2>
                        <p className="text-white/60 mb-8 leading-relaxed">
                            We've sent a confirmation link to <span className="text-white font-semibold">{email}</span>.
                            <br />
                            Please activate your account to get started.
                        </p>
                        <button
                            onClick={onSwitchToSignIn}
                            className="w-full bg-white/10 hover:bg-white/20 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                            Back to Sign In
                            <ArrowRight size={20} />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
                            <p className="text-white/60">Start your language learning journey</p>
                        </div>

                        <form onSubmit={handleSignUp} className="space-y-5">
                            {/* Username */}
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">
                                    Username
                                </label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Choose a username"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>

                                {/* Password Strength Indicator */}
                                {passwordStrength && (
                                    <div className="mt-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${passwordStrength.color} transition-all`}
                                                    style={{ width: passwordStrength.strength === 'weak' ? '33%' : passwordStrength.strength === 'medium' ? '66%' : '100%' }}
                                                />
                                            </div>
                                            <span className="text-xs text-white/60">{passwordStrength.text}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-blue-500 text-white py-4 rounded-2xl font-bold hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Creating Account...
                                    </>
                                ) : (
                                    'Create Account'
                                )}
                            </button>

                            {/* Switch to Sign In */}
                            <div className="text-center pt-4">
                                <p className="text-white/60 text-sm">
                                    Already have an account?{' '}
                                    <button
                                        type="button"
                                        onClick={onSwitchToSignIn}
                                        className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                    >
                                        Sign In
                                    </button>
                                </p>
                            </div>
                        </form>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default SignUp;
