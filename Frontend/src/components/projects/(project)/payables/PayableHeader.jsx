"use client";

import { Share2, Loader2, Search, X } from "lucide-react";

export default function PayableHeader({
  searchQuery,
  setSearchQuery,
  onExport,
  isExporting = false,
}) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-10 font-sfpro">
      <div className="flex flex-col gap-1">
        <h1 className="text-[30px] sm:text-[36px] lg:text-[42px] font-sfpro-bold text-[#a3a3a3] dark:text-[#a1a1aa] leading-none tracking-tight transition-colors wrap-break-words">
          Payables
        </h1>
        <p className="mt-1 text-[#636366] dark:text-[#a1a1aa] text-sm font-sfpro-medium transition-colors duration-300">
          Track vendor payments, dues and settlement history
        </p>
      </div>

      <div className="flex items-center gap-3 self-end md:self-start">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#71717a]"
          />
          <input
            type="text"
            placeholder="Search payable, vendor…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-9 pr-8 w-56 rounded-xl border border-[#EAEAEA] dark:border-[#252525] bg-white dark:bg-transparent text-sm text-gray-700 dark:text-[#d4d4d8] placeholder:text-gray-400 dark:placeholder:text-[#52525b] focus:outline-none focus:border-[#d4d4d4] dark:focus:border-[#3f3f46] font-sfpro transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-[#52525b] dark:hover:text-[#a1a1aa]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}