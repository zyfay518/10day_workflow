import React, { useEffect, useState } from "react";
import { Infinity as InfinityIcon } from "lucide-react";
import { cn } from "../lib/utils";

interface SplashProps {
    onFinish?: () => void;
    loading?: boolean;
}

export default function Splash({ onFinish, loading = false }: SplashProps) {
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        if (!onFinish) return;

        // Show splash for 1.2s, then start fade out (.3s)
        const fadeTimer = setTimeout(() => {
            setFadeOut(true);
        }, 1200);

        const completeTimer = setTimeout(() => {
            onFinish();
        }, 1500);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(completeTimer);
        };
    }, [onFinish]);

    return (
        <div className={cn(
            "fixed inset-0 min-h-screen bg-[#FDFDFD] flex items-center justify-center z-[100] transition-opacity duration-300",
            onFinish ? (fadeOut ? "opacity-0" : "opacity-100") : "opacity-100"
        )}>
            <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-blue-200 to-pink-200 flex items-center justify-center shadow-xl shadow-pink-500/20 mb-6 relative animate-pulse-slow">
                    <div className="absolute inset-0 bg-white/20 blur-md rounded-[24px]"></div>
                    <InfinityIcon className="text-white relative z-10" size={40} strokeWidth={2} />
                </div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 tracking-tight">
                    10-Day Flow
                </h1>
                <p className="text-gray-400 mt-2 text-sm font-medium tracking-wide pb-8">
                    GROWTH LOOP
                </p>
                {loading && (
                    <div className="flex flex-col items-center gap-3 pb-8">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#9DC5EF] animate-bounce" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#C7B6A6] animate-bounce [animation-delay:120ms]" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#D8AFAF] animate-bounce [animation-delay:240ms]" />
                        </div>
                        <p className="text-xs tracking-wide text-gray-500">Loading your workspace...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
