"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function BarChartSection({ title, description, data, xAxisKey = "name", dataKey = "value", children }) {
  return (
    <div className="w-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-sfpro-bold text-[#1e1e1e] dark:text-white">{title}</h3>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </div>
        {children}
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey={xAxisKey}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar
              dataKey={dataKey}
              fill="#8b5cf6"
              radius={[10, 10, 10, 10]}
              barSize={12}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}