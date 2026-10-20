"use client";

import Sidebar from "@/app/component/ui/Sidebar";
import Navbar from "@/app/component/ui/Navbar";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { useSession } from "next-auth/react";
import { UserType } from "../types/types";
import useSessionManager from "../component/session/useSessionManager";
import { withBasePath } from "@/lib/base-path";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const { data: session } = useSession();
  const { showPopup, handleClosePopup } = useSessionManager({
    timeout: 30 * 60 * 1000,
  }); //use for force logout after 30 minutes of inactivity
  const pathname = usePathname();
  const router = useRouter();

  const getPageName = () => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length <= 1) return "Dashboard";

    return parts[parts.length - 1]
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSelectTab = (tab: string) => {
    router.push(`/dashboard/${tab}`);
  };

  const getUser = useCallback(async () => {
    if (!session) return;
    try {
      const res = await axios.get(
        withBasePath(`/api/user/${session.user.staffid}`),
      );
      setUser(res.data.data);
    } catch (error) {
      console.error("Failed to fetch user session data:", error);
    }
  }, [session]);

  useEffect(() => {
    getUser();
  }, [getUser]);

  return (
    <>
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950 relative overflow-y-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isMobile={isMobile}
          user={user}
        />

        {isMobile && isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-20"
          />
        )}

        {/* Main content area animated with Framer Motion */}
        <motion.div
          animate={{
            marginLeft: !isMobile && isSidebarOpen ? 256 : !isMobile ? 69 : 0,
            marginTop: 68,
          }}
          transition={{ type: "spring", stiffness: 120, damping: 25 }}
          className="flex-1 flex flex-col"
        >
          <Navbar
            isMobile={isMobile}
            pageName={getPageName()}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
            onSelectTab={handleSelectTab}
            user={user}
          />

          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </motion.div>
      </div>
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg max-w-sm text-center">
            <h2 className="text-xl font-bold mb-2">Session Expired</h2>
            <p>Your session has expired. Please log in again.</p>
            <button
              onClick={handleClosePopup}
              className="mt-4 bg-indigo-800 text-white px-4 py-2 rounded"
            >
              Login
            </button>
          </div>
        </div>
      )}
    </>
  );
}
