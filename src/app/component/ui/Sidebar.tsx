"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CiUser } from "react-icons/ci";
import { PiFlowArrowThin } from "react-icons/pi";
import { IoDocumentsOutline } from "react-icons/io5";
import { PiChalkboardSimpleLight } from "react-icons/pi";
import { CiLock } from "react-icons/ci";
import { FaChevronDown, FaUserCircle } from "react-icons/fa";
import { UserType } from "@/app/types/types";
import { useSession } from "next-auth/react";
import {
  TbBrandGoogleAnalytics,
  TbChartBar,
  TbReportAnalytics,
  TbTrendingUp,
} from "react-icons/tb";
import { GrUserWorker } from "react-icons/gr";
import axios from "axios";
import { withBasePath } from "@/lib/base-path";
import { canViewAnalytics } from "@/lib/analytics-access";
import { isAdminRole } from "@/src/lib/admin-roles";
import { getFirstName } from "../../../../lib/utils";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  isMobile: boolean;
}

function formatRole(role?: string) {
  if (!role) return "";
  return role
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

// Nudges the icon rightward when collapsed so it sits centered in the 69px
// rail instead of flush against the left padding. Derived from the fixed
// collapsed width above and the icon box size (24px, since this app scales
// its root font-size to 75%) — not something that needs to move in step
// with the width spring, just settle quickly to its centered resting spot.
const COLLAPSED_ICON_SHIFT = 8;

interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  children?: MenuItem[];
}

function collectDescendantPaths(item: MenuItem): string[] {
  if (!item.children?.length) {
    return item.path ? [item.path] : [];
  }

  return item.children.flatMap(collectDescendantPaths);
}

function findGroupsToOpen(items: MenuItem[], targetPathname: string): string[] {
  const namesToOpen: string[] = [];

  for (const item of items) {
    if (!item.children?.length) continue;

    const isActive = collectDescendantPaths(item).some((path) =>
      targetPathname.startsWith(path),
    );

    if (isActive) {
      namesToOpen.push(item.name);
      namesToOpen.push(...findGroupsToOpen(item.children, targetPathname));
    }
  }

  return namesToOpen;
}

