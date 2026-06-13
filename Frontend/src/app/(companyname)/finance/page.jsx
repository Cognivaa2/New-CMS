"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  PAGE_META,
  fetchFinanceOverview,
  fetchCashFlow,
  fetchExpenseBreakdown,
  fetchFinanceAlerts,
  fetchProjectFinancialOverview,
  fetchRecentTransactions,
  fetchAllPayables,
  fetchTopVendors,
  mapOverviewToStats,
  mapCashFlowToChart,
  mapExpenseBreakdown,
  mapAlertsToPanel,
  mapProjectsToTable,
  mapTransactionsToTable,
  mapPayablesToTable,
  mapTopVendorsToCards,
} from "./api"

import FinanceHeader from "@/components/finance/FinanceHeader"
import StatsGrid from "@/components/finance/StatsGrid"
import AnalyticsRow from "@/components/finance/AnalyticsRow"
import ProjectOverview from "@/components/finance/ProjectOverview"
import RecentTransactions from "@/components/finance/RecentTransactions"
import GlobalPayables from "@/components/finance/GlobalPayables"
import VendorExposure from "@/components/finance/VendorExposure"

export default function FinancePage() {
  const [stats, setStats] = useState([])
  const [cashFlow, setCashFlow] = useState([])
  const [expenses, setExpenses] = useState([])
  const [alerts, setAlerts] = useState({ title: "Alerts", description: "", items: [] })
  const [projects, setProjects] = useState([])
  const [transactions, setTransactions] = useState([])
  const [payables, setPayables] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState({
    start: PAGE_META.dateRange.start,
    end: PAGE_META.dateRange.end,
  })

  const abortRef = useRef(null)

  const loadAll = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    setLoading(true)
    setError(null)

    const dateFrom = dateRange.start?.toISOString()
    const dateTo = dateRange.end?.toISOString()

    const [
      overviewRes,
      cashFlowRes,
      expenseRes,
      alertsRes,
      projectsRes,
      transactionsRes,
      payablesRes,
      vendorsRes,
    ] = await Promise.allSettled([
      fetchFinanceOverview(signal),
      fetchCashFlow({ granularity: "monthly", dateFrom, dateTo }, signal),
      fetchExpenseBreakdown({ dateFrom, dateTo }, signal),
      fetchFinanceAlerts(signal),
      fetchProjectFinancialOverview({ limit: 10 }, signal),
      fetchRecentTransactions({ limit: 10, tab: "All" }, signal),
      fetchAllPayables({ limit: 10 }, signal),
      fetchTopVendors({ limit: 5 }, signal),
    ])

    if (signal.aborted) return

    if (overviewRes.status === "fulfilled" && overviewRes.value) {
      setStats(mapOverviewToStats(overviewRes.value))
    }
    if (cashFlowRes.status === "fulfilled" && cashFlowRes.value) {
      setCashFlow(mapCashFlowToChart(cashFlowRes.value.trend ?? []))
    }
    if (expenseRes.status === "fulfilled" && expenseRes.value) {
      setExpenses(mapExpenseBreakdown(expenseRes.value.categoryBreakdown ?? []))
    }
    if (alertsRes.status === "fulfilled" && alertsRes.value) {
      setAlerts(mapAlertsToPanel(alertsRes.value))
    }
    if (projectsRes.status === "fulfilled" && projectsRes.value) {
      setProjects(mapProjectsToTable(projectsRes.value.projects ?? []))
    }
    if (transactionsRes.status === "fulfilled" && transactionsRes.value) {
      setTransactions(mapTransactionsToTable(transactionsRes.value.transactions ?? []))
    }
    if (payablesRes.status === "fulfilled" && payablesRes.value) {
      setPayables(mapPayablesToTable(payablesRes.value.payables ?? []))
    }
    if (vendorsRes.status === "fulfilled" && vendorsRes.value) {
      setVendors(mapTopVendorsToCards(vendorsRes.value.vendors ?? []))
    }

    const firstFailure = [
      overviewRes, cashFlowRes, expenseRes, alertsRes,
      projectsRes, transactionsRes, payablesRes, vendorsRes,
    ].find(
      (r) => r.status === "rejected" && r.reason?.name !== "CanceledError"
    )
    if (firstFailure) setError(firstFailure.reason?.message || "Failed to load some data")

    setLoading(false)
  }, [dateRange])

  useEffect(() => {
    loadAll()
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [loadAll])

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#121212] rounded-lg py-12 px-6 lg:px-12 transition-colors duration-300">
      <div className="mx-auto space-y-10">

        <FinanceHeader
          meta={PAGE_META}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />

        {error && (
          <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-6 py-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <StatsGrid stats={stats} />

        <AnalyticsRow
          cashFlow={cashFlow}
          expenses={expenses}
          alerts={alerts}
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <ProjectOverview data={projects} />
          <RecentTransactions data={transactions} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-8">
            <GlobalPayables data={payables} />
          </div>
          <div className="xl:col-span-4">
            <VendorExposure data={vendors} />
          </div>
        </div>

      </div>
    </div>
  )
}