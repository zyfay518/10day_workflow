import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Sparkles, Infinity as InfinityIcon, Lock, Mail, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const { signIn, signUp, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate("/", { replace: true });
        }
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");
        setLoading(true);

        try {
            if (isLogin) {
                const { error } = await signIn(email, password);
                if (error) throw error;
            } else {
                const { error } = await signUp(email, password);
                if (error) throw error;
                setSuccessMsg("Account created! Please check your email to confirm.");
            }
        } catch (err: any) {
            console.error("Auth error:", err);
            setErrorMsg(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFDFD] flex justify-center font-sans text-gray-900 selection:bg-[#B4D2C8] selection:text-gray-900">
            <div className="w-full max-w-md bg-white min-h-screen relative shadow-xl overflow-hidden flex flex-col justify-center px-8 relative">

                {/* Decorative background shapes */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] right-[-10%] w-64 h-64 rounded-full bg-blue-100 blur-3xl opacity-60"></div>
                    <div className="absolute bottom-[-5%] left-[-10%] w-72 h-72 rounded-full bg-purple-100 blur-3xl opacity-60"></div>
                </div>

                <div className="relative z-10 flex flex-col items-center mb-10">
                    <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/20 mb-6 relative">
                        <div className="absolute inset-0 bg-white/20 blur-md rounded-[20px]"></div>
                        <InfinityIcon className="text-white relative z-10" size={32} strokeWidth={2} />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 mb-2">
                        10-Day Flow
                    </h1>
                    <p className="text-gray-500 text-center font-medium">
                        {isLogin ? "Welcome back to your journey" : "Start your growth loop today"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
                    {errorMsg && (
                        <div className="p-3 rounded-[12px] bg-red-50 text-red-600 text-sm border border-red-100 flex items-center gap-2">
                            <Sparkles size={16} />
                            {errorMsg}
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-3 rounded-[12px] bg-green-50 text-green-700 text-sm border border-green-100 flex items-center gap-2">
                            <CheckCircle2 size={16} />
                            {successMsg}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail size={18} className="text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#849B87]/30 focus:border-[#849B87] transition-all"
                                    placeholder="Enter your email"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock size={18} className="text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#849B87]/30 focus:border-[#849B87] transition-all"
                                    placeholder={isLogin ? "Enter your password" : "Create a password (min 6 chars)"}
                                    minLength={6}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-4 mt-8 rounded-[16px] bg-gray-900 text-white font-semibold text-base hover:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-900/10 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                    >
                        {loading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <>
                                {isLogin ? "Log In" : "Sign Up"}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="relative z-10 mt-8 text-center">
                    <p className="text-sm text-gray-500">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setErrorMsg("");
                                setSuccessMsg("");
                            }}
                            className="font-bold text-gray-900 hover:text-gray-600 transition-colors"
                        >
                            {isLogin ? "Sign up" : "Log in"}
                        </button>
                    </p>
                </div>

            </div>
        </div>
    );
}
