import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Sparkles, Sprout, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

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
                // Optional: show "Check email for confirmation" if email confirmations are enabled
            }
        } catch (err: any) {
            console.error("Auth error:", err);
            setErrorMsg(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex justify-center font-sans text-gray-900">
            <div className="w-full max-w-md bg-white min-h-screen flex flex-col justify-center px-8">

                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 rounded-[20px] bg-[#F4F6F5] border border-[#E5ECE9] flex items-center justify-center mb-6">
                        <Sprout className="text-[#849B87]" size={36} strokeWidth={1.5} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
                        10-Day Flow
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">
                        {isLogin ? "Welcome back to your journey" : "Start your growth loop today"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
                    {errorMsg && (
                        <div className="p-3 rounded-[12px] bg-red-50 text-red-600 text-sm border border-red-100 flex items-center gap-2">
                            <Sparkles size={16} /> {/* Replace with alert icon if needed */}
                            {errorMsg}
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
                        className="w-full flex items-center justify-center gap-2 py-3.5 mt-8 rounded-[16px] bg-[#849B87] text-white font-medium text-[15px] hover:bg-[#728775] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                    >
                        {loading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>
                                {isLogin ? "Log In" : "Sign Up"}
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setErrorMsg("");
                            }}
                            className="font-medium text-[#849B87] hover:text-[#728775] transition-colors"
                        >
                            {isLogin ? "Sign up" : "Log in"}
                        </button>
                    </p>
                </div>

            </div>
        </div>
    );
}
