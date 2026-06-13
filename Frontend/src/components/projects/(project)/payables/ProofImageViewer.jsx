"use client"

import { useState, useEffect } from "react"
import {
    X, ZoomIn, ZoomOut, RotateCw,
    Download, ExternalLink, FileImage
} from "lucide-react"

function Backdrop({ visible, onClose }) {
    return (
        <div
            onClick={onClose}
            style={{ transitionDuration: "400ms" }}
            className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ease-in-out ${
                visible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
        />
    )
}
function ToolbarBtn({ onClick, disabled, children }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-[#71717a] hover:bg-gray-200 dark:hover:bg-[#27272a] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
            {children}
        </button>
    )
}
function ImageArea({ imageUrl, title, zoom, rotation }) {
    const [imgLoaded, setImgLoaded] = useState(false)
    const [imgError, setImgError]   = useState(false)
    useEffect(() => {
        setImgLoaded(false)
        setImgError(false)
    }, [imageUrl])

    if (imgError) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6 w-full rounded-xl border border-gray-100 dark:border-[#252525] bg-gray-50 dark:bg-[#18181b]">
                <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                    <FileImage className="w-7 h-7 text-red-400" />
                </div>
                <p className="text-[14px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]">
                    Failed to load image
                </p>
                <a
                    href={imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 h-9 px-4 rounded-lg text-[13px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all flex items-center gap-2"
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in new tab
                </a>
            </div>
        )
    }

    return (
        <div className="relative w-full rounded-xl overflow-hidden border border-gray-100 dark:border-[#252525] bg-[#f4f4f5] dark:bg-[#0d0d0d] flex items-center justify-center min-h-48">

            {!imgLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-[#27272a] border-t-blue-500 animate-spin" />
                    <p className="text-[12px] text-gray-400 dark:text-[#52525b] font-sfpro">
                        Loading image…
                    </p>
                </div>
            )}

            <div className="p-4 flex items-center justify-center w-full overflow-auto" style={{ scrollbarWidth: "thin" }}>
                <img
                    src={imageUrl}
                    alt={title}
                    onLoad={() => setImgLoaded(true)}
                    onError={() => setImgError(true)}
                    draggable={false}
                    style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transition: "transform 0.2s ease",
                        maxWidth: "100%",
                        maxHeight: "48dvh",
                        opacity: imgLoaded ? 1 : 0,
                    }}
                    className="rounded-xl shadow-lg object-contain select-none"
                />
            </div>
        </div>
    )
}


export default function ProofImageViewer({
    open,
    onClose,
    imageUrl,
    title    = "Payment Proof",
    subtitle = "",
}) {
    const [mounted,  setMounted]  = useState(false)
    const [visible,  setVisible]  = useState(false)
    const [zoom,     setZoom]     = useState(1)
    const [rotation, setRotation] = useState(0)

    useEffect(() => {
        if (open) {
            setMounted(true)
            setZoom(1)
            setRotation(0)
            requestAnimationFrame(() =>
                requestAnimationFrame(() => setVisible(true))
            )
        } else {
            setVisible(false)
            const t = setTimeout(() => setMounted(false), 420)
            return () => clearTimeout(t)
        }
    }, [open])

    useEffect(() => {
        const fn = (e) => { if (e.key === "Escape" && open) onClose() }
        window.addEventListener("keydown", fn)
        return () => window.removeEventListener("keydown", fn)
    }, [open, onClose])

    if (!mounted) return null

    return (
        <>
            <Backdrop visible={visible} onClose={onClose} />
            <div
                style={{
                    transitionDuration: "1000ms",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${
                    visible ? "translate-y-0" : "translate-y-full"
                }`}
            >
                <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[80dvh] flex flex-col transition-colors duration-300">

                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46] transition-colors" />
                    </div>

                    <div className="flex items-start justify-center px-8 lg:px-10 pt-5 pb-4 shrink-0">
                        <div className="flex flex-col items-center">
                            <h2 className="text-lg lg:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight transition-colors">
                                {title}
                            </h2>
                            {subtitle && (
                                <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    <div
                        className="flex-1 overflow-y-auto px-8 lg:px-10 py-5"
                        style={{ scrollbarWidth: "none" }}
                    >
                        <div className="w-full lg:max-w-2xl xl:max-w-3xl lg:mx-auto">
                            <ImageArea
                                imageUrl={imageUrl}
                                title={title}
                                zoom={zoom}
                                rotation={rotation}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 border-t border-gray-100 dark:border-[#1e1e1e] transition-colors">
                        <button
                            onClick={onClose}
                            className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] transition-all duration-150"
                        >
                            Close
                        </button>
                    </div>

                </div>
            </div>
        </>
    )
}