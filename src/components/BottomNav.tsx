import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { name: "Home", icon: "grid_view", path: "/" },
    { name: "Goals", icon: "flag", path: "/goals" },
    { name: "Record", icon: "edit_square", path: "/record" },
    { name: "History", icon: "history", path: "/history" },
    { name: "Lib", icon: "auto_stories", path: "/knowledge" },
    { name: "Report", icon: "description", path: "/report" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 h-[84px] pb-5 px-6 flex justify-between items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] w-full max-w-md mx-auto">
      {navItems.map((item) => {
        const isActive = path === item.path;
        return (
          <Link
            key={item.name}
            to={item.path}
            className="flex flex-col items-center justify-center w-10 h-10 transition-colors group"
          >
            <span
              className={cn(
                "material-symbols-outlined text-[24px] mb-0.5 transition-all",
                isActive
                  ? "bg-gradient-to-br from-[#9DC5EF] to-[#FFB3C1] bg-clip-text text-transparent font-variation-settings-'FILL'1"
                  : "text-gray-400 group-hover:text-gray-600"
              )}
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
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
