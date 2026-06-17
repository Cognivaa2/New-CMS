"use client"

import SummaryCard from "@/components/ui/SummaryCard"

export default function TWMStats({ stats = [] }) {
    if (!stats.length) return null
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {stats.map((stat, index) => (
                <SummaryCard key={stat.id} item={stat} index={index} />
            ))}
        </div>
    )
}