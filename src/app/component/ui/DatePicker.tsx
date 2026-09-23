"use client";

import React, { useState, useRef, useEffect } from "react";

export type DateValueType = string | null;

interface DatePickerProps {
  value: DateValueType;
  onChange: (value: DateValueType) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className = "",
  disabled = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const popupWidth = 320; // matches w-80

  const openCalendar = () => {
    if (disabled) return;
    if (calendarRef.current) {
      const rect = calendarRef.current.getBoundingClientRect();
      const spaceRight = window.innerWidth - rect.left;
      setAlignRight(spaceRight < popupWidth + 16);
    }
    setIsOpen(true);
  };

  const toggleCalendar = () => {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
    } else {
      openCalendar();
    }
  };

  const handleDateSelect = (date: Date) => {
    if (disabled) return;
    setSelectedDate(date);
    const dateString = date.toLocaleDateString("en-CA");
    onChange(dateString);
    setIsOpen(false);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    if (disabled) return;
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      if (direction === "prev") newMonth.setMonth(prev.getMonth() - 1);
      else newMonth.setMonth(prev.getMonth() + 1);
      return newMonth;
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];

    // Previous month's days
    const prevMonth = new Date(year, month - 1, 1);
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push(
        new Date(
          prevMonth.getFullYear(),
          prevMonth.getMonth(),
          prevMonthDays - i
        )
      );
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    // Next month's days to complete the grid
    const totalCells = 42; // 6 weeks
    const nextMonth = new Date(year, month + 1, 1);
    for (let i = 1; days.length < totalCells; i++) {
      days.push(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), i));
    }

    return days;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) =>
    date.getMonth() === currentMonth.getMonth();

  const formatMonthYear = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const calendarDays = getDaysInMonth(currentMonth);

  return (
    <div className={`flex flex-col w-full`} ref={calendarRef}>
      <div className="relative w-full">
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value || null)}
          onFocus={openCalendar}
          placeholder={placeholder}
          disabled={disabled}
          className={`${className} ${
            disabled ? `bg-gray-200 dark:bg-gray-700 cursor-not-allowed` : `bg-white dark:bg-gray-800`
          }`}
        />
        <button
          type="button"
          onClick={toggleCalendar}
          disabled={disabled}
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-lg transition-colors ${
            disabled
              ? "text-gray-400 cursor-not-allowed pointer-events-none"
              : "text-indigo-400 hover:text-indigo-600"
          }`}
        >
          📅
        </button>

        {/* Calendar Popup */}
        {isOpen && !disabled && (
          <div
            className={`absolute top-full ${alignRight ? "right-0" : "left-0"} mt-2 z-10 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-300 dark:border-gray-700 p-6 w-80 max-w-[90vw] animate-in fade-in-50 zoom-in-95`}
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => navigateMonth("prev")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-600 dark:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {formatMonthYear(currentMonth)}
              </h3>

              <button
                type="button"
                onClick={() => navigateMonth("next")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-600 dark:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                const today = isToday(date);
                const selected = isSelected(date);
                const currentMonthDay = isCurrentMonth(date);

                return (
                  <button
                    type="button"
                    key={index}
                    onClick={() => handleDateSelect(date)}
                    className={`h-10 rounded-lg text-xs font-medium transition-all
                      ${
                        selected
                          ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200"
                          : today
                          ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                          : currentMonthDay
                          ? "text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                          : "text-gray-400 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="flex justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  if (disabled) return;
                  setSelectedDate(null);
                  onChange(null);
                  setIsOpen(false);
                }}
                className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleDateSelect(new Date())}
                className="px-3 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-lg transition-colors"
              >
                Today
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
