// components/reconciliation/ReconciliationHeader.jsx
"use client";

import { Download, Filter } from "lucide-react";

export default function ReconciliationHeader() {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-10 font-sfpro">
      <div className="flex flex-col gap-1">
        <h1 className="text-[30px] sm:text-[36px] lg:text-[42px] font-sfpro-bold text-[#a3a3a3] dark:text-[#a1a1aa] leading-none tracking-tight transition-colors">
          Reconciliation
        </h1>
        <p className="mt-1 text-[#636366] dark:text-[#a1a1aa] text-sm font-sfpro-medium transition-colors duration-300">
          Cross-verify vendors, projects, materials & contra entries
        </p>
      </div>

      <div className="flex items-center gap-3 self-end md:self-start">
        {/* <button className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-[#EAEAEA] dark:border-[#252525] bg-white dark:bg-transparent text-[#636366] dark:text-[#a1a1aa] hover:border-[#d4d4d4] dark:hover:border-[#3f3f46] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-all cursor-pointer shadow-sm text-sm font-sfpro-medium">
          <Filter size={16} />
          <span className="hidden sm:inline">Filters</span>
        </button>

        <button className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-[#EAEAEA] dark:border-[#252525] bg-white dark:bg-transparent text-[#636366] dark:text-[#a1a1aa] hover:border-[#d4d4d4] dark:hover:border-[#3f3f46] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-all cursor-pointer shadow-sm text-sm font-sfpro-medium">
          <Download size={16} />
          <span className="hidden sm:inline">Export</span>
        </button> */}
      </div>
    </div>
  );
}