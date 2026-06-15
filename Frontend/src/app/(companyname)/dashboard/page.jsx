"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"

import {
  fetchDashboardKPIs,
  fetchProjectCompletionChart,
  fetchInventoryPieChart,
  fetchExpenseChart,
  fetchTasksFlow,
  mapKPIsToStats,
  mapProjectCompletionToChart,
  mapInventoryToChart,
  mapExpenseToChart,
  mapTasksFlowToChart,
  formatDashboardError,
} from "./api"

import DashboardHeader from "@/components/dashboard/DashboardHeader"
import DashboardStatsSection from "@/components/dashboard/DashboardStatsSection"
import DashboardChartsSection from "@/components/dashboard/DashboardChartsSection"

export default function DashboardPage() {
  const [stats, setStats] = useState([])
  const [statsLoading, setStatsLoading] = useState(true)

  const [projectChartData, setProjectChartData] = useState([])
  const [projectChartLoading, setProjectChartLoading] = useState(true)

  const [inventoryChartData, setInventoryChartData] = useState([])
  const [inventoryChartLoading, setInventoryChartLoading] = useState(true)

  const [expenseChartData, setExpenseChartData] = useState([])
  const [expenseChartLoading, setExpenseChartLoading] = useState(true)

  const [tasksFlowData, setTasksFlowData] = useState([])
  const [tasksFlowLoading, setTasksFlowLoading] = useState(true)

  const kpiCtrl = useRef(null)
  const projectCtrl = useRef(null)
  const inventoryCtrl = useRef(null)
  const expenseCtrl = useRef(null)
  const tasksCtrl = useRef(null)

  const loadKPIs = useCallback(async () => {
    kpiCtrl.current?.abort()
    const ctrl = new AbortController()
    kpiCtrl.current = ctrl
    setStatsLoading(true)
    try {
      const data = await fetchDashboardKPIs(ctrl.signal)
      if (ctrl.signal.aborted) return
      setStats(mapKPIsToStats(data))
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      toast.error("Failed to load KPIs", { description: formatDashboardError(err) })
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadProjectChart = useCallback(async () => {
    projectCtrl.current?.abort()
    const ctrl = new AbortController()
    projectCtrl.current = ctrl
    setProjectChartLoading(true)
    try {
      const data = await fetchProjectCompletionChart(ctrl.signal)
      if (ctrl.signal.aborted) return
      setProjectChartData(mapProjectCompletionToChart(data))
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      console.error("[Dashboard] project chart failed:", err.message)
    } finally {
      setProjectChartLoading(false)
    }
  }, [])

  const loadInventoryChart = useCallback(async () => {
    inventoryCtrl.current?.abort()
    const ctrl = new AbortController()
    inventoryCtrl.current = ctrl
    setInventoryChartLoading(true)
    try {
      const data = await fetchInventoryPieChart(ctrl.signal)
      if (ctrl.signal.aborted) return
      setInventoryChartData(mapInventoryToChart(data))
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      console.error("[Dashboard] inventory chart failed:", err.message)
    } finally {
      setInventoryChartLoading(false)
    }
  }, [])

  const loadExpenseChart = useCallback(async () => {
    expenseCtrl.current?.abort()
    const ctrl = new AbortController()
    expenseCtrl.current = ctrl
    setExpenseChartLoading(true)
    try {
      const data = await fetchExpenseChart(ctrl.signal)
      if (ctrl.signal.aborted) return
      setExpenseChartData(mapExpenseToChart(data))
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      console.error("[Dashboard] expense chart failed:", err.message)
    } finally {
      setExpenseChartLoading(false)
    }
  }, [])

  const loadTasksFlow = useCallback(async (days = 12) => {
    tasksCtrl.current?.abort()
    const ctrl = new AbortController()
    tasksCtrl.current = ctrl
    setTasksFlowLoading(true)
    try {
      const data = await fetchTasksFlow(days, ctrl.signal)
      if (ctrl.signal.aborted) return
      setTasksFlowData(mapTasksFlowToChart(data))
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      console.error("[Dashboard] tasks flow failed:", err.message)
    } finally {
      setTasksFlowLoading(false)
    }
  }, [])

  useEffect(() => {
    loadKPIs()
    loadProjectChart()
    loadInventoryChart()
    loadExpenseChart()
    loadTasksFlow(12)
    return () => {
      kpiCtrl.current?.abort()
      projectCtrl.current?.abort()
      inventoryCtrl.current?.abort()
      expenseCtrl.current?.abort()
      tasksCtrl.current?.abort()
    }
  }, [loadKPIs, loadProjectChart, loadInventoryChart, loadExpenseChart, loadTasksFlow])

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#121212] rounded-lg p-6 md:p-8 lg:p-10">
      <DashboardHeader
        title="Dashboard"
        description="Overview of your construction management operations, purchase orders, work orders, and project progress across all active sites."
      />

      <DashboardStatsSection stats={stats} isLoading={statsLoading} />

      <DashboardChartsSection
        projectChartData={projectChartData}
        projectChartLoading={projectChartLoading}
        inventoryChartData={inventoryChartData}
        inventoryChartLoading={inventoryChartLoading}
        expenseChartData={expenseChartData}
        expenseChartLoading={expenseChartLoading}
        tasksFlowData={tasksFlowData}
        tasksFlowLoading={tasksFlowLoading}
        onTasksDaysChange={loadTasksFlow}
      />
    </div>
  )
}