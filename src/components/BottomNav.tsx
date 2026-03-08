import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { LayoutGrid, Flag, User, History, Library, FileText, Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import VoiceQuickCaptureModal from "./VoiceQuickCaptureModal";

const HOLD_MS = 2000;

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startTsRef = useRef<number | null>(null);
  const longPressedRef = useRef(false);

  const navItemsLeft = [
    { name: "Home", icon: LayoutGrid, path: "/" },
    { name: "Goals", icon: Flag, path: "/goals" },
    { name: "Lib", icon: Library, path: "/knowledge" },
  ];

  const navItemsRight = [
    { name: "History", icon: History, path: "/history" },
    { name: "Report", icon: FileText, path: "/report" },
    { name: "Profile", icon: User, path: "/profile" },
  ];

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const clearHold = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTsRef.current = null;
    setHoldProgress(0);
  };

  const onFabPointerDown = () => {
    longPressedRef.current = false;
    startTsRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      if (!startTsRef.current) return;
      const elapsed = Date.now() - startTsRef.current;
      const p = Math.min(1, elapsed / HOLD_MS);
      setHoldProgress(p);
      if (p >= 1) {
        longPressedRef.current = true;
        clearHold();
        setShowVoiceModal(true);
      }
    }, 16);
  };

  const onFabPointerUp = () => {
    if (!longPressedRef.current) {
      clearHold();
      navigate('/record');
      return;
    }
    clearHold();
  };

  const renderItem = (item: { name: string; icon: any; path: string }) => {
    const isActive = path === item.path;
    const Icon = item.icon;
    return (
      <Link
        key={item.name}
        to={item.path}
        className="flex flex-col items-center justify-center w-12 h-10 transition-colors group"
      >
        <Icon
          size={24}
          strokeWidth={isActive ? 2.5 : 2}
          className={cn(
            "mb-0.5 transition-all",
            isActive ? "text-[#9DC5EF] drop-shadow-sm" : "text-gray-400 group-hover:text-gray-600"
          )}
        />
        <span
          className={cn(
            "text-[10px] font-medium transition-all",
            isActive
              ? "bg-gradient-to-br from-[#9DC5EF] to-[#FFB3C1] bg-clip-text text-transparent font-bold"
              : "text-gray-400 group-hover:text-gray-600"
          )}
        >
          {item.name}
        </span>
      </Link>
    );
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-between items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] w-full max-w-md mx-auto px-2 pt-2"
        style={{
          height: 'calc(84px + env(safe-area-inset-bottom))',
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))'
        }}
      >
        <div className="flex justify-between w-full relative">
          <div className="flex justify-around flex-1">
            {navItemsLeft.map(renderItem)}
          </div>

          {/* Floating Action Button */}
          <div className="w-16 flex justify-center relative">
            <button
              type="button"
              onPointerDown={onFabPointerDown}
              onPointerUp={onFabPointerUp}
              onPointerLeave={clearHold}
              onPointerCancel={clearHold}
              className="absolute -top-8 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-[#9DC5EF] to-[#FFB3C1] text-white shadow-[0_8px_16px_-4px_rgba(157,197,239,0.5)] hover:shadow-[0_12px_20px_-4px_rgba(157,197,239,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-200 z-50"
            >
              {holdProgress > 0 && (
                <svg className="absolute inset-0 w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="25" stroke="rgba(255,255,255,0.35)" strokeWidth="3" fill="none" />
                  <circle
                    cx="28"
                    cy="28"
                    r="25"
                    stroke="white"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 25}
                    strokeDashoffset={(1 - holdProgress) * 2 * Math.PI * 25}
                  />
                </svg>
              )}
              <Mic size={24} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex justify-around flex-1">
            {navItemsRight.map(renderItem)}
          </div>
        </div>
      </nav>

      <VoiceQuickCaptureModal
        open={showVoiceModal}
        onClose={() => {
          setShowVoiceModal(false);
          clearHold();
        }}
        sourcePage={path}
      />
    </>
  );
}
