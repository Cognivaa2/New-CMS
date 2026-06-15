"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import {
  fetchDprSummary,
  fetchDprEvents,
  exportDprExcel,
  TAB_TO_MODULE,
  formatDprError,
} from "./api";

import DprHeader from "@/components/projects/(project)/dpr/DprHeader";
import SummaryCards from "@/components/projects/(project)/dpr/SummaryCards";
import WorkTable from "@/components/projects/(project)/dpr/WorkTable";
import Loading from "./loding";

const TABS = [
  "Tasks", "Sub Tasks", "Progress", "Consumptions", "Transfers",
  "MRs", "POs", "GRNs", "WOs", "Expenses",
];

function toDateString(date) {
  if (!date) return "";
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DprPage() {
  const params = useParams();
  const projectId = params?.projectId;

  const [reportDate, setReportDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("Tasks");

  const [summaryCards, setSummaryCards] = useState([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0, page: 1, totalPages: 1, hasNext: false, hasPrev: false,
  });
  const [availableModules, setAvailableModules] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [tableError, setTableError] = useState(null);

  const [isExporting, setIsExporting] = useState(false);
  const [projectName, setProjectName] = useState("");

  const summaryAbortRef = useRef(null);
  const tableAbortRef = useRef(null);

  const loadSummary = useCallback(async (date) => {
    if (!projectId) return;

    summaryAbortRef.current?.abort();
    const controller = new AbortController();
    summaryAbortRef.current = controller;

    setIsSummaryLoading(true);
    try {
      const result = await fetchDprSummary(
        projectId,
        toDateString(date),
        controller.signal
      );
      if (!controller.signal.aborted) {
        setSummaryCards(result.summary);
      }
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return;
      console.warn("[DPR] Summary load failed:", err.message);
    } finally {
      if (!controller.signal.aborted) setIsSummaryLoading(false);
    }
  }, [projectId]);

  const loadEvents = useCallback(
    async (date, tab, page = 1) => {
      if (!projectId) return;

      tableAbortRef.current?.abort();
      const controller = new AbortController();
      tableAbortRef.current = controller;

      setIsTableLoading(true);
      setTableError(null);

      try {
        const module = TAB_TO_MODULE[tab] || "all";
        const result = await fetchDprEvents(projectId, {
          dateStr: toDateString(date),
          module,
          page,
          limit: 20,
          signal: controller.signal,
          tab,
        });

        if (controller.signal.aborted) return;

        setRows(result.rows);
        setPagination(result.pagination);
        setAvailableModules(result.availableModules);
        if (result.projectName) setProjectName(result.projectName);

        if (result.summary?.length) setSummaryCards(result.summary);
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") return;
        setTableError(err.message);
        toast.error("Failed to load DPR", { description: formatDprError(err) });
      } finally {
        if (!controller.signal.aborted) setIsTableLoading(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    loadSummary(reportDate);
    loadEvents(reportDate, activeTab, 1);
  }, [reportDate]);

  useEffect(() => {
    loadEvents(reportDate, activeTab, 1);
  }, [activeTab]);

  useEffect(() => {
    return () => {
      summaryAbortRef.current?.abort();
      tableAbortRef.current?.abort();
    };
  }, []);

  const handlePageChange = useCallback(
    (newPage) => {
      loadEvents(reportDate, activeTab, newPage);
    },
    [reportDate, activeTab, loadEvents]
  );

  const handleExport = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating Excel report…", {
      description: "This may take a moment",
    });
    try {
      const result = await exportDprExcel(
        projectId,
        toDateString(reportDate),
        projectName
      );
      toast.success("Export Downloaded", {
        id: toastId,
        description: `${result.filename} saved to your downloads`,
      });
    } catch (err) {
      toast.error("Export Failed", {
        id: toastId,
        description: err.message || "Could not generate report",
      });
    } finally {
      setIsExporting(false);
    }
  }, [projectId, reportDate, projectName, isExporting]);

  const isInitialLoad = isSummaryLoading && isTableLoading && rows.length === 0;
  if (isInitialLoad && !tableError) return <Loading />;

  return (
    <div className="w-full min-h-screen bg-[#FAFAFA] dark:bg-[#121212] rounded-lg  p-4 sm:p-8 font-sans transition-colors duration-300">
      <div className="max-w-400 mx-auto">

        <DprHeader
          reportDate={reportDate}
          setReportDate={(date) => {
            setReportDate(date);
            setActiveTab("Tasks");
          }}
          onExport={handleExport}
          isExporting={isExporting}
        />

        <SummaryCards
          cards={summaryCards}
          isLoading={isSummaryLoading}
        />

        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide rounded-2xl bg-[#f7f7f7] dark:bg-[#18181b] p-1.5 border border-[#ececec] dark:border-[#252525] lg:w-fit">
          {TABS.map((tab) => {
            const moduleName = TAB_TO_MODULE[tab];
            const mod = availableModules.find((m) => m.module === moduleName);

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative h-10 px-4 sm:px-5 rounded-xl text-sm font-sfpro-medium transition-all whitespace-nowrap border ${activeTab === tab
                    ? "bg-[#212121] text-white border-[#212121] shadow-sm dark:bg-white dark:text-black dark:border-white"
                    : "bg-white text-[#3f3f46] border-transparent hover:bg-[#fafafa] hover:border-[#e5e7eb] dark:bg-[#1f1f1f] dark:text-[#d4d4d8] dark:hover:bg-[#262626] dark:hover:border-[#3f3f46]"
                  }`}
              >
                <span className="flex items-center gap-1.5">
                  {tab}
                  {mod && mod.count > 0 && (
                    <span
                      className={`text-[10px] leading-none font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab
                          ? "bg-white/15 text-white dark:bg-black/10 dark:text-black"
                          : "bg-gray-100 text-gray-500 dark:bg-[#2f2f2f] dark:text-[#a1a1aa]"
                        }`}
                    >
                      {mod.count}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {tableError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-sm text-gray-400 dark:text-[#71717a] font-sfpro">
              {tableError}
            </p>
            <button
              onClick={() => loadEvents(reportDate, activeTab, 1)}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        ) : (
          <WorkTable
            activeTab={activeTab}
            rows={rows}
            isLoading={isTableLoading}
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        )}

      </div>
    </div>
  );
}