"use client";
import React, { useEffect, useState } from "react";
import { TabGroup, TabList, TabPanels, TabPanel, Tab } from "@headlessui/react";
import { motion } from "framer-motion";
import clsx from "clsx";

export interface TabItem {
  name: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultIndex?: number;
  rightSlot?: React.ReactNode;
  filterSlot?: React.ReactNode;
}

export default function Tabs({ tabs, defaultIndex = 0, rightSlot, filterSlot }: TabsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Avoid SSR/CSR mismatch by delaying render until after hydration
  if (!mounted) return null;

  return (
    <div className="w-full">
      <TabGroup defaultIndex={defaultIndex}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
        <TabList className="relative flex justify-start gap-2 bg-indigo-100/60 dark:bg-indigo-950/50 rounded-full p-2 w-fit">
          {tabs.map((tab) => (
            <Tab key={tab.name} className="relative focus:outline-none">
              {({ selected }) => (
                <div className="relative">
                  {selected && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute -inset-1 bg-indigo-800 rounded-full shadow-md"
                      transition={{
                        type: "spring",
                        duration: 0.4,
                        bounce: 0.25,
                      }}
                    />
                  )}
                  <span
                    className={clsx(
                      "relative z-10 px-6 py-3 text-xs font-semibold transition-colors duration-200 cursor-pointer select-none",
                      selected
                        ? "text-white"
                        : "text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100"
                    )}
                  >
                    {tab.name}
                  </span>
                </div>
              )}
            </Tab>
          ))}
        </TabList>
        {rightSlot && <div className="flex items-center">{rightSlot}</div>}
        </div>

        {filterSlot && <div className="mt-4 w-full">{filterSlot}</div>}

        <TabPanels className="mt-6 overflow-visible">
          {tabs.map((tab) => (
            <TabPanel key={tab.name}>{tab.content}</TabPanel>
          ))}
        </TabPanels>
      </TabGroup>
    </div>
  );
}
