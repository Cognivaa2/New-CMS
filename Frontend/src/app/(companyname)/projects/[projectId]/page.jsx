"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import ProjectHeader from "@/components/projects/(project)/dashboard/ProjectHeader"
import OverviewTab from "@/components/projects/(project)/dashboard/OverviewTab"
import ExecutionTab from "@/components/projects/(project)/dashboard/ExecutionTab"
import LoadingSkeleton from "./loading"
import {
  fetchProjectDetails,
  fetchDashboardMembers,
  fetchProjectKPIs,
  fetchPhaseGrowth,
  fetchSmartAlerts,
  formatDashboardError,
} from "./api"

function fmt(dateStr) {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtBudget(num) {
  if (!num && num !== 0) return "—"
  if (num >= 1_00_00_000) return `₹${(num / 1_00_00_000).toFixed(2)} Cr`
  if (num >= 1_00_000) return `₹${(num / 1_00_000).toFixed(2)} L`
  return `₹${Number(num).toLocaleString("en-IN")}`
}

export default function DashboardPage() {
  const { projectId } = useParams()
  // const [activeTab, setActiveTab] = useState("Overview")

  const [details, setDetails] = useState(null)
  const [members, setMembers] = useState({ members: [], totalMembers: 0 })
  const [kpis, setKpis] = useState(null)
  const [phases, setPhases] = useState(null)
  const [alerts, setAlerts] = useState(null)

  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(true)
  const [kpisLoading, setKpisLoading] = useState(true)
  const [phasesLoading, setPhasesLoading] = useState(true)
  const [alertsLoading, setAlertsLoading] = useState(true)

  const controllerRef = useRef(null)

  const loadAll = useCallback(async () => {
    if (!projectId) return
    controllerRef.current?.abort()
    const ctrl = new AbortController()
    controllerRef.current = ctrl
    const signal = ctrl.signal

    setDetailsLoading(true)
    setKpisLoading(true)
    setPhasesLoading(true)
    setAlertsLoading(true)

    const safeSet = (fn, setLoading, setData) =>
      fn(projectId, signal)
        .then(setData)
        .catch(err => {
          if (err.name === "CanceledError") return
          toast.error("Failed to load data", { description: formatDashboardError(err) })
        })
        .finally(() => setLoading(false))

    await Promise.all([
      Promise.all([
        fetchProjectDetails(projectId, signal),
        fetchDashboardMembers(projectId, signal),
      ])
        .then(([det, mem]) => {
          setDetails(det)
          setMembers(mem)
        })
        .catch(err => {
          if (err.name !== "CanceledError") {
            toast.error("Failed to load project details", { description: formatDashboardError(err) })
          }
        })
        .finally(() => setDetailsLoading(false)),

      safeSet(fetchProjectKPIs, setKpisLoading, setKpis),
      safeSet(fetchPhaseGrowth, setPhasesLoading, setPhases),
      safeSet(
        (id, sig) => fetchSmartAlerts(id, { limit: 10 }, sig),
        setAlertsLoading,
        setAlerts
      ),
    ])

    setIsInitialLoad(false)
  }, [projectId])

  useEffect(() => {
    loadAll()
    return () => controllerRef.current?.abort()
  }, [loadAll])

  if (isInitialLoad) return <LoadingSkeleton />

  const overviewData = {
    title: details?.projectName || "—",
    code: details?.projectCode ? `#${details.projectCode}` : "—",
    description: details?.description || "",
    startDate: fmt(details?.startDate),
    endDate: fmt(details?.endDate),
    status: details?.status || "—",
    health: details?.healthStatus || "—",
    budgetTotal: fmtBudget(details?.budget),
    completionPercent: details?.completionPercent || 0,
    coverImage: details?.coverImage || null,
    timelineProgress: details?.timelineProgress || 0,
    remainingDays: details?.remainingDays || 0,
    isOverdue: details?.isOverdue || false,
    members: (members?.members || []).map(m => ({
      name: m.name || "Unknown",
      email: m.email || "",
      role: m.role || "Member",
      avatar: m.avatar || null,
      taskCount: m.taskCount || 0,
      subTaskCount: m.subTaskCount || 0,
    })),
    kpis,
    phaseData: (phases?.phases || []).map(p => ({
      name: p.phaseName?.slice(0, 4) || "—",
      value: p.completionPercent || 0,
      planned: p.plannedProgress || 0,
      health: p.timeline?.phaseHealth || "on_track",
    })),
    alerts: alerts?.alerts || [],
    alertSummary: alerts?.summary || { total: 0, critical: 0, warning: 0, info: 0 },
  }

  const executionData = {
    kpis,
    taskStatusSummary: kpis?.taskStatusSummary || {},
    totalTasks: kpis?.totalTasks || 0,
    overdueTasksCount: kpis?.overdueTasksCount || 0,
    criticalIssuesCount: kpis?.criticalIssuesCount || 0,
    pendingApprovals: kpis?.pendingApprovals || { total: 0 },
    scheduleDeviation: kpis?.scheduleDeviation || null,
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA] dark:bg-[#121212] rounded-lg p-6 lg:p-10 font-sfpro transition-colors duration-300">
      <ProjectHeader
        // activeTab={activeTab}
        // setActiveTab={setActiveTab}
      />

      {/* Tab-based rendering — commented out for now */}
      {/* {activeTab === "Overview" ? ( */}
        <OverviewTab
          data={overviewData}
          rawDetails={details}
          isLoading={detailsLoading || kpisLoading || phasesLoading || alertsLoading}
          phasesLoading={phasesLoading}
          alertsLoading={alertsLoading}
          projectId={projectId}
          onRefresh={loadAll}
        />
      {/* ) : (
        <ExecutionTab
          data={executionData}
          isLoading={kpisLoading}
          projectId={projectId}
        />
      )} */}
    </main>
  )
}