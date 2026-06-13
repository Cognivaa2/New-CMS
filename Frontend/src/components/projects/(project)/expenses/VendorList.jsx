"use client"

import { useState } from "react"

function getInitials(name) {
  if (!name) return "?"
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

function VendorAvatar({ name, img }) {
  const [imgError, setImgError] = useState(false)
  const hasImg = img && !imgError

  if (hasImg) {
    return (
      <img
        src={img}
        alt={name || "Vendor"}
        onError={() => setImgError(true)}
        className="w-10 h-10 rounded-full object-cover shrink-0"
      />
    )
  }

  return (
    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#3f3f46] flex items-center justify-center shrink-0 text-[12px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa]">
      {getInitials(name)}
    </div>
  )
}

export default function VendorList({ vendors }) {
  return (
    <div className="flex flex-col w-full font-sfpro">
      <h3 className="text-[20px] font-sfpro-bold text-[#1e1e1e] dark:text-white leading-tight">
        Top Vendors
      </h3>
      <p className="text-[12px] text-[#a1a1aa] mt-1 mb-8">Lorem ipsum dolor sit amet, consectetur</p>

      <div className="space-y-6">
        {vendors.map((v, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <VendorAvatar name={v.name} img={v.img} />
              <div className="flex flex-col">
                <span className="text-[13px] font-sfpro-bold text-[#1e1e1e] dark:text-white leading-none">
                  {v.name}
                </span>
                {v.email ? (
                  <span className="text-[11px] text-[#a1a1aa] mt-1">{v.email}</span>
                ) : (
                  <span className="text-[11px] italic text-[#a1a1aa] dark:text-[#71717a] mt-1">
                    Not Provided
                  </span>
                )}
              </div>
            </div>
            <span className="text-[12px] font-sfpro-bold text-[#1e1e1e] dark:text-white">
              {v.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}