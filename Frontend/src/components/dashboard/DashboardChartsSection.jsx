import ProjectCompletionChart from "./ProjectCompletionChart"
import InventoryBreakdownChart from "./InventoryBreakdownChart"
import ExpenseFlowChart from "./ExpenseFlowChart"
import TasksFlowChart from "./TasksFlowChart"
import ChartSkeleton from "./ChartSkeleton"

export default function DashboardChartsSection({
  projectChartData,
  projectChartLoading,
  inventoryChartData,
  inventoryChartLoading,
  expenseChartData,
  expenseChartLoading,
  tasksFlowData,
  tasksFlowLoading,
  onTasksDaysChange,
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm transition-all hover:shadow-md">
          {projectChartLoading ? (
            <ChartSkeleton variant="bar" />
          ) : (
            <ProjectCompletionChart
              title="Project Completion"
              description="Completion percentage across all active projects."
              data={projectChartData}
            />
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm transition-all hover:shadow-md">
          {inventoryChartLoading ? (
            <ChartSkeleton variant="donut" />
          ) : (
            <InventoryBreakdownChart
              title="Inventory Breakdown"
              description="Current stock status distribution across all inventory items."
              data={inventoryChartData}
            />
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm transition-all hover:shadow-md">
          {expenseChartLoading ? (
            <ChartSkeleton variant="horizontal" />
          ) : (
            <ExpenseFlowChart
              title="Expense Flow"
              description="Budget utilization percentage per project across all sites."
              data={expenseChartData}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm transition-all hover:shadow-md">
          {tasksFlowLoading ? (
            <ChartSkeleton variant="bar" />
          ) : (
            <TasksFlowChart
              title="Tasks Flow"
              description="Daily task creation and completion trends across all projects."
              data={tasksFlowData}
              onDaysChange={onTasksDaysChange}
            />
          )}
        </div>
      </div>
    </div>
  )
}