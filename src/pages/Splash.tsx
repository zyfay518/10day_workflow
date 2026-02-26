import React, { useEffect, useState } from "react";
import { Sprout } from "lucide-react";
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
            "fixed inset-0 min-h-screen bg-[#F9FAFB] flex items-center justify-center z-[100] transition-opacity duration-300",
            fadeOut ? "opacity-0" : "opacity-100"
        )}>
            <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-[24px] bg-[#F4F6F5] border border-[#E5ECE9] flex items-center justify-center shadow-sm mb-6 animate-pulse-slow">
                    <Sprout className="text-[#849B87]" size={40} strokeWidth={1.5} />
                </div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                    10-Day Flow
                </h1>
            </div>
        </div>
    );
}
