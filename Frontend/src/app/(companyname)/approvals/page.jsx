"use client"

import { useState, useEffect, useMemo } from "react"
import { fetchApprovalsData } from "./api"
import { FileCheck } from "lucide-react"

import ApprovalHeader from "@/components/approvals/ApprovalHeader"
import ApprovalTable from "@/components/approvals/ApprovalTable"
import SummaryCard from "@/components/ui/SummaryCard" 
import Loading from "./loading"

const APPROVAL_FILTERS = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "Resolved", label: "Resolved / Approved" },
      { value: "Pending", label: "Pending" },
      { value: "Rejected", label: "Rejected" },
    ],
  },
]

export default function ApprovalsPage() {
  const [data, setData] = useState({ summary: null, stats: [], tableData: [] })
  const [isLoading, setIsLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilters, setActiveFilters] = useState({})
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const getData = async () => {
      try {
        const result = await fetchApprovalsData()
        setData(result)
      } catch (error) {
        console.error("Failed to fetch approvals:", error)
      } finally {
        setIsLoading(false)
      }
    }
    getData()
  }, [])

  const filteredData = useMemo(() => {
    if (!data.tableData) return [];

    return data.tableData.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.reqId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.project?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        !activeFilters.status ||
        activeFilters.status.length === 0 ||
        activeFilters.status.includes(item.status);

      return matchesSearch && matchesStatus;
    });
  }, [data.tableData, searchQuery, activeFilters]);

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="w-full mx-auto py-8 px-4 sm:px-8 flex flex-col gap-6 bg-white dark:bg-[#121212] min-h-screen transition-colors duration-300">
      
      <ApprovalHeader 
        title="Approval" 
        badgeCount={filteredData.length} 
        description={<>Lorem ipsum dolor sit amet,<br />consectetur adipiscing elit,</>} 
        actionText="New proposal"
        ActionIcon={FileCheck}
        filters={APPROVAL_FILTERS}
        onSearch={(val) => setSearchQuery(val)}
        onFilter={(filters) => setActiveFilters(filters)}
        onAction={() => setIsModalOpen(true)} 
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {data.stats.map((stat, index) => (
          <SummaryCard key={stat.id} item={stat} index={index} />
        ))}
      </div>
      
      <ApprovalTable data={filteredData} />

    </div>
  )
}