// api.js
import axios from "axios"
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export function getCompanyId() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("companyId")
}
export function getAuthHeaders({ includeContentType = true } = {}) {
  const companyId = getCompanyId()
  const accessToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
  const headers = {}
  if (includeContentType) headers["Content-Type"] = "application/json"
  if (companyId) headers["x-company-id"] = companyId
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`
  return headers
}
export function getBaseUrl() {
  return BASE_URL
}
const API_BASE_URL = getBaseUrl()
export function formatToastError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}
export const fetchGanttData = async (projectId, signal) => {
  if (!projectId) throw new Error("Project ID is required")

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/gantt/${projectId}`,
      {
        headers: getAuthHeaders(),
        signal,
      }
    )

    if (data.statusCode !== 200 || !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch Gantt data")
    }

    return data.data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch Gantt data"
    )
  }
}
export const exportGanttExcel = async (projectId, projectName = "Project", signal) => {
  if (!projectId) throw new Error("Project ID is required");
  try {
    const headers = getAuthHeaders({ includeContentType: false });
    headers.Accept = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const response = await axios.get(
      `${API_BASE_URL}/gantt/export/${projectId}`,
      {
        headers,
        responseType: "arraybuffer", 
        signal,
        validateStatus: (status) => status < 500,
      }
    );
    if (response.status !== 200) {
      let errorMessage = "Failed to export Gantt Excel";
      try {
        const text = new TextDecoder().decode(response.data);
        const parsed = JSON.parse(text);
        errorMessage = parsed.description || parsed.message || errorMessage;
      } catch {
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers["content-type"] || "";
    if (!contentType.includes("application/vnd.openxmlformats")) {
      let errorMessage = "Invalid file format received";
      try {
        const text = new TextDecoder().decode(response.data);
        const parsed = JSON.parse(text);
        errorMessage = parsed.description || parsed.message || errorMessage;
      } catch {
      }
      throw new Error(errorMessage);
    }
    let filename = `Gantt_${projectName.replace(/[^a-zA-Z0-9_\- ]/g, "").trim()}_${Date.now()}.xlsx`;
    const disposition = response.headers["content-disposition"];
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match?.[1]) {
        filename = match[1].replace(/['"]/g, '');
      }
    }
    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);

    return { filename };
  } catch (error) {
    if (error.name === "CanceledError" || error.name === "AbortError") {
      throw error;
    }
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to export Gantt Excel"
    );
  }
};
export const flattenHierarchy = (phases) => {
  const rows = []
  phases.forEach((phase) => {
    rows.push({
      id: `phase-${phase._id}`,
      name: phase.phaseName,
      type: "phase",
      start: new Date(phase.startDate),
      end: new Date(phase.endDate),
      progress: phase.completionPercent || 0,
      parentId: null,
      depth: 0,
      hasChildren: (phase.tasks?.length || 0) > 0,
    })
    phase.tasks?.forEach((task) => {
      rows.push({
        id: `task-${task._id}`,
        name: task.taskName || task.title || "",
        type: "task",
        start: new Date(task.startDate),
        end: new Date(task.endDate),
        progress: task.completionPercent || task.progress || 0,
        parentId: `phase-${phase._id}`,
        depth: 1,
        hasChildren: (task.subTasks?.length || 0) > 0,
      })
      task.subTasks?.forEach((subTask) => {
        rows.push({
          id: `subtask-${subTask._id}`,
          name: subTask.subTaskName || subTask.title || "",
          type: "subtask",
          start: new Date(subTask.startDate),
          end: new Date(subTask.endDate),
          progress: subTask.completionPercent || subTask.progress || 0,
          parentId: `task-${task._id}`,
          depth: 2,
          hasChildren: false,
        })
      })
    })
  })
  return rows
}
export const formatFullDate = (date) => {
  if (!date) return ""
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}
export const formatShortDate = (date) => {
  if (!date) return ""
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
}
export const getDaysBetween = (start, end) => {
  const s = new Date(start)
  const e = new Date(end)
  return Math.ceil((e - s) / (1000 * 60 * 60 * 24))
}
export const generateColumns = (projectStart, projectEnd, viewMode) => {
  const start = new Date(projectStart)
  start.setDate(start.getDate() - 7)
  const end = new Date(projectEnd)
  end.setDate(end.getDate() + 14)
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  const cols = []
  if (viewMode === "day") {
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      cols.push({
        date: new Date(d),
        label: d.getDate().toString(),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      })
    }
    return { columns: cols, colWidth: 40, timelineStart: start, timelineEnd: end, totalDays }
  }
  if (viewMode === "week") {
    const current = new Date(start)
    current.setDate(current.getDate() - ((current.getDay() + 6) % 7))
    while (current < end) {
      const weekEnd = new Date(current)
      weekEnd.setDate(weekEnd.getDate() + 6)
      cols.push({
        date: new Date(current),
        label: `${current.getDate()} ${current.toLocaleDateString("en-GB", { month: "short" })}`,
        endDate: weekEnd,
        isWeekend: false,
      })
      current.setDate(current.getDate() + 7)
    }
    return { columns: cols, colWidth: 120, timelineStart: start, timelineEnd: end, totalDays }
  }
  const current = new Date(start.getFullYear(), start.getMonth(), 1)
  while (current < end) {
    cols.push({
      date: new Date(current),
      label: current.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
      isWeekend: false,
    })
    current.setMonth(current.getMonth() + 1)
  }
  return { columns: cols, colWidth: 160, timelineStart: start, timelineEnd: end, totalDays }
}
export const getVisibleRows = (allRows, collapsedIds) => {
  const result = []
  const hiddenParents = new Set()

  allRows.forEach((row) => {
    if (row.parentId && hiddenParents.has(row.parentId)) {
      hiddenParents.add(row.id)
      return
    }
    if (row.parentId && collapsedIds.has(row.parentId)) {
      hiddenParents.add(row.id)
      return
    }
    result.push(row)
  })

  return result
}
export const getBarPosition = (row, timelineStart, totalDays, timelineWidth) => {
  const start = new Date(row.start)
  const end = new Date(row.end)
  const tStart = new Date(timelineStart)

  const startDiff = (start - tStart) / (1000 * 60 * 60 * 24)
  const duration = (end - start) / (1000 * 60 * 60 * 24) + 1

  const left = (startDiff / totalDays) * timelineWidth
  const width = (duration / totalDays) * timelineWidth

  return { left: Math.max(0, left), width: Math.max(8, width) }
}
export const getTodayPosition = (timelineStart, timelineEnd, totalDays, timelineWidth) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(timelineStart)
  start.setHours(0, 0, 0, 0)

  if (today >= start && today <= timelineEnd) {
    const daysDiff = (today - start) / (1000 * 60 * 60 * 24)
    return (daysDiff / totalDays) * timelineWidth
  }
  return null
}


export const VIEW_CONFIGS = {
  day: { min: 30, max: 100, default: 40 },
  week: { min: 80, max: 300, default: 120 },
  month: { min: 120, max: 500, default: 160 }
};