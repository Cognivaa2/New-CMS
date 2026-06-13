import { Layers } from "lucide-react"

export default function ProjectsTab({ projects = [], isLoading = false, onRowClick }) {
    const getInitials = (name) => {
        if (!name) return "?"
        return name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    return (
        <div className="flex flex-col font-sfpro">
            {projects.length === 0 && !isLoading ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#f4f4f5] dark:bg-[#27272a] flex items-center justify-center">
                        <Layers className="w-7 h-7 text-[#a1a1aa]" />
                    </div>
                    <div>
                        <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
                            No Projects yet
                        </p>
                        <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">
                            No projects assigned yet
                        </p>
                    </div>
                </div>
            ) : (
                projects.map((project) => (
                    <div
                        key={project.projectId}
                        onClick={() => onRowClick?.(project.projectId)}
                        className="flex items-center gap-2 py-5 transition-colors cursor-pointer"
                    >
                        <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full overflow-hidden shrink-0 border border-gray-200 dark:border-[#27272a] transition-colors">
                            {project.coverImage ? (
                                <img
                                    src={project.coverImage}
                                    alt={project.projectName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#e4e4e7] dark:bg-[#27272a] transition-colors">
                                    <span className="text-sm lg:text-base font-sfpro-bold text-[#3f3f46] dark:text-[#a1a1aa]">
                                        {getInitials(project.projectName)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                            <p className="text-sm lg:text-lg font-sfpro-bold text-gray-900 dark:text-[#f4f4f5] transition-colors">
                                {project.projectName}
                            </p>
                            <p className="max-w-120 text-xs font-sfpro text-[#919191] dark:text-[#71717a] line-clamp-2 leading-snug transition-colors">
                                {project.description}
                            </p>
                        </div>

                        <div className="flex items-center flex-1 justify-between">
                            <div className="hidden sm:flex flex-col items-start shrink-0 gap-0.5">
                                <p className="text-[12px] font-sfpro text-gray-500 dark:text-[#71717a] transition-colors">
                                    You are assigned as
                                </p>
                                <p className="text-[13px] font-sfpro-bold text-gray-900 dark:text-[#f4f4f5] transition-colors">
                                    {project.assignedAs ? (
                                        <span>{project.assignedAs}</span>
                                    ) : (
                                        <span className="text-sm font-sfpro italic text-[#c2c2c2] dark:text-[#3f3f46] transition-colors">
                                            Not provided
                                        </span>
                                    )}
                                </p>
                            </div>

                            <div className="flex flex-col items-end shrink-0 gap-0 min-w-16">
                                <p className="text-[24px] font-sfpro-bold text-gray-900 dark:text-[#f4f4f5] leading-tight transition-colors">
                                    {project.completionPercent}%
                                </p>
                                <p className="text-[12px] font-sfpro text-gray-400 dark:text-[#71717a] transition-colors">
                                    Completed
                                </p>
                            </div>
                        </div>
                    </div>
                ))
            )}

            {isLoading && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a]">
                    <div className="w-4 h-4 border-2 border-gray-300 dark:border-[#3f3f46] border-t-transparent rounded-full animate-spin" />
                    Loading more projects...
                </div>
            )}
        </div>
    )
}