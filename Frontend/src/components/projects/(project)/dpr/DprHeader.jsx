"use client";

import { Share2, Download, Loader2 } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import Tooltip from "@/components/ui/Tooltip";

export default function DprHeader({
  reportDate,
  setReportDate,
  onExport,
  isExporting = false,
}) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-5 font-sfpro">
      <div className="flex flex-col gap-1">
        <h1 className="text-[30px] sm:text-[36px] lg:text-[42px] font-sfpro-bold text-[#a3a3a3] dark:text-[#a1a1aa] leading-none tracking-tight transition-colors break-word">
          Daily Progress Report
        </h1>
        <p className="mt-1 text-[#636366] dark:text-[#a1a1aa] text-sm font-sfpro-medium transition-colors duration-300">
          Track today's project activity across all modules
        </p>
      </div>

      <div className="flex items-center gap-1 self-end md:self-start">
        <Tooltip content="Pick a date to view daily project updates" side="bottom">
          <div className="w-full sm:w-auto">
            <DatePicker
              value={reportDate}
              onChange={(date) => setReportDate(date)}
            />
          </div>
        </Tooltip>

        <Tooltip content="Export DPR Report" side="left">
          <button
            onClick={onExport}
            disabled={isExporting}
            className="flex items-center justify-center w-10 h-10 rounded-xl border border-[#EAEAEA] dark:border-[#252525] bg-white dark:bg-transparent text-[#636366] dark:text-[#a1a1aa] hover:border-[#d4d4d4] dark:hover:border-[#3f3f46] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-all cursor-pointer shrink-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Share2 size={18} />
            )}
          </button>
        </Tooltip>
      </div>
    </div>
  );
}