"use client"
import { useEffect, useState, useRef, useCallback } from "react"
import { X, Link2, ChevronRight, Loader2, CheckCircle2 } from "lucide-react"
import { Select } from "@/components/ui/DropDown"
import {
  fetchPhases,
  fetchTasksByPhase,
  fetchSubTasksByTask,
  linkDocument,
} from "@/app/(companyname)/projects/[projectId]/documents/api.jsx"

const REF_MODEL_OPTIONS = [
  { value: "Phase", label: "Phase" },
  { value: "Task", label: "Task" },
  { value: "SubTask", label: "Sub Task" },
]

const STEP_LABELS = {
  Phase: ["Select type", "Pick a phase"],
  Task: ["Select type", "Pick a phase", "Pick a task"],
  SubTask: ["Select type", "Pick a phase", "Pick a task", "Pick a sub task"],
}

function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center gap-1.5 mb-6">
      {steps.map((label, i) => {
        const done = i < currentStep
        const active = i === currentStep
        return (
          <div key={i} className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-sfpro-bold transition-all duration-300
                  ${done ? "bg-[#212121] dark:bg-white text-white dark:text-black" : active
                      ? "bg-[#212121] dark:bg-white text-white dark:text-black ring-4 ring-[#212121]/10 dark:ring-white/10"
                      : "bg-gray-100 dark:bg-[#2c2c2e] text-gray-400 dark:text-[#666]"
                  }`}>
                {done ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
              </div>
              <span className={`text-[11px] font-sfpro-medium hidden sm:block transition-colors duration-200 ${active ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-[#666]"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="w-3 h-3 text-gray-300 dark:text-[#444] shrink-0" />
            )}
          </div>
        )
      })}
    </div>
  )
}

function DropdownRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-sfpro-bold uppercase tracking-wider text-gray-400 dark:text-[#666]">
        {label}
      </label>
      {children}
    </div>
  )
}

