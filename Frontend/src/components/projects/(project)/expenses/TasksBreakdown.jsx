"use client";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function TasksBreakdown({ title, description, data }) {
  return (
    <div className="flex flex-col w-full font-sfpro">
      <h3 className="text-[20px] font-sfpro-bold text-[#1e1e1e] dark:text-white leading-tight">
        {title}
      </h3>
      <p className="text-[12px] text-[#a1a1aa] mt-1 mb-6">{description}</p>
      
      <div className="flex flex-col items-start">
        <div className="w-full h-48 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={data} 
                innerRadius={60} 
                outerRadius={90} 
                paddingAngle={0} 
                dataKey="value"
                stroke="none"
                startAngle={90}
                endAngle={450}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full space-y-2.5">
          {data.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: item.color }} 
                />
                <span className="font-sfpro-medium text-[#3f3f46] dark:text-gray-300">
                  {item.name}
                </span>
              </div>
              <span className="text-[#a1a1aa] font-sfpro">
                {item.value.toLocaleString()} Rs.
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}