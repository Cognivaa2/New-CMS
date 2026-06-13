"use client"
import CashFlowTrend from "./CashFlowTrend"
import ExpenseDistribution from "./ExpenseDistribution"
import AlertsPanel from "./AlertsPanel"

export default function AnalyticsRow({ cashFlow, expenses, alerts }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sfpro">
      <div className="lg:col-span-5 flex flex-col">
        <div className="mb-6 shrink-0">
          <h3 className="text-[22px] font-sfpro-bold text-zinc-900 dark:text-white tracking-tight">
            Cash Flow Trend
          </h3>
          <p className="text-[14px] text-zinc-400 mt-1 leading-snug max-w-50">
            Track company-wide outgoing payments and spending patterns.
          </p>
        </div>
        <div className="h-72 w-full">
          <CashFlowTrend data={cashFlow} />
        </div>
      </div>

      <div className="lg:col-span-3 flex flex-col">
        <div className="mb-6 shrink-0">
          <h3 className="text-[22px] font-sfpro-bold text-zinc-900 dark:text-white tracking-tight">
            Expense Distribution
          </h3>
          <p className="text-[14px] text-zinc-400 mt-1 leading-snug">
            Analyze category-wise and mode-wise distribution.
          </p>
        </div>
        <div className="w-full">
          <ExpenseDistribution data={expenses} />
        </div>
      </div>

      <div className="lg:col-span-4">
        <AlertsPanel alerts={alerts} />
      </div>
    </div>
  )
}