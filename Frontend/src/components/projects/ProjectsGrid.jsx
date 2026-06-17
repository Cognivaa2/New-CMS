"use client"

import ProjectCard from "./ProjectCard"

export default function ProjectsGrid({ 
  projects, 
  activeProject, 
  onProjectChange,
  onEdit,
  onDelete,
  onToggleStatus,
  onMembersChanged,
  onExport,  
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mt-2">
      {projects.map((project, index) => (
        <ProjectCard 
          key={project.id}
          project={project}
          index={index}
          isActive={activeProject?.id === project.id}
          onClick={() => onProjectChange(project)}
          onEdit={() => onEdit(project)}
          onDelete={() => onDelete(project)}
          onToggleStatus={() => onToggleStatus(project)}
          onMembersChanged={onMembersChanged}
          onExport={() => onExport(project)}
        />
      ))}
    </div>
  )
}