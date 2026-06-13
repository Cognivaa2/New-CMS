export default function StatsAndLegal({ stats, legal }) {
  return (
    <div className="flex flex-col justify-between h-full pt-4 pb-2 font-sfpro">

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
        {stats.map((stat, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            <span className="text-[44px] leading-none font-sfpro-medium text-gray-900 dark:text-[#f4f4f5] transition-colors">
              {stat.value}
            </span>
            <span className="text-[13px] text-gray-600 dark:text-[#a1a1aa] font-sfpro-medium transition-colors">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-sfpro-medium text-gray-900 dark:text-[#f4f4f5] mb-4 transition-colors">
          Legal Information
        </h3>
        <div className="flex flex-wrap gap-3">
          {legal.map((item, idx) => (
            <span
              key={idx}
              className="bg-[#f0f3fa] dark:bg-[#18181b] border border-transparent dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] text-xs font-sfpro-bold px-4 py-2 rounded-full transition-colors"
            >
              <span className="text-gray-400 dark:text-[#71717a]">
                #{item.label}:&nbsp;
              </span>
              {item.value}
            </span>
          ))}
        </div>
      </div>

    </div>
  );
}