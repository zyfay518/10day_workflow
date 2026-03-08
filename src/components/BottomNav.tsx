import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import { LayoutGrid, Flag, User, History, Library, FileText, Mic } from "lucide-react";

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

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
          <Link
            to="/record"
            className="absolute -top-8 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-[#9DC5EF] to-[#FFB3C1] text-white shadow-[0_8px_16px_-4px_rgba(157,197,239,0.5)] hover:shadow-[0_12px_20px_-4px_rgba(157,197,239,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-200 z-50"
          >
            <Mic size={24} strokeWidth={2.5} />
          </Link>
        </div>

        <div className="flex justify-around flex-1">
          {navItemsRight.map(renderItem)}
        </div>
      </div>
    </nav>
  );
}
