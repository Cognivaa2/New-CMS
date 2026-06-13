"use client";

export default function ProjectHeader({ activeTab, setActiveTab }) {
  // const tabs = ["Overview", "Execution", "Insights"];

  return (
    <div className="flex flex-col md:flex-row justify-between items-start mb-8 w-full">
      <div>
        <h1 className="text-4xl font-sfpro-bold text-gray-400 dark:text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1 max-w-sm">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit,
        </p>
      </div>

      {/* <div className="flex bg-white dark:bg-neutral-900 p-1 rounded-xl border border-gray-100 dark:border-neutral-800 mt-4 md:mt-0 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-lg text-sm font-sfpro-medium transition-all ${
              activeTab === tab
                ? "bg-[#1e1e1e] text-white dark:bg-white dark:text-black shadow-md"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div> */}
    </div>
  );
}