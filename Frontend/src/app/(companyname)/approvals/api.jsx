export const fetchApprovalsData = async () => {
  await new Promise(resolve => setTimeout(resolve, 800));

  const summary = {
    pending: 18,
    approvedToday: 7,
    rejected: 3,
    total: 84
  };
  
  const stats = [
    { 
      id: 1,
      title: "Pending Approvals", 
      value: summary.pending, 
      subtitle: "Requires your action",
      colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]" 
    },
    { 
      id: 2,
      title: "Approved Today", 
      value: summary.approvedToday, 
      subtitle: "Requests approved today",
      colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]" 
    },
    { 
      id: 3,
      title: "Rejected", 
      value: summary.rejected, 
      subtitle: "Rejected in last 24h",
      colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]" 
    },
    { 
      id: 4,
      title: "Total Requests", 
      value: summary.total, 
      subtitle: "Across all modules",
      colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]" 
    },
  ];

  const rowTemplate = {
    reqId: "#APR-1049",
    title: "Approval for Extra expense",
    project: "Newtown Construction",
    createdBy: { name: "Ram saha", role: "Assistant Engineer", avatar: "https://i.pravatar.cc/150?img=59" },
    createdAt: "12:12AM, 06 Feb 2026",
    priority: "High",
    status: "Resolved"
  };

  const tableData = Array.from({ length: 6 }).map((_, i) => ({
    id: i + 1,
    ...rowTemplate,
    status: i === 2 ? "Pending" : i === 4 ? "Rejected" : "Resolved" 
  }));

  return { summary, stats, tableData };
};