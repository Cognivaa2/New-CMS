"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { History, Search, X } from "lucide-react"
import {
    uploadImport,
    downloadTemplate,
    formatToastError,
    getToastErrorTitle,
    MODULE_GROUPS,
} from "./api"
import ModuleGrid from "@/components/imports/ModuleGrid"
import UploadDrawer from "@/components/imports/UploadDrawer"
import JobStatusModal from "@/components/imports/JobStatusModal"
import HistoryDrawer from "@/components/imports/HistoryDrawer"

export default function ImportsPage() {
    const [searchQuery, setSearchQuery] = useState("")
    const [activeGroup, setActiveGroup] = useState(null)

    const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false)
    const [selectedModule, setSelectedModule] = useState(null)
    const [isUploading, setIsUploading] = useState(false)

    const [activeJob, setActiveJob] = useState(null)
    const [statusModalOpen, setStatusModalOpen] = useState(false)

    const [historyOpen, setHistoryOpen] = useState(false)

    const handleImportClick = useCallback((module) => {
        setSelectedModule(module)
        setUploadDrawerOpen(true)
    }, [])

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
                e.preventDefault()
                document.querySelector('input[placeholder="Search modules..."]')?.focus()
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    const handleDownloadTemplate = useCallback((moduleKey) => {
        downloadTemplate(moduleKey)
        toast.success("Template downloaded", {
            description: "Fill in the template and upload it to import data.",
        })
    }, [])

    const handleUploadSubmit = async ({ module, file }) => {
        setIsUploading(true)
        try {
            const result = await uploadImport({ module, file })
            toast.success("Import started", {
                description: `Job created for ${result.totalRows} row(s). Tracking progress...`,
            })
            setUploadDrawerOpen(false)
            setActiveJob({ jobId: result.jobId, moduleName: selectedModule?.label })
            setStatusModalOpen(true)
        } catch (err) {
            toast.error(getToastErrorTitle(err, "Import failed"), {
                description: formatToastError(err),
            })
            throw err
        } finally {
            setIsUploading(false)
        }
    }

    const handleViewHistoryJob = (job) => {
        setHistoryOpen(false)
        setActiveJob({ jobId: job._id, moduleName: job.module })
        setStatusModalOpen(true)
    }

    return (
        <div className="w-full min-h-screen bg-[#FAFAFA] dark:bg-[#121212] py-8 px-4 lg:px-8 transition-colors duration-300">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-10">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-[36px] lg:text-[42px] font-sfpro-bold text-[#09090b] dark:text-[#f4f4f5] leading-none tracking-tight">
                            Imports
                        </h1>
                        <span className="mt-1 flex items-center justify-center min-w-7 h-7 px-2 rounded-md bg-[#f4f4f5] dark:bg-[#1c1c1c] border border-[#dfdfdf] dark:border-[#353535] text-[#636366] dark:text-[#a1a1aa] text-sm font-sfpro-medium">
                            17
                        </span>
                    </div>
                    <p className="text-[13px] lg:text-[14px] text-[#a3a3a3] dark:text-[#71717a] mt-3 max-w-md leading-snug">
                        Bulk import data into any module using Excel or CSV files.
                        Download a template, fill it in, and upload.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex items-center w-full sm:w-[320px] lg:w-72">
                        <Search className="w-5 h-5 absolute left-3 pointer-events-none text-gray-400 dark:text-zinc-500 transition-colors" />

                        <input
                            type="text"
                            placeholder="Search modules..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] rounded-xl text-sm text-gray-700 dark:text-zinc-300 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-zinc-700 focus:border-gray-300 dark:focus:border-zinc-700 transition-all duration-300 font-sfpro"
                        />

                        <div className="absolute right-2.5 flex items-center">
                            {searchQuery ? (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors duration-150"
                                    aria-label="Clear search"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            ) : (
                                <div className="hidden sm:flex items-center justify-center bg-[#f4f4f5] dark:bg-[#27272a] border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 text-xs rounded-md w-6 h-6 font-sfpro-medium transition-colors duration-300">
                                    /
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => setHistoryOpen(true)}
                        className="h-10 px-4 flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-sm font-sfpro-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <History className="w-4 h-4" />
                        History
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-8">
                <button
                    onClick={() => setActiveGroup(null)}
                    className={`h-8 px-4 rounded-full text-[12px] font-sfpro-bold transition-all duration-150 ${!activeGroup
                            ? "bg-[#212121] dark:bg-white text-white dark:text-black"
                            : "bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                        }`}
                >
                    All
                </button>
                {MODULE_GROUPS.map((group) => (
                    <button
                        key={group}
                        onClick={() => setActiveGroup(activeGroup === group ? null : group)}
                        className={`h-8 px-4 rounded-full text-[12px] font-sfpro-bold transition-all duration-150 ${activeGroup === group
                                ? "bg-[#212121] dark:bg-white text-white dark:text-black"
                                : "bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                            }`}
                    >
                        {group}
                    </button>
                ))}
            </div>
            <ModuleGrid
                searchQuery={searchQuery}
                activeGroup={activeGroup}
                onImport={handleImportClick}
                onDownloadTemplate={handleDownloadTemplate}
            />

            <UploadDrawer
                open={uploadDrawerOpen}
                module={selectedModule}
                onClose={() => setUploadDrawerOpen(false)}
                onSubmit={handleUploadSubmit}
                isUploading={isUploading}
            />

            <JobStatusModal
                open={statusModalOpen}
                jobId={activeJob?.jobId}
                moduleName={activeJob?.moduleName}
                onClose={() => {
                    setStatusModalOpen(false)
                    setActiveJob(null)
                }}
            />

            <HistoryDrawer
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                onViewJob={handleViewHistoryJob}
            />
        </div>
    )
}