// components/projects/(project)/documents/FolderGrid.jsx
"use client"
import { useState } from "react"
import FolderCard from "./FolderCard"
import DocumentViewerModal from "./DocumentViewerModal"
import { FileX } from "lucide-react"

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#f4f4f5] dark:bg-[#27272a] flex items-center justify-center">
        <FileX className="w-7 h-7 text-[#a1a1aa]" />
      </div>
      <div>
        <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
          No documents yet
        </p>
        <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">
          Upload your first document to get started.
        </p>
      </div>
    </div>
  )
}

export default function FolderGrid({ folders, projectId, onEdit, onDelete, onLink,
  onUnlink, }) {
  const [selectedDoc, setSelectedDoc] = useState(null)

  if (!folders || folders.length === 0) {
    return <EmptyState />
  }

  const handleDocumentClick = (folder) => {
    setSelectedDoc({
      ...folder,
      projectId,
    })
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
        {folders.map((folder) => (
          <FolderCard
            key={folder.id}
            data={folder}
            onClick={() => handleDocumentClick(folder)}
            onEdit={onEdit}
            onDelete={onDelete}
            onLink={onLink}
            onUnlink={onUnlink}
          />
        ))}
      </div>

      <DocumentViewerModal
        doc={selectedDoc}
        open={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
      />
    </>
  )
}