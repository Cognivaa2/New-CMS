"use client"

import { useParams } from "next/navigation"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { toast } from "sonner"
import {
  fetchGanttData,
  flattenHierarchy,
  getVisibleRows,
  exportGanttExcel,
  formatToastError,
} from "./api"
import GanttHeader from "@/components/projects/(project)/gantt/GanttHeader"
import GanttChart from "@/components/projects/(project)/gantt/GanttChart"
import GanttLoading from "./loading"

export default function GanttPage() {
  const params = useParams()
  const projectId = params?.projectId

  const [isLoading, setIsLoading] = useState(true)
  const [projectData, setProjectData] = useState(null)
  const [viewMode, setViewMode] = useState("day")
  const [collapsedIds, setCollapsedIds] = useState(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const controllerRef = useRef(null)
  const exportControllerRef = useRef(null)

  const loadData = useCallback(async () => {
    if (!projectId) return
    if (controllerRef.current) controllerRef.current.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setIsLoading(true)
    try {
      const data = await fetchGanttData(projectId, controller.signal)
      if (!controller.signal.aborted) {
        setProjectData(data)
      }
    } catch (err) {
      if (err.name !== "AbortError" && err.name !== "CanceledError") {
        console.error("Failed to load gantt data:", err)
        toast.error("Failed to load Gantt data", {
          description: formatToastError(err),
        })
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [projectId])

  useEffect(() => {
    loadData()
    return () => {
      controllerRef.current?.abort()
      exportControllerRef.current?.abort()
    }
  }, [loadData])

  const handleExport = useCallback(async () => {
    if (!projectId || !projectData || isExporting) return

    if (exportControllerRef.current) exportControllerRef.current.abort()
    const controller = new AbortController()
    exportControllerRef.current = controller

    setIsExporting(true)
    try {
      const projectName = projectData.project.projectName || "Project"
      const { filename } = await exportGanttExcel(projectId, projectName, controller.signal)
      if (!controller.signal.aborted) {
        toast.success("Export Successful", {
          description: `Downloaded "${filename}"`,
        })
      }
    } catch (err) {
      if (err.name !== "AbortError" && err.name !== "CanceledError") {
        console.error("Failed to export Gantt Excel:", err)
        toast.error("Export Failed", {
          description: formatToastError(err),
        })
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsExporting(false)
      }
      if (exportControllerRef.current === controller) {
        exportControllerRef.current = null
      }
    }
  }, [projectId, projectData, isExporting])

  const allRows = useMemo(() => {
    if (!projectData?.phases) return []
    return flattenHierarchy(projectData.phases)
  }, [projectData])

  const visibleRows = useMemo(() => {
    return getVisibleRows(allRows, collapsedIds)
  }, [allRows, collapsedIds])

  const toggleCollapse = useCallback((id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleRefresh = useCallback(() => {
    setCollapsedIds(new Set())
    loadData()
  }, [loadData])

  if (isLoading) return <GanttLoading />
  if (!projectData) return null

  const { project } = projectData
  return (
    <div className="w-full mx-auto px-6 pt-6 flex flex-col gap-4 bg-[#FAFAFA] dark:bg-[#121212] rounded-lg overflow-hidden h-screen">
      <GanttHeader
        project={project}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefresh={handleRefresh}
        onExport={handleExport}
        isExporting={isExporting}
        totalItems={allRows.length}
      />
      <GanttChart
        rows={visibleRows}
        project={project}
        viewMode={viewMode}
        collapsedIds={collapsedIds}
        onToggleCollapse={toggleCollapse}
      />
    </div>
  )
}