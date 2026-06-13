"use client"

import { Loader2 } from "lucide-react"
import VendorOverview from "./VendorOverview"
import VendorHistory from "./VendorHistory"
import VendorPayments from "./VendorPayments"
import VendorBills from "./VendorBills"

const TABS = ["Overview", "History", "Payments", "Bills"]

export default function VendorDetails({
  vendor,
  activeTab,
  setActiveTab,
  isLoading = false,
}) {
  return (
    <div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#27272a]
      rounded-[40px] p-6 md:p-10 shadow-sm h-[calc(100vh-160px)] min-h-175 flex flex-col
      transition-all overflow-hidden">

      <div className="flex justify-between items-start mb-8 shrink-0">
        <div>
          <h2 className="text-[24px] font-sfpro-bold text-gray-900 dark:text-white tracking-tight">
            All Details
          </h2>
          <p className="text-[13px] text-gray-400 mt-1 leading-snug">
            {vendor
              ? `Viewing details for ${vendor.name}`
              : "Select a vendor to view details"}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-8 shrink-0 bg-[#f7f7f8] dark:bg-[#1a1a1d]
        p-1.5 rounded-2xl w-full md:w-fit max-w-full overflow-x-auto 
        [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap shrink-0 px-5 md:px-7 py-2.5 rounded-xl text-[14px] font-sfpro-bold transition-all ${
              activeTab === tab
                ? "bg-[#1c1c1c] text-white dark:bg-white dark:text-black shadow-md"
                : "bg-white dark:bg-black text-gray-500 dark:text-gray-400 \
                   hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {isLoading && (
          <div className="flex items-center justify-center h-full gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-sfpro">Loading vendor details...</span>
          </div>
        )}

        {!isLoading && !vendor && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-[15px] font-sfpro-medium text-gray-400 dark:text-[#71717a]">
              No vendor selected
            </p>
            <p className="text-[13px] text-gray-300 dark:text-[#52525b] mt-1">
              Select a vendor from the list to view their details
            </p>
          </div>
        )}

        {!isLoading && vendor && (
          <>
            {activeTab === "Overview"  && <VendorOverview vendor={vendor} />}
            {activeTab === "History"   && <VendorHistory vendorId={vendor.id} />}
            {activeTab === "Payments"  && <VendorPayments vendorId={vendor.id} />}
            {activeTab === "Bills"     && <VendorBills vendorId={vendor.id} />}
          </>
        )}
      </div>
    </div>
  )
}