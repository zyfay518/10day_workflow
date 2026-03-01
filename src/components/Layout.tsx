import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex justify-center font-sans text-gray-900">
      <div className="w-full max-w-md bg-white min-h-screen relative shadow-xl overflow-hidden flex flex-col">
        <div
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom))' }}
        >
          <Outlet />
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
