// components/dashboard/DashboardHeader.jsx

"use client";

import { Calendar, Download } from "lucide-react";

export default function DashboardHeader({ title, description }) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
      <div>
        <h1 className="text-[30px] sm:text-[36px] lg:text-[42px] font-sfpro-bold text-[#a3a3a3] dark:text-[#a1a1aa] leading-none tracking-tight transition-colors wrap-break-word">
          {title}
        </h1>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2 max-w-2xl leading-relaxed font-sfpro">
          {description}
        </p>
      </div>

      
    </div>
  );
}