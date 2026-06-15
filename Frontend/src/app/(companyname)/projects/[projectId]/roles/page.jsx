// src/app/users-and-roles/page.jsx
"use client"

import { useState, useEffect } from "react"
import { fetchUsersData } from "./api"

import UserHeader from "@/components/projects/(project)/roles/UserHeader"
import UserTable from "@/components/projects/(project)/roles/UserTable"
import AddUserModal from "@/components/projects/(project)/roles/AddUserModal" 

import Loading from "./loading"

export default function RolesPage() {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false) 

  useEffect(() => {
    const getData = async () => {
      try {
        const result = await fetchUsersData()
        setData(result)
      } catch (error) {
        console.error("Failed to fetch users:", error)
      } finally {
        setIsLoading(false)
      }
    }
    getData()
  }, [])

  const userFilters = [
    {
      key: "status",
      options: [
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" }
      ]
    },
    {
      key: "role",
      options: [
        { value: "Project Manager", label: "Project Manager" },
        { value: "Site Engineer", label: "Site Engineer" },
        { value: "Supervisor", label: "Supervisor" },
      ]
    }
  ]

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="w-full mx-auto py-8 px-4 sm:px-6 flex flex-col gap-2 bg-[#FAFAFA] dark:bg-[#121212] rounded-lg min-h-screen transition-colors duration-300 relative">
      
      <UserHeader 
        title="Users & Roles"
        description="Lorem ipsum dolor sit amet, consectetur adipiscing elit,"
        filters={userFilters}
        onFilter={(val) => console.log("Filter applied:", val)}
        onSearch={(val) => console.log("Searching:", val)}
        onAddUser={() => setIsModalOpen(true)} 
      />

      <UserTable data={data} />
      <AddUserModal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        activeTab="Users" 
      />

    </div>
  )
}