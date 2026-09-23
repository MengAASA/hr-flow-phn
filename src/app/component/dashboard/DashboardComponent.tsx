"use client";

import React from "react";
import { motion } from "framer-motion";
import DashboardCard from "./DashboardCard";
import { FiFileText, FiCheckCircle, FiUsers, FiLayers } from "react-icons/fi";
import QuickActions from "./QuickActions";
import NeedsAttention, { AttentionItem } from "./NeedsAttention";
import RecentActivity, { RecentActivityItem } from "./RecentActivity";
import { getFirstName } from "../../../../lib/utils";
import { Session } from "next-auth";
import type { Variants } from "framer-motion";

interface DashboardComponentProps {
  countApprovedForms: number;
  totalForms: number;
  totalMembers: number;
  userSession: Session | null;
  attentionApprovals: AttentionItem[];
  attentionCount: number;
  recentActivity: RecentActivityItem[];
}

export default function DashboardComponent({
  countApprovedForms,
  totalForms,
  totalMembers,
  userSession,
  attentionApprovals,
  attentionCount,
  recentActivity,
}: DashboardComponentProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12)
      return `Good morning, ${
        getFirstName(userSession?.user.name) || "User"
      }! ☀️`;
    if (hour >= 12 && hour < 18)
      return `Good afternoon, ${
        getFirstName(userSession?.user.name) || "User"
      }! 🌤️`;
    if (hour >= 18 && hour < 22)
      return `Good evening, ${
        getFirstName(userSession?.user.name) || "User"
      }! 🌙`;
    return `Hello, ${getFirstName(userSession?.user.name) || "User"}! 🌟`;
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.15,
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1], // equivalent to "easeOut"
      },
    }),
  };

  return (
    <div className="font-poppins w-full">
      {/* Greeting */}
      <div>
        <h1 className="font-bold text-3xl">{getGreeting()}</h1>
        <p className="text-indigo-800 dark:text-indigo-300 mt-1">
          Welcome back! Here&apos;s a quick overview of your HR forms today.
        </p>
      </div>

      {/* Animated Dashboard Grid */}
      <motion.div
        className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 my-6"
        initial="hidden"
        animate="visible"
      >
        {[
          {
            name: "Pending Approvals",
            count: attentionCount,
            icon: <FiFileText />,
            color: "yellow" as const,
          },
          {
            name: "Approved",
            count: countApprovedForms,
            icon: <FiCheckCircle />,
            color: "green" as const,
          },
          {
            name: "Total Forms",
            count: totalForms,
            icon: <FiLayers />,
            color: "indigo" as const,
          },
          {
            name: "Total Members",
            count: totalMembers,
            icon: <FiUsers />,
            color: "purple" as const,
          },
        ].map((card, index) => (
          <motion.div key={index} variants={cardVariants} custom={index}>
            <DashboardCard {...card} />
          </motion.div>
        ))}
      </motion.div>

      <div>
        <QuickActions />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 items-start mt-6">
        <NeedsAttention items={attentionApprovals} totalCount={attentionCount} />
        <RecentActivity items={recentActivity} />
      </div>
    </div>
  );
}
