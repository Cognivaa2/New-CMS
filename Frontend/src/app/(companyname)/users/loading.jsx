// src/app/user/loading.jsx

export default function UserLoading() {
  return (
    <div className="max-w-7xl mx-auto p-8 font-sans bg-white min-h-screen animate-pulse">
      
      <div className="flex flex-wrap gap-6 mb-16">
        {[1, 2, 3].map((card) => (
          <div key={card} className="border border-gray-100 rounded-4xl p-6 w-70 h-40 flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="w-12 h-12 bg-gray-100 rounded-full"></div>
              <div className="w-5 h-5 bg-gray-100 rounded-full"></div>
            </div>
            <div>
              <div className="w-24 h-5 bg-gray-200 rounded-md mb-2"></div>
              <div className="w-full h-3 bg-gray-100 rounded-md mb-1"></div>
              <div className="w-3/4 h-3 bg-gray-100 rounded-md"></div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 w-full mb-8">
        <div>
          <div className="w-48 h-14 bg-gray-200 rounded-md mb-4"></div>
          <div className="w-64 h-4 bg-gray-100 rounded-md"></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-60 h-10 bg-gray-100 rounded-xl"></div>
          <div className="w-10 h-10 bg-gray-100 rounded-xl"></div>
          <div className="w-28 h-10 bg-gray-200 rounded-xl"></div>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="w-full h-14 bg-[#f4f5f8] rounded-2xl mb-4"></div>
        
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="w-full h-16 border-b border-gray-50 flex items-center px-6 gap-10">
             <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0"></div>
             <div className="w-32 h-3 bg-gray-100 rounded-md"></div>
             <div className="w-48 h-3 bg-gray-100 rounded-md"></div>
             <div className="w-24 h-3 bg-gray-100 rounded-md"></div>
          </div>
        ))}
      </div>

    </div>
  )
}