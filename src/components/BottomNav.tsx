import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { LayoutGrid, Flag, User, History, Library, FileText, Mic, PenLine } from "lucide-react";
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
          height: 'calc(88px + env(safe-area-inset-bottom))',
          paddingBottom: 'calc(1.3rem + env(safe-area-inset-bottom))'
        }}
      >
        <div className="flex justify-between w-full relative">
          <div className="flex justify-around w-1/2 pr-8">
            {navItemsLeft.map(renderItem)}
          </div>

            {/* Floating Action Button (hard-centered) */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-14 z-50">
            <button
              type="button"
              onPointerDown={onFabPointerDown}
              onPointerUp={onFabPointerUp}
              onPointerLeave={clearHold}
              onPointerCancel={clearHold}
              className="relative flex items-center justify-center w-20 h-20 rounded-full text-white transition-all duration-200"
              aria-label="Click to record, hold 2 seconds for voice"
            >
              <div className="absolute inset-0 rounded-full border-2 border-[#D6DEE8] bg-white shadow-[0_8px_16px_-6px_rgba(0,0,0,0.15)]" />
              <svg className="absolute inset-0 w-20 h-20" viewBox="0 0 80 80" aria-hidden="true">
                <text fill="#9AA6B4" fontSize="6" fontWeight="600" letterSpacing="1.1">
                  <text x="18" y="13">HOLD FOR VOICE</text>
                  <text x="62" y="13" textAnchor="end">HOLD FOR VOICE</text>
                </text>
              </svg>

              {holdProgress > 0 && (
                <svg className="absolute inset-0 w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" stroke="rgba(157,197,239,0.25)" strokeWidth="3" fill="none" />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    stroke="#9DC5EF"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={(1 - holdProgress) * 2 * Math.PI * 34}
                  />
                </svg>
              )}

              <div className="absolute left-1/2 top-1.5 -translate-x-1/2 z-30 w-5 h-5 rounded-full bg-[#F7FAFD] border border-[#D8E2EE] flex items-center justify-center shadow-sm pointer-events-none">
                <Mic size={11} strokeWidth={2.4} className="text-[#6F8EAF]" />
              </div>

              <div className="relative z-10 w-14 h-14 rounded-full bg-gradient-to-tr from-[#9DC5EF] to-[#FFB3C1] flex flex-col items-center justify-center shadow-[0_10px_20px_-4px_rgba(157,197,239,0.45)]">
                <span className="text-[10px] leading-none font-semibold tracking-wide">Click</span>
                <div className="flex items-center mt-1">
                  <PenLine size={12} strokeWidth={2.2} />
                </div>
              </div>
            </button>
          </div>

          <div className="flex justify-around w-1/2 pl-8">
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
