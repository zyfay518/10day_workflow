import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import { LayoutGrid, Flag, Edit, History, Library, FileText } from "lucide-react";

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { name: "Home", icon: LayoutGrid, path: "/" },
    { name: "Goals", icon: Flag, path: "/goals" },
    { name: "Record", icon: Edit, path: "/record" },
    { name: "History", icon: History, path: "/history" },
    { name: "Lib", icon: Library, path: "/knowledge" },
    { name: "Report", icon: FileText, path: "/report" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 h-[84px] pb-5 px-6 flex justify-between items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] w-full max-w-md mx-auto">
      {navItems.map((item) => {
        const isActive = path === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            to={item.path}
            className="flex flex-col items-center justify-center w-10 h-10 transition-colors group"
          >
            <Icon
              size={24}
              strokeWidth={isActive ? 2.5 : 2}
              className={cn(
                "mb-0.5 transition-all text-gray-400 group-hover:text-gray-600",
                isActive && "text-[#9DC5EF] drop-shadow-sm" // SVG can't use bg-clip-text gradient easily without fill url(), fallback to solid color matching gradient start
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
      })}
    </nav>
  );
}
