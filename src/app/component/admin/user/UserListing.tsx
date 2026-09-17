"use client";

import { useEffect, useState } from "react";
import {
  Department,
  Division,
  FormType,
  Section,
  UserType,
} from "@/app/types/types";
import { UserForm } from "./UserForm";
import axios from "axios";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { withBasePath } from "@/lib/base-path";
import ApprovalTable from "../../ui/ApprovalTable";
import { FiSearch } from "react-icons/fi";

interface UserListingProps {
  userListing: UserType[];
  divisions: Division[];
  departments: Department[];
  sections: Section[];
  formTypes: FormType[];
  readOnly?: boolean;
  setSelectedDivision: (id: string) => void;
  setSelectedDepartment: (id: string) => void;
}

export default function UserListing({
  userListing,
  divisions,
  departments,
  sections,
  formTypes,
  readOnly = false,
  setSelectedDivision,
  setSelectedDepartment,
}: UserListingProps) {
  const [users, setUsers] = useState<UserType[]>(
    Array.isArray(userListing) ? userListing : []
  );
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleRowClick = (user: UserType) => {
    setSelectedUser(user);
  };

  const handleBack = () => {
    setSelectedUser(null);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(withBasePath("/api/user"));
      const data = res.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserUpdated = async () => {
    await fetchUsers();
    setSelectedUser(null);
  };

  const sortedUsers = [...users].sort((a, b) => a.fullname.localeCompare(b.fullname));

  const query = searchQuery.trim().toLowerCase();
  const filteredUsers = query
    ? sortedUsers.filter((user) =>
        [
          user.fullname,
          user.staffid,
          user.email,
          user.division?.name,
          user.department?.name,
          user.section?.name,
          user.designation,
          user.workLocation,
          user.role,
          ...(user.roles ?? []),
        ]
          .filter((field): field is string => Boolean(field))
          .some((field) => field.toLowerCase().includes(query)),
      )
    : sortedUsers;

  // Framer Motion variants
  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
    exit: { opacity: 0, x: -50, transition: { duration: 0.3, ease: "easeIn" } },
  };

  return (
    <div className="">
      <AnimatePresence mode="wait">
        {!selectedUser ? (
          <motion.div
            key="list-view"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={containerVariants}
            className="p-6 w-full bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700"
          >
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                User Listing
              </h2>

              <div className="relative w-full sm:w-64">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md pl-9 pr-3 py-2 text-xs text-gray-900 dark:text-gray-100 dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {loading ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
                Loading latest user listing ...
              </p>
            ) : (
              <>
                <ApprovalTable
                  items={filteredUsers}
                  pageSize={20}
                  emptyMessage={query ? "No users match your search." : "No users found."}
                  columns={[
                    { label: "Full Name", sortAccessor: (u) => u.fullname },
                    { label: "Staff ID", sortAccessor: (u) => u.staffid },
                    { label: "Email", sortAccessor: (u) => u.email },
                    { label: "Division", sortAccessor: (u) => u.division?.name },
                    { label: "Department", sortAccessor: (u) => u.department?.name },
                    { label: "Section", sortAccessor: (u) => u.section?.name },
                    { label: "Designation", sortAccessor: (u) => u.designation },
                    { label: "Role", sortAccessor: (u) => u.role },
                  ]}
                  renderRow={(user, i) => (
                    <tr
                      key={i}
                      onClick={() => handleRowClick(user)}
                      className="cursor-pointer divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs font-medium text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                        {user.fullname}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {user.staffid}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {user.division?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {user.department?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {user.section?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {user.designation}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          <span
                            className={`text-[0.6rem] font-semibold px-2 py-0.5 rounded-full ${
                              user.role === "ADMIN"
                                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {user.role}
                          </span>
                          {(user.roles ?? [])
                            .filter((r) => r !== user.role)
                            .map((r) => (
                              <span
                                key={r}
                                className={`text-[0.6rem] font-semibold px-2 py-0.5 rounded-full ${
                                  r === "ADMIN"
                                    ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400"
                                    : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                                }`}
                              >
                                +{r}
                              </span>
                            ))}
                        </div>
                      </td>
                    </tr>
                  )}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center sm:hidden">
                  👉 Swipe left/right to view more columns
                </p>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="form-view"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.4 } }}
            exit={{ opacity: 0, x: -50, transition: { duration: 0.3 } }}
            className="p-6 w-full bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700"
          >
            <UserForm
              user={selectedUser}
              onBack={handleBack}
              onUpdate={handleUserUpdated}
              divisions={divisions}
              departments={departments}
              sections={sections}
              formTypes={formTypes}
              readOnly={readOnly}
              setSelectedDivision={setSelectedDivision}
              setSelectedDepartment={setSelectedDepartment}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
