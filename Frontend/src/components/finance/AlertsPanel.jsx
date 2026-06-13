"use client"
import { AlertTriangle } from "lucide-react";

export default function AlertsPanel({ alerts = {} }) {
  const { title = "Alerts", description = "Lorem ipsum dolor sit amet, consectetur", items = [] } = alerts;

  return (
    <div className="border border-zinc-100 dark:border-zinc-800 rounded-[3rem] p-10 h-full shadow-sm flex flex-col">
      <div className="mb-8 shrink-0">
        <h2 className="text-[28px] font-sfpro-bold text-zinc-900 dark:text-white leading-none tracking-tight">
          {title}
        </h2>
        <p className="text-[15px] text-zinc-400 dark:text-zinc-500 mt-2 max-w-60 leading-snug">
          {description}
        </p>
      </div>
      <div className="space-y-6 overflow-y-auto pr-2 grow max-h-70">
        {items.map((alert, idx) => (
          <div key={idx} className="flex items-center gap-5 group">
            <div className="w-9 h-9 rounded-full bg-[#F4F4F5] dark:bg-zinc-900 flex items-center justify-center shrink-0">
             
              <AlertTriangle 
                className="w-5 h-5 text-white fill-black dark:text-zinc-900 dark:fill-white" 
                strokeWidth={2}
              />
            </div>

            <p className="text-[16px] font-sfpro-medium text-zinc-800 dark:text-zinc-200 tracking-tight leading-tight">
              {alert}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}