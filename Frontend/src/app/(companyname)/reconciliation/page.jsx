// reconciliation/page.jsx
"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  RECONCILIATION_TABS,
  fetchReconciliationData,
  getReconciliationColumns,
  formatReconciliationError,
} from "./api";

import ReconciliationHeader from "@/components/reconciliation/ReconciliationHeader";
import ReconciliationSummaryCards from "@/components/reconciliation/ReconciliationSummaryCards";
import ReconciliationTable from "@/components/reconciliation/ReconciliationTable";

function ReconciliationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabFromUrl = searchParams.get("tab");

  const initialTab =
    tabFromUrl && RECONCILIATION_TABS.includes(tabFromUrl)
      ? tabFromUrl
      : "Material";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [summaryCards, setSummaryCards] = useState([]);
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState(getReconciliationColumns(initialTab));
  const [pagination, setPagination] = useState({
    total: 0, page: 1, totalPages: 1, hasNext: false, hasPrev: false,
  });
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [tableError, setTableError] = useState(null);

  const abortRef = useRef(null);

  const loadData = useCallback(async (tab, page = 1) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSummaryLoading(true);
    setIsTableLoading(true);
    setTableError(null);

    setColumns(getReconciliationColumns(tab));

    try {
      const result = await fetchReconciliationData(tab, {
        page,
        limit: 20,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      setSummaryCards(result.summary);
      setRows(result.records);
      setColumns(result.columns);
      setPagination(result.pagination);
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return;
      const message = formatReconciliationError(err);
      setTableError(message);
      toast.error("Failed to load reconciliation data", {
        description: message,
      });
    } finally {
      if (!controller.signal.aborted) {
        setIsSummaryLoading(false);
        setIsTableLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData(activeTab, 1);
  }, [activeTab, loadData]);

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (
      urlTab &&
      RECONCILIATION_TABS.includes(urlTab) &&
      urlTab !== activeTab
    ) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handlePageChange = useCallback(
    (newPage) => {
      loadData(activeTab, newPage);
    },
    [activeTab, loadData]
  );

  const handleRetry = useCallback(() => {
    loadData(activeTab, pagination.page);
  }, [activeTab, pagination.page, loadData]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#121212] rounded-lg p-4 ">
      <div className="max-w-screen mx-auto">

        <ReconciliationHeader />

        <ReconciliationSummaryCards
          cards={summaryCards}
          isLoading={isSummaryLoading}
        />

        {tableError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p className="text-sm text-gray-400 dark:text-[#71717a] font-sfpro">
              {tableError}
            </p>
            <button
              onClick={handleRetry}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        ) : (
          <ReconciliationTable
            activeTab={activeTab}
            columns={columns}
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

export default function ReconciliationPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen bg-white dark:bg-[#09090b] p-4 sm:p-8 flex items-center justify-center">
          <div className="animate-pulse text-gray-400 dark:text-[#71717a] text-sm font-sfpro">
            Loading reconciliation…
          </div>
        </div>
      }
    >
      <ReconciliationContent />
    </Suspense>
  );
}