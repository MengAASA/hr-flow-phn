"use client";

import React, { useEffect, useState } from "react";
import { IoClose } from "react-icons/io5";
import PrimaryButton from "./PrimaryButton";

interface ActionModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  inputType?: "textarea" | "text" | null; // ✅ new
  inputLabel?: string;
  inputPlaceholder?: string;
  initialValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  className?: string;
}

export default function ActionModal({
  isOpen,
  title = "Action Confirmation",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  inputType = "textarea", // ✅ default
  inputLabel = "Remarks",
  inputPlaceholder = "Enter here...",
  initialValue = "",
  onConfirm,
  onCancel,
  className,
}: ActionModalProps) {
  const [show, setShow] = useState(false);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      setValue(initialValue);
    } else {
      const timeout = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, initialValue]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center font-poppins bg-black/50">
      <div
        className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full p-6 relative transform transition-all duration-300
          ${isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"}
        `}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <IoClose className="w-5 h-5" />
        </button>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>

        {/* Message */}
        <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">{message}</p>

        {/* ✅ Dynamic Input Field */}
        {inputType && (
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {inputLabel}
            </label>

            {inputType === "textarea" ? (
              <textarea
                rows={3}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={inputPlaceholder}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            ) : (
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={inputPlaceholder}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <PrimaryButton
            name={cancelText}
            onClick={onCancel}
            className={`px-4 py-2 rounded-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs cursor-pointer ${className}`}
          />

          <PrimaryButton
            name={confirmText}
            onClick={() => onConfirm(value)}
            className={`px-4 py-2 rounded-sm text-white text-xs cursor-pointer ${
              confirmText === "Approve" || "Send"
                ? "bg-indigo-700 hover:bg-indigo-800"
                : "bg-red-600 hover:bg-red-700"
            } ${className}`}
          />
        </div>
      </div>
    </div>
  );
}
