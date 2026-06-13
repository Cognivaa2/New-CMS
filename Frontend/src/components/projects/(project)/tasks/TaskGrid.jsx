import TaskCard from "./TaskCard"
import { ClipboardList } from "lucide-react"

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#f4f4f5] dark:bg-[#27272a] flex items-center justify-center">
        <ClipboardList className="w-7 h-7 text-[#a1a1aa]" />
      </div>
      <div>
        <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
          No tasks yet
        </p>
        <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">
          Create your first task to start tracking progress.
        </p>
      </div>
    </div>
  )
}

export default function TaskGrid({ 
  tasks, 
  phaseName, 
  onEdit, 
  onDelete,
  projectUsers = [],
  isLoadingUsers = false,
  onAssignMember,
  onUnassignMember,
  onMembersChanged,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4">
      {tasks.length === 0 ? (
        <EmptyState />
      ) : (
        tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            phaseName={phaseName}
            onEdit={onEdit}
            onDelete={onDelete}
            projectUsers={projectUsers}
            isLoadingUsers={isLoadingUsers}
            onAssignMember={onAssignMember}
            onUnassignMember={onUnassignMember}
            onMembersChanged={onMembersChanged}
          />
        ))
      )}
    </div>
  )
}