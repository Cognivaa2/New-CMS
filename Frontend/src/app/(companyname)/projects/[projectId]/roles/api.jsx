// src/app/users-and-roles/api.jsx

export const fetchUsersData = async () => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return [
    {
      id: 1,
      name: "Ayan Chakraborty",
      role: "Project Manager",
      avatar: "https://i.pravatar.cc/150?img=68",
      email: "ayanchakraborty2004@gmail.com",
      assignedRole: "Project Manager",
      status: "Active",
      lastLogin: "25 Jan 2026",
      tasks: 26,
      hasActionAccess: true
    },
    {
      id: 2,
      name: "Sundar Chakraborty",
      role: "Site Engineer",
      avatar: "https://i.pravatar.cc/150?img=33",
      email: "sundar2022@gmail.com",
      assignedRole: "Site Engineer",
      status: "Active",
      lastLogin: "25 Jan 2026",
      tasks: 26,
      hasActionAccess: true
    },
    {
      id: 3,
      name: "Souvik Pata",
      role: "Supervisor",
      avatar: "https://i.pravatar.cc/150?img=47",
      email: "patra2026@gmail.com",
      assignedRole: "Project Manager",
      status: "Inactive",
      lastLogin: "25 Jan 2026",
      tasks: 26,
      hasActionAccess: false
    },
    {
      id: 4,
      name: "Santam Pal",
      role: "Electric Engineer",
      avatar: "https://i.pravatar.cc/150?img=12",
      email: "ayanchakraborty2004@gmail.com", // Keeping email from image though it looks like a typo in original design
      assignedRole: "Electric Engineer",
      status: "Active",
      lastLogin: "25 Jan 2026",
      tasks: 26,
      hasActionAccess: true
    },
    {
      id: 5,
      name: "Sundarlal Biswas",
      role: "Manager",
      avatar: "https://i.pravatar.cc/150?img=32",
      email: "biswas2002sundar@gmail.com",
      assignedRole: "Manager",
      status: "Inactive",
      lastLogin: "25 Jan 2026",
      tasks: 26,
      hasActionAccess: false
    },
    {
      id: 6,
      name: "Virat Das",
      role: "Quantity Surveyor",
      avatar: "https://i.pravatar.cc/150?img=11",
      email: "das4321@gmail.com",
      assignedRole: "Quantity Surveyor",
      status: "Active",
      lastLogin: "25 Jan 2026",
      tasks: 26,
      hasActionAccess: true
    },
    {
      id: 7,
      name: "Bimal Chakraborty",
      role: "Assistant Manager",
      avatar: "https://i.pravatar.cc/150?img=65",
      email: "bimal2020c@gmail.com",
      assignedRole: "Assistant Manager",
      status: "Active",
      lastLogin: "25 Jan 2026",
      tasks: 26,
      hasActionAccess: true
    },
    {
      id: 8,
      name: "Ram saha",
      role: "Assistant Engineer",
      avatar: "https://i.pravatar.cc/150?img=59",
      email: "saha2023ram@gmail.com",
      assignedRole: "Assistant Engineer",
      status: "Active",
      lastLogin: "25 Jan 2026",
      tasks: 26,
      hasActionAccess: true
    }
  ];
};