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
        <h1 className="text-[40px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none font-sfpro">
          {title}
        </h1>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2 max-w-2xl leading-relaxed font-sfpro">
          {description}
        </p>
      </div>

      
    </div>
  );
}