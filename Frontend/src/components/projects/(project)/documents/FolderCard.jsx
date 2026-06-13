"use client"

import { Folder, Eye, Pencil, Trash2, FileText, Image, FileSpreadsheet, File, Link2, Unlink } from "lucide-react"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"
import { SmoothCorners } from "react-smooth-corners"

function getFileIcon(type) {
  switch (type?.toLowerCase()) {
    case "pdf":
      return <FileText className="w-8 h-8 text-blue-500" strokeWidth={1.5} />
    case "image":
      return <Image className="w-8 h-8 text-blue-500" strokeWidth={1.5} />
    case "excel":
      return <FileSpreadsheet className="w-8 h-8 text-blue-500" strokeWidth={1.5} />
    case "word":
      return <FileText className="w-8 h-8 text-blue-500" strokeWidth={1.5} />
    case "cad":
      return <File className="w-8 h-8 text-blue-500" strokeWidth={1.5} />
    default:
      return <Folder className="w-8 h-8 text-blue-500" strokeWidth={1} />
  }
}

function UploaderAvatar({ name, avatarUrl }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?"

  const colors = ["#e0e7ff", "#fce7f3", "#d1fae5", "#fef9c3", "#fee2e2", "#ede9fe", "#ffedd5", "#cffafe"]
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0
  const bg = colors[colorIndex]
  const textColors = ["#4f46e5", "#db2777", "#059669", "#ca8a04", "#dc2626", "#7c3aed", "#ea580c", "#0891b2"]
  const fg = textColors[colorIndex]

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? "uploader"}
        className="w-4 h-4 rounded-full object-cover shrink-0 ring-1 ring-white dark:ring-zinc-800"
      />
    )
  }

  return (
    <span
      className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center ring-1 ring-white dark:ring-zinc-800 text-[7px] font-bold leading-none"
      style={{ backgroundColor: bg, color: fg }}
    >
      {initials}
    </span>
  )
}

export default function FolderCard({ data, onClick, onEdit, onDelete, onLink, onUnlink }) {
  const isLinked = !!data?.linkedTo?.refId

  const menuItems = [
    {
      label: "View document",
      icon: <Eye className="w-4 h-4" />,
      onClick: () => onClick?.(),
    },
    {
      label: "Edit",
      icon: <Pencil className="w-4 h-4" />,
      onClick: () => onEdit?.(data),
    },
    {
      label: "Link to…",
      icon: <Link2 className="w-4 h-4" />,
      onClick: () => onLink?.(data),
    },
    ...(isLinked
      ? [
          {
            label: "Remove link",
            icon: <Unlink className="w-4 h-4" />,
            variant: "danger",
            onClick: () => onUnlink?.(data),
          },
        ]
      : []),
    "divider",
    {
      label: "Delete",
      icon: <Trash2 className="w-4 h-4" />,
      variant: "danger",
      onClick: () => onDelete?.(data),
    },
  ]

  const menuHeader = {
    title: data.title,
    subtitle: `${data.subtitle || ""} • By ${data.author}`,
    statusColor: "#545ceb",
  }

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer h-43.75 transition-all duration-300 hover:-translate-y-1"
    >
      <SmoothCorners
        corners="8"
        borderRadius="42"
        className="
          h-full p-5.5 flex flex-col
          bg-white dark:bg-[#09090b]
          border border-gray-200/80 dark:border-zinc-800/80
          shadow-[0_2px_10px_rgba(0,0,0,0.04)]
          dark:shadow-none
          transition-all duration-300
        "
      >
        <div className="flex justify-between items-start">
          <div className="relative">
            {getFileIcon(data.type)}
            {isLinked && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#212121] dark:bg-white flex items-center justify-center">
                <Link2 className="w-2.5 h-2.5 text-white dark:text-black" strokeWidth={2.5} />
              </div>
            )}
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 relative z-10 -mr-2 -mt-2"
          >
            <ThreeDotMenu items={menuItems} size="sm" header={menuHeader} />
          </div>
        </div>

        <div className="mt-auto flex flex-col">
          <h3 className="text-base font-sfpro-bold text-[#1f1f1f] dark:text-[#f4f4f5] mb-2 line-clamp-2">
            {data.title}
          </h3>

          <div className="flex flex-col gap-1 text-xs font-sfpro text-[#8b8b8b] dark:text-[#888888]">
            <div className="flex items-center gap-1.5">
              <UploaderAvatar name={data.author} avatarUrl={data.avatarUrl} />
              <span className="truncate max-w-22.5">{data.author ?? "Unknown"}</span>
              <span className="w-1 h-1 rounded-full bg-[#c2c2c2] dark:bg-zinc-600 shrink-0" />
              <span className="shrink-0">{data.date}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-[#c2c2c2] dark:bg-zinc-600" />
              <span>{data.size}</span>
              <span className="w-1 h-1 rounded-full bg-[#c2c2c2] dark:bg-zinc-600" />
              <span className="uppercase">{data.type}</span>
              {isLinked && (
                <>
                  <span className="w-1 h-1 rounded-full bg-[#c2c2c2] dark:bg-zinc-600" />
                  <span className="text-[#545ceb] dark:text-[#818cf8] font-sfpro-medium">
                    Linked
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </SmoothCorners>
    </div>
  )
}