export default function Sidebar({
  isOpen,
  toggleSidebar,
  isMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserType>();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [tooltip, setTooltip] = useState<{ label: string; top: number } | null>(null);
  const { data: session } = useSession();

  useEffect(() => setMounted(true), []);

  const toggleGroup = (name: string) =>
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }));

  useEffect(() => {
    if (!session) return;

    const fetchUser = async () => {
      try {
        const res = await axios.get(
          withBasePath(`/api/user/${session.user.staffid}`),
        );
        const user = res.data.data;
        setUser(user);
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };

    fetchUser();
  }, [session]);

  const showAnalytics = canViewAnalytics(user?.roles);

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <PiChalkboardSimpleLight className="w-5 h-5" />,
    },
    {
      name: "Analytics",
      path: "",
      icon: <TbBrandGoogleAnalytics className="w-5 h-5" />,
      children: [
        {
          name: "Manpower",
          path: "",
          icon: <GrUserWorker className="h-4 w-4" />,
          children: [
            {
              name: "Trend",
              path: "/dashboard/manpower-analytics/trend",
              icon: <TbTrendingUp className="h-4 w-4" />,
            },
            {
              name: "Breakdown",
              path: "/dashboard/manpower-analytics/breakdown",
              icon: <TbChartBar className="h-4 w-4" />,
            },
          ],
        },
        {
          name: "Form Insights",
          path: "/dashboard/form-insights",
          icon: <TbReportAnalytics className="h-4 w-4" />,
        },
      ],
    },
    {
      name: "Form",
      path: "/dashboard/forms",
      icon: <IoDocumentsOutline className="w-5 h-5" />,
    },
    {
      name: "Approval",
      path: "/dashboard/approval",
      icon: <PiFlowArrowThin className="w-5 h-5" />,
    },
    {
      name: "Profile",
      path: "/dashboard/profile",
      icon: <CiUser className="w-5 h-5" />,
    },
    // {
    //   name: "Setting",
    //   path: "/dashboard/setting",
    //   icon: <CiSettings  className="w-5 h-5" />,
    // },
    {
      name: "Admin",
      path: "/dashboard/admin",
      icon: <CiLock className="w-5 h-5" />,
    },
  ];

  useEffect(() => {
    const namesToOpen = findGroupsToOpen(menuItems, pathname);

    if (namesToOpen.length === 0) return;

    setOpenGroups((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const name of namesToOpen) {
        if (!next[name]) {
          next[name] = true;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!mounted) return null;

  const collapsedIcons = !isOpen && !isMobile;

  const showTooltip = (label: string) => (e: React.MouseEvent<HTMLElement>) => {
    if (!collapsedIcons) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2 });
  };
  const hideTooltip = () => setTooltip(null);

  const renderMenuItem = (item: MenuItem, depth: number): React.ReactNode => {
    const hasChildren = Boolean(item.children?.length);
    const isTopLevel = depth === 0;
    const active = hasChildren
      ? collectDescendantPaths(item).some((path) => pathname.startsWith(path))
      : pathname === item.path;

    if (hasChildren) {
      const isGroupOpen = Boolean(openGroups[item.name]);

      return (
        <div key={item.name} className="flex flex-col">
          <button
            type="button"
            onClick={() => toggleGroup(item.name)}
            onMouseEnter={isTopLevel ? showTooltip(item.name) : undefined}
            onMouseLeave={isTopLevel ? hideTooltip : undefined}
            className={`group relative flex w-full items-center gap-2 text-sm transition-colors hover:bg-white/5 ${
              isTopLevel ? "rounded-xl p-2" : "rounded-lg px-3 py-2"
            }`}
          >
            {active && (
              <motion.div
                layoutId={
                  isTopLevel ? "sidebar-active-top" : `sidebar-active-child-${depth}`
                }
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className={`absolute inset-0 border border-white/10 bg-white/10 ${
                  isTopLevel ? "rounded-xl shadow-inner" : "rounded-lg"
                }`}
              />
            )}

            {isTopLevel ? (
              <motion.div
                animate={{ x: isOpen ? 0 : COLLAPSED_ICON_SHIFT }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  active ? "text-amber-300" : "text-indigo-200 group-hover:text-white"
                }`}
              >
                {item.icon}
              </motion.div>
            ) : (
              <span
                className={`relative z-10 flex-shrink-0 ${
                  active ? "text-amber-300" : "text-indigo-300 group-hover:text-white"
                }`}
              >
                {item.icon}
              </span>
            )}

            {isTopLevel ? (
              <div
                className={`relative z-10 grid overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out ${
                  isOpen ? "flex-1" : ""
                }`}
                style={{ gridTemplateColumns: isOpen ? "1fr" : "0fr" }}
              >
                <motion.div
                  animate={{ opacity: isOpen ? 1 : 0 }}
                  transition={{ duration: isOpen ? 0.2 : 0.1, delay: isOpen ? 0.15 : 0 }}
                  className="flex min-w-0 items-center justify-between whitespace-nowrap"
                >
                  <span className={active ? "font-semibold text-white" : "text-indigo-100"}>
                    {item.name}
                  </span>
                  <FaChevronDown
                    className={`h-3 w-3 shrink-0 transition-transform ${
                      isGroupOpen ? "rotate-180" : ""
                    }`}
                  />
                </motion.div>
              </div>
            ) : (
              <>
                <span
                  className={`relative z-10 flex-1 truncate text-left ${
                    active ? "font-semibold text-white" : "text-indigo-100"
                  }`}
                >
                  {item.name}
                </span>
                <FaChevronDown
                  className={`relative z-10 h-3 w-3 shrink-0 transition-transform ${
                    isGroupOpen ? "rotate-180" : ""
                  } ${active ? "text-amber-300" : "text-indigo-300"}`}
                />
              </>
            )}
          </button>

          <AnimatePresence initial={false}>
            {isOpen && isGroupOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="ml-4 mt-1 overflow-hidden border-l border-white/10 pl-3"
              >
                <div className="flex flex-col gap-1 pb-1">
                  {item.children?.map((child) => (
                    <motion.div
                      key={child.name}
                      initial={{ y: -6, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -6, opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="relative"
                    >
                      {renderMenuItem(child, depth + 1)}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    if (isTopLevel) {
      return (
        <Link
          key={item.path}
          href={item.path}
          onClick={() => isMobile && toggleSidebar()}
          onMouseEnter={showTooltip(item.name)}
          onMouseLeave={hideTooltip}
          className="group relative flex items-center gap-2 rounded-xl p-2 text-sm transition-colors hover:bg-white/5"
        >
          {active && (
            <motion.div
              layoutId="sidebar-active-top"
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="absolute inset-0 rounded-xl border border-white/10 bg-white/10 shadow-inner"
            />
          )}

          <motion.div
            animate={{ x: isOpen ? 0 : COLLAPSED_ICON_SHIFT }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
              active ? "text-amber-300" : "text-indigo-200 group-hover:text-white"
            }`}
          >
            {item.icon}
          </motion.div>
          <div
            className="relative z-10 grid overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out"
            style={{ gridTemplateColumns: isOpen ? "1fr" : "0fr" }}
          >
            <motion.div
              animate={{ opacity: isOpen ? 1 : 0 }}
              transition={{ duration: isOpen ? 0.2 : 0.1, delay: isOpen ? 0.15 : 0 }}
              className={`min-w-0 whitespace-nowrap ${
                active ? "font-semibold text-white" : "text-indigo-100"
              }`}
            >
              {item.name}
            </motion.div>
          </div>
        </Link>
      );
    }

    return (
      <Link
        key={item.path}
        href={item.path}
        onClick={() => isMobile && toggleSidebar()}
        className="group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/5"
      >
        {active && (
          <motion.div
            layoutId={`sidebar-active-child-${depth}`}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="absolute inset-0 rounded-lg bg-white/10"
          />
        )}
        <span
          className={`relative z-10 flex-shrink-0 ${
            active ? "text-amber-300" : "text-indigo-300 group-hover:text-white"
          }`}
        >
          {item.icon}
        </span>
        <span
          className={`relative z-10 ${
            active ? "font-semibold text-white" : "text-indigo-100"
          }`}
        >
          {item.name}
        </span>
      </Link>
    );
  };

  return (
    <motion.aside
      animate={{
        width: isMobile ? 256 : isOpen ? 256 : 69,
        x: isMobile ? (isOpen ? 0 : -256) : 0,
      }}
      transition={{ type: "spring", stiffness: 120, damping: 25 }}
      className={`${
        isMobile
          ? "fixed top-0 left-0 h-full z-40"
          : "fixed top-0 left-0 h-screen z-40"
      } flex flex-col bg-gradient-to-b from-indigo-950 via-indigo-900 to-[#1e1350] text-white shadow-xl shadow-black/20`}
    >
      {/* Decorative glow accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute bottom-24 -right-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 shrink-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 font-bold text-indigo-950 shadow-md shadow-amber-500/20">
            P
          </div>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap leading-tight"
            >
              <p className="text-base font-bold tracking-wide">PHN</p>
              <p className="text-[0.65rem] uppercase tracking-widest text-indigo-300">
                HR FMS
              </p>
            </motion.div>
          )}
        </div>

        <div className="mx-4 border-t border-white/10" />

        {/* Menu Items */}
        <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4">
          {isOpen && (
            <p className="mb-2 px-2 text-[0.65rem] font-semibold uppercase tracking-widest text-indigo-300/70">
              Menu
            </p>
          )}
          <div className="flex flex-col gap-1">
            {menuItems
              .filter((item) => {
                if (item.name === "Analytics" && !showAnalytics) {
                  return false;
                }

                // Only show Admin tab to the roles the admin page admits
                if (item.name === "Admin" && !isAdminRole(user?.roles)) {
                  return false;
                }

                return true;
              })
              .map((item) => renderMenuItem(item, 0))}
          </div>
        </nav>

        {/* Profile footer */}
        <div className="mx-4 border-t border-white/10" />
        <div className="shrink-0 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2">
            <motion.div
              animate={{ x: isOpen ? 0 : COLLAPSED_ICON_SHIFT }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="shrink-0"
            >
              {user?.attachment ? (
                <Image
                  src={user.attachment}
                  alt="Profile"
                  width={32}
                  height={32}
                  sizes="32px"
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-white/10"
                />
              ) : (
                <FaUserCircle className="h-8 w-8 text-indigo-300" />
              )}
            </motion.div>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="min-w-0 overflow-hidden"
              >
                <p className="truncate text-sm font-semibold text-white">
                  {user ? getFirstName(user.fullname) : "Account"}
                </p>
                <p className="truncate text-[0.65rem] text-indigo-300">
                  {formatRole(user?.role)}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Tooltip for collapsed icons, portaled to escape the scrollable nav */}
      {tooltip &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-lg"
            style={{ top: tooltip.top, left: 78 }}
          >
            {tooltip.label}
          </div>,
          document.body,
        )}
    </motion.aside>
  );
}
