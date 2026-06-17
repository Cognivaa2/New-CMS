"use client"

import { SearchX, Boxes } from "lucide-react"
import ModuleCard from "./ModuleCard"
import { IMPORT_MODULES, MODULE_GROUPS } from "@/app/(companyname)/imports/api"

function EmptyState({ isFiltered }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
        {isFiltered ? (
          <SearchX className="w-6 h-6 text-gray-500 dark:text-zinc-400" />
        ) : (
          <Boxes className="w-6 h-6 text-gray-500 dark:text-zinc-400" />
        )}
      </div>

      <p className="text-[15px] font-sfpro-medium text-zinc-600 dark:text-zinc-300">
        {isFiltered ? "No matching modules found" : "No import modules available"}
      </p>

      <p className="text-sm font-sfpro text-zinc-400 dark:text-zinc-500 mt-1">
        {isFiltered
          ? "Try adjusting your search or selected group."
          : "Import modules will appear here once configured."}
      </p>
    </div>
  )
}

export default function ModuleGrid({
  searchQuery = "",
  activeGroup = null,
  onImport,
  onDownloadTemplate,
}) {
  const filtered = IMPORT_MODULES.filter((mod) => {
    const matchesSearch =
      !searchQuery ||
      mod.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.group.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesGroup = !activeGroup || mod.group === activeGroup
    return matchesSearch && matchesGroup
  })

  const isFiltered = !!searchQuery || !!activeGroup

  if (filtered.length === 0) {
    return <EmptyState isFiltered={isFiltered} />
  }

  const grouped = MODULE_GROUPS.reduce((acc, group) => {
    const mods = filtered.filter((m) => m.group === group)
    if (mods.length > 0) acc[group] = mods
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-10">
      {Object.entries(grouped).map(([group, modules]) => (
        <section key={group}>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-[13px] font-sfpro-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {group}
            </h2>
            <div className="flex-1 h-px bg-gray-100 dark:bg-zinc-800" />
            <span className="text-[11px] font-sfpro-medium text-zinc-400 dark:text-zinc-600">
              {modules.length} {modules.length === 1 ? "module" : "modules"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {modules.map((mod) => (
              <ModuleCard
                key={mod.key}
                module={mod}
                onImport={onImport}
                onDownloadTemplate={onDownloadTemplate}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}