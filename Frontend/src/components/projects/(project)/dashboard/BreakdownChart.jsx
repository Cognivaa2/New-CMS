"use client";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function BreakdownChart({ title, description, data }) {
  return (
    <div className="w-full">
      <h3 className="text-xl font-sfpro-bold text-[#1e1e1e] dark:text-white">{title}</h3>
      <p className="text-xs text-gray-400 mt-1 mb-4">{description}</p>
      
      <div className="flex flex-col md:flex-row items-center justify-between h-72 relative">
        <div className="w-full md:w-1/2 h-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={data} 
                innerRadius={70} 
                outerRadius={110} 
                paddingAngle={5} 
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="w-full md:w-1/2 space-y-4 pl-4">
          {data.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-sfpro-medium text-gray-700 dark:text-gray-300">
                  {item.name}
                </span>
              </div>
              <span className="text-gray-400 font-sfpro">
                {item.value} Tasks
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}