"use client";

import { useEffect, useState } from "react";
import ActivityStats from "./ActivityStats";
import PersonalInfo from "./PersonalInfo";
import { Department, Division, Section, User } from "@/app/types/types";
import axios from "axios";
import { useSession } from "next-auth/react";
import DisplayProfile from "./DisplayProfile";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { withBasePath } from "@/lib/base-path";

export interface UserProfile {
  id: number;
  fullname: string;
  staffid: string;
  email: string;
  divisionId: number | null;
  departmentId: number | null;
  sectionId: number | null;
  designation: string | null;
  workLocation: string | null;
  role: string | null;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  division: Division | null;
  department: Department | null;
  section: Section | null;
  attachment?: string | null;
}

export interface ProfileComponentProps {
  userProfile?: UserProfile;
  stats?: {
    label: string;
    value: number;
    color?: string;
  }[];
  userSession?: User | null;
}

export default function ProfileComponent({
  userProfile,
  stats,
}: ProfileComponentProps) {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [, setSelectedSection] = useState<string>("");
  const [, setSelectedWorkLocation] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      setUser(session.user as User);
    }
  }, [session]);

  // Keep the user's saved units in the lists even if an admin has since
  // deactivated them, so the form still shows their names.
  const includeId = (id?: number | null) => (id ? `includeId=${id}` : "");

  useEffect(() => {
    axios
      .get(withBasePath(`/api/division?${includeId(userProfile?.divisionId)}`))
      .then((res) => setDivisions(res.data))
      .catch((err) => console.error("Failed to fetch data:", err));
  }, [userProfile?.divisionId]);

  useEffect(() => {
    if (selectedDivision) {
      axios
        .get(withBasePath(`/api/department?divisionId=${selectedDivision}&${includeId(userProfile?.departmentId)}`))
        .then((res) => {
          setDepartments(res.data);
          setSections([]);
        })
        .catch((err) => console.error("Failed to fetch data:", err));
    } else {
      setDepartments([]);
      setSections([]);
    }
    setSelectedDepartment("");
    setSelectedSection("");
  }, [selectedDivision, userProfile?.departmentId]);

  useEffect(() => {
    if (selectedDepartment) {
      axios
        .get(withBasePath(`/api/section?departmentId=${selectedDepartment}&${includeId(userProfile?.sectionId)}`))
        .then((res) => setSections(res.data))
        .catch((err) => console.error("Failed to fetch data:", err));
    } else setSections([]);
    setSelectedSection("");
  }, [selectedDepartment, userProfile?.sectionId]);

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      className="w-full max-w-6xl grid lg:grid-cols-[1fr_2fr] gap-6 my-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* LEFT COLUMN */}
      <motion.div variants={cardVariants}>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-300 dark:border-gray-700 shadow-xs">
          <DisplayProfile userProfile={userProfile} userSession={user} />
        </div>
      </motion.div>

      {/* RIGHT COLUMN */}
      <motion.div className="grid gap-6" variants={cardVariants}>
        <motion.div variants={cardVariants}>
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-300 dark:border-gray-700 shadow-xs">
            <ActivityStats stats={stats} />
          </div>
        </motion.div>
        <motion.div variants={cardVariants}>
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-300 dark:border-gray-700 shadow-xs">
            <PersonalInfo
              divisions={divisions}
              departments={departments}
              sections={sections}
              setSelectedDivision={setSelectedDivision}
              setSelectedDepartment={setSelectedDepartment}
              setSelectedSection={setSelectedSection}
              setSelectedWorkLocation={setSelectedWorkLocation}
              user={user}
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
