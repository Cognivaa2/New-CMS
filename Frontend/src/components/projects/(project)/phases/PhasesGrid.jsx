"use client"

import { useCallback } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import PhaseCard from "./PhasesCard"
import { Layers } from "lucide-react"

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#f4f4f5] dark:bg-[#27272a] flex items-center justify-center">
        <Layers className="w-7 h-7 text-[#a1a1aa]" />
      </div>
      <div>
        <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
          No phases yet
        </p>
        <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">
          Create your first phase to start tracking progress.
        </p>
      </div>
    </div>
  )
}
function DraggablePhaseCard({ phase, index, onEdit, onDelete, onViewDocuments }) {
  return (
    <Draggable draggableId={phase.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`transition-transform duration-200 ${
            snapshot.isDragging ? "z-50" : "z-0"
          }`}
          style={{
            ...provided.draggableProps.style,
          }}
        >
          <PhaseCard
            phase={phase}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewDocuments={onViewDocuments}
            isDragging={snapshot.isDragging}
            dragHandleProps={provided.dragHandleProps}
          />
        </div>
      )}
    </Draggable>
  )
}

export default function PhasesGrid({
  phases = [],
  onEdit,
  onDelete,
  onReorder,
  onViewDocuments,
  isReordering = false,
}) {
  const handleDragEnd = useCallback(
    (result) => {
      const { source, destination } = result
      if (!destination) return
      if (source.index === destination.index) return
      const reorderedPhases = Array.from(phases)
      const [movedPhase] = reorderedPhases.splice(source.index, 1)
      reorderedPhases.splice(destination.index, 0, movedPhase)
      const updatedPhases = reorderedPhases.map((phase, index) => ({
        ...phase,
        sequence: index + 1,
      }))
      onReorder?.(updatedPhases)
    },
    [phases, onReorder]
  )

  if (phases.length === 0) {
    return (
      <div className="grid grid-cols-1">
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="relative">
      {isReordering && (
        <div className="absolute -top-8 left-0 flex items-center gap-2 text-sm text-[#71717a] dark:text-[#a1a1aa]">
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="font-sfpro animate-pulse">Saving order...</span>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="phases-grid" direction="horizontal">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 lg:gap-y-8 transition-all duration-200 rounded-2xl ${
                snapshot.isDraggingOver
                  ? "bg-[#fafafa] dark:bg-[#0a0a0a] p-4 -m-4"
                  : ""
              }`}
            >
              {phases.map((phase, index) => (
                <DraggablePhaseCard
                  key={phase.id}
                  phase={phase}
                  index={index}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onViewDocuments={onViewDocuments}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  )
}