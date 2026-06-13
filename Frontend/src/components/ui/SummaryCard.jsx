export default function SummaryCard({ item }) {
  return (
    <div className={`p-6 rounded-2xl transition-all duration-300 font-sfpro flex flex-col justify-center min-h-30 ${item.colorClass}`}>
      <h2 className="text-[34px] font-sfpro-bold leading-none mb-2 text-gray-800 dark:text-gray-100">
        {item.value}
      </h2>
      <p className="text-[16px] font-sfpro-bold text-gray-800/80 dark:text-gray-200">
        {item.title}
      </p>
      <p className="text-[12px] text-gray-400 dark:text-gray-400 mt-1">
        {item.subtitle}
      </p>
    </div>
  )
}