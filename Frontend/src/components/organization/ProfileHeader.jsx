export default function ProfileHeader({ data }) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full pb-8 font-sfpro">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="w-35 h-35 rounded-full overflow-hidden shrink-0 border border-transparent dark:border-[#27272a] flex items-center justify-center">
          {data.avatarUrl ? (
            <img 
              src={data.avatarUrl} 
              alt="Profile Avatar" 
              className="w-full h-full object-cover "
              onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "flex" }}
            />
          ) : null}
          <div 
            className="w-full h-full items-center justify-center bg-[#d4d4d4] text-[#212121] dark:bg-[#424242] dark:text-white font-bold text-5xl"
            style={{ display: data.avatarUrl ? "none" : "flex" }}
          >
            {data.name?.charAt(0)?.toUpperCase()}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-[46px] font-sfpro-bold text-gray-900 dark:text-[#f4f4f5] transition-colors">
            {data.name || <NotProvided />}
          </h1>
          <p className="text-[20px] text-gray-600 dark:text-[#a1a1aa] mb-1 font-sfpro transition-colors">
            {data.fullName || <NotProvided />}
          </p>          
          <div className="flex gap-2 mb-2">
            {data.tags && data.tags.length > 0 ? (
              data.tags.map((tag, idx) => (
                <span key={idx} className="bg-[#eef4ff] dark:bg-[#27272a] text-gray-700 dark:text-[#d4d4d8] text-xs font-sfpro-medium px-4 py-1.5 rounded-full transition-colors">
                  {tag}
                </span>
              ))
            ) : (
              <NotProvided />
            )}
          </div>
          <p className="text-xs text-gray-800 dark:text-[#a1a1aa] font-sfpro-medium transition-colors">
            {data.year || <NotProvided />} <span className="mx-1 text-gray-400 dark:text-[#3f3f46]">•</span> {data.gstn || <NotProvided />}
          </p>
        </div>
      </div>
      {/* <div className="hidden md:flex flex-col items-center mt-4 md:mt-0">
        <span className="bg-[#e3efff] dark:bg-[#1e3a8a]/30 text-[#3b82f6] dark:text-[#60a5fa] text-sm font-sfpro-bold px-6 py-2 rounded-full mb-3 transition-colors">
          {data.currentPlan || <NotProvided />}
        </span>
        <div className="w-24 h-1 bg-gray-200 dark:bg-[#27272a] flex rounded-full overflow-hidden">
          <div className="w-[70%] h-full bg-gray-800 dark:bg-[#f4f4f5] transition-colors"></div>
        </div>
      </div> */}
      
    </div>
  )
}
const NotProvided = () => (
  <span className="text-sm font-sfpro italic text-[#c2c2c2] dark:text-[#3f3f46] transition-colors">Not provided</span>
)