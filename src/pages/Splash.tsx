import React, { useEffect, useState } from "react";
import { Infinity as InfinityIcon } from "lucide-react";
import { cn } from "../lib/utils";

interface SplashProps {
    onFinish: () => void;
}

export default function Splash({ onFinish }: SplashProps) {
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
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
            fadeOut ? "opacity-0" : "opacity-100"
        )}>
            <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-blue-200 to-pink-200 flex items-center justify-center shadow-xl shadow-pink-500/20 mb-6 relative animate-pulse-slow">
                    <div className="absolute inset-0 bg-white/20 blur-md rounded-[24px]"></div>
                    <InfinityIcon className="text-white relative z-10" size={40} strokeWidth={2} />
                </div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 tracking-tight">
                    10-Day Flow
                </h1>
                <p className="text-gray-400 mt-2 text-sm font-medium tracking-wide pb-16">
                    GROWTH LOOP
                </p>
            </div>
        </div>
    );
}