function LoadingPill() {
  return (
    <div className="flex items-center gap-2 h-9 px-3 rounded-xl border-2 border-[#EAEAEA] dark:border-[#252525] bg-gray-50 dark:bg-[#1a1a1a]">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 dark:text-[#666]" />
      <span className="text-sm font-sfpro text-gray-400 dark:text-[#666]">Loading…</span>
    </div>
  )
}

export default function LinkDocumentModal({
  isOpen,
  onClose,
  projectId,
  documentId,
  documentName,
  onSuccess,
}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [refModel, setRefModel] = useState(null)
  const [phaseId, setPhaseId] = useState(null)
  const [taskId, setTaskId] = useState(null)
  const [subTaskId, setSubTaskId] = useState(null)
  const [phases, setPhases] = useState([])
  const [tasks, setTasks] = useState([])
  const [subTasks, setSubTasks] = useState([])
  const [phasesLoading, setPhasesLoading] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [subTasksLoading, setSubTasksLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const phaseAbort = useRef(null)
  const taskAbort = useRef(null)
  const subTaskAbort = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => {
        setMounted(false)
        resetAll()
      }, 300)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && isOpen && !submitting) onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, submitting, onClose])

  function resetAll() {
    setRefModel(null)
    setPhaseId(null)
    setTaskId(null)
    setSubTaskId(null)
    setPhases([])
    setTasks([])
    setSubTasks([])
    setError(null)
  }

  useEffect(() => {
    if (!refModel || !isOpen) return
    if (phaseAbort.current) phaseAbort.current.abort()
    const ctrl = new AbortController()
    phaseAbort.current = ctrl
    setPhasesLoading(true)
    setPhaseId(null)
    setTaskId(null)
    setSubTaskId(null)
    setTasks([])
    setSubTasks([])
    setError(null)
    fetchPhases(projectId, ctrl.signal)
      .then(setPhases)
      .catch((err) => { if (err.name !== "CanceledError") setError("Failed to load phases") })
      .finally(() => setPhasesLoading(false))
    return () => ctrl.abort()
  }, [refModel, projectId, isOpen])

  useEffect(() => {
    if (!phaseId || refModel === "Phase") return
    if (taskAbort.current) taskAbort.current.abort()
    const ctrl = new AbortController()
    taskAbort.current = ctrl
    setTasksLoading(true)
    setTaskId(null)
    setSubTaskId(null)
    setSubTasks([])
    setError(null)
    fetchTasksByPhase(phaseId, ctrl.signal)
      .then(setTasks)
      .catch((err) => { if (err.name !== "CanceledError") setError("Failed to load tasks") })
      .finally(() => setTasksLoading(false))
    return () => ctrl.abort()
  }, [phaseId, refModel])

  useEffect(() => {
    if (!taskId || refModel !== "SubTask") return
    if (subTaskAbort.current) subTaskAbort.current.abort()
    const ctrl = new AbortController()
    subTaskAbort.current = ctrl
    setSubTasksLoading(true)
    setSubTaskId(null)
    setError(null)
    fetchSubTasksByTask(taskId, ctrl.signal)
      .then(setSubTasks)
      .catch((err) => { if (err.name !== "CanceledError") setError("Failed to load sub tasks") })
      .finally(() => setSubTasksLoading(false))
    return () => ctrl.abort()
  }, [taskId, refModel])

  const currentStep = (() => {
    if (!refModel) return 0
    if (!phaseId) return 1
    if (refModel === "Phase") return 1
    if (!taskId) return 2
    if (refModel === "Task") return 2
    if (!subTaskId) return 3
    return 3
  })()

  const refId = refModel === "Phase" ? phaseId : refModel === "Task" ? taskId : subTaskId
  const canSubmit = !!refModel && !!refId && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await linkDocument(projectId, documentId, { refModel, refId })
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.message || "Failed to link document")
    } finally {
      setSubmitting(false)
    }
  }

  const steps = STEP_LABELS[refModel] ?? ["Select type"]

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
      <div className={`absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`} onClick={!submitting ? onClose : undefined}/>

      <div className={`relative w-full max-w-115 bg-white dark:bg-[#121212] rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-6 opacity-0 scale-95"}`}>
        <div className="flex items-start justify-between gap-4 p-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#f4f4f5] dark:bg-[#1f1f1f] flex items-center justify-center shrink-0">
              <Link2 className="w-4 h-4 text-[#212121] dark:text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[17px] font-sfpro-bold text-gray-900 dark:text-white leading-tight">
                Link Document
              </h2>
                <p className="text-[12px] font-sfpro text-gray-400 dark:text-[#868686] mt-0.5 truncate max-w-70">
                  Lorem ipsum dolor sit amet, consectetur adipiscing
                </p>
            </div>
          </div>
          <button onClick={!submitting ? onClose : undefined} disabled={submitting}
            className="p-1 rounded-full bg-[#212121] dark:bg-white flex items-center justify-center hover:scale-90 transition-transform duration-200 cursor-pointer disabled:opacity-40 shrink-0 mt-0.5">
            <X className="w-4 h-4 text-white dark:text-black" strokeWidth={2.5} />
          </button>
        </div>

        <div className="h-px bg-gray-100 dark:bg-[#272727] w-full" />

        <div className="p-6 flex flex-col gap-5">
          {refModel && (
            <StepIndicator steps={steps} currentStep={currentStep} />
          )}

          <DropdownRow label="Link to">
            <Select
              options={REF_MODEL_OPTIONS}
              value={refModel}
              onChange={(val) => setRefModel(val)}
              placeholder="Phase, Task or Sub Task…"
              width="w-full"
            />
          </DropdownRow>

          {refModel && (
            <div className={`flex flex-col gap-5 transition-all duration-300`}>
              <DropdownRow label="Phase">
                {phasesLoading ? (
                  <LoadingPill />
                ) : (
                  <Select
                    options={phases}
                    value={phaseId}
                    onChange={setPhaseId}
                    placeholder={phases.length === 0 ? "No phases found" : "Select a phase…"}
                    searchable={phases.length > 5}
                    disabled={phases.length === 0}
                    width="w-full"
                  />
                )}
              </DropdownRow>

              {phaseId && refModel !== "Phase" && (
                <DropdownRow label="Task">
                  {tasksLoading ? (
                    <LoadingPill />
                  ) : (
                    <Select
                      options={tasks}
                      value={taskId}
                      onChange={setTaskId}
                      placeholder={tasks.length === 0 ? "No tasks found" : "Select a task…"}
                      searchable={tasks.length > 5}
                      disabled={tasks.length === 0}
                      width="w-full"
                    />
                  )}
                </DropdownRow>
              )}

              {taskId && refModel === "SubTask" && (
                <DropdownRow label="Sub Task">
                  {subTasksLoading ? (
                    <LoadingPill />
                  ) : (
                    <Select
                      options={subTasks}
                      value={subTaskId}
                      onChange={setSubTaskId}
                      placeholder={subTasks.length === 0 ? "No sub tasks found" : "Select a sub task…"}
                      searchable={subTasks.length > 5}
                      disabled={subTasks.length === 0}
                      width="w-full"
                    />
                  )}
                </DropdownRow>
              )}
            </div>
          )}

          {error && (
            <p className="text-[12px] font-sfpro text-[#f03e3e] bg-[#fff1f1] dark:bg-[#2a1515] px-3 py-2 rounded-xl">
              {error}
            </p>
          )}
        </div>

        <div className="h-px bg-gray-100 dark:bg-[#272727] w-full" />

        <div className="flex items-center justify-end gap-2 px-6 py-4">
          <button onClick={!submitting ? onClose : undefined} disabled={submitting}
            className="cursor-pointer px-4 py-2.5 text-sm font-sfpro-bold rounded-lg text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2c2c2e] transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit}
            className="cursor-pointer px-5 py-2.5 text-sm font-sfpro-bold rounded-lg bg-[#212121] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 transition-colors disabled:opacity-40 flex items-center gap-2">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Linking…
              </>
            ) : (
              <>
                <Link2 className="w-3.5 h-3.5" />
                Link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}