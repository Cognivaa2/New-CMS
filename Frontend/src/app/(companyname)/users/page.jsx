"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { UserPlus, HardHat, PackageOpen, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { fetchAllUsers, normaliseUser, debounce, deleteUser } from "./api"

import PageHeader from "@/components/users/PageHeader"
import CategoryCard from "@/components/users/CategoryCard"
import UserTable from "@/components/users/UserTable"
import AddUserModal from "@/components/users/AddUserModal"
import EditUserModal from "@/components/users/EditUserModal"

const USER_FILTERS = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "Active", label: "Active" },
      { value: "Inactive", label: "Inactive" },
    ],
  },
]

const PAGE_LIMIT = 15

export default function UserPage() {
  const [activeTab, setActiveTab] = useState("Users")
  const [tableData, setTableData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilters, setActiveFilters] = useState({})

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGE_LIMIT,
    totalPages: 0,
    hasNext: false,
  })

  const scrollSentinelRef = useRef(null)
  const observerRef = useRef(null)
  const isLoadingMoreRef = useRef(false)
  const paginationRef = useRef(pagination)
  paginationRef.current = pagination

  const searchRef = useRef(searchQuery)
  searchRef.current = searchQuery

  const filtersRef = useRef(activeFilters)
  filtersRef.current = activeFilters

  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab

  const loadUsers = useCallback(async (search = "", filters = {}, page = 1) => {
    if (page === 1) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
      isLoadingMoreRef.current = true
    }

    setError(null)

    try {
      const { users, pagination: pag } = await fetchAllUsers({
        search,
        status: filters.status ?? "",
        page,
        limit: PAGE_LIMIT,
      })

      const normalised = users.map(normaliseUser)

      if (page === 1) {
        setTableData(normalised)
      } else {
        setTableData((prev) => {
          const existingIds = new Set(prev.map((u) => u.id))
          const newUsers = normalised.filter((u) => !existingIds.has(u.id))
          return [...prev, ...newUsers]
        })
      }

      setPagination({
        total: pag?.total ?? 0,
        page: pag?.page ?? page,
        limit: pag?.limit ?? PAGE_LIMIT,
        totalPages: pag?.totalPages ?? 0,
        hasNext: pag?.hasNext ?? (pag?.page < pag?.totalPages),
      })
    } catch (err) {
      setError(err.message)
      if (page === 1) {
        setTableData([])
        setPagination({ total: 0, page: 1, limit: PAGE_LIMIT, totalPages: 0, hasNext: false })
      }
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
      isLoadingMoreRef.current = false
    }
  }, [])

  const loadMore = useCallback(() => {
    if (isLoadingMoreRef.current) return
    const { page, totalPages, hasNext } = paginationRef.current
    if (!hasNext && page >= totalPages) return

    loadUsers(
      searchRef.current,
      filtersRef.current,
      page + 1
    )
  }, [loadUsers])

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }

    const sentinel = scrollSentinelRef.current
    if (!sentinel) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          loadMore()
        }
      },
      {
        root: null,
        rootMargin: "200px",
        threshold: 0,
      }
    )

    observerRef.current.observe(sentinel)

    return () => {
      observerRef.current?.disconnect()
      observerRef.current = null
    }
  }, [loadMore, tableData])
  const debouncedLoad = useRef(
    debounce((search, filters) => loadUsers(search, filters, 1), 400)
  ).current

  useEffect(() => {
    if (activeTab === "Users") {
      loadUsers(searchQuery, activeFilters, 1)
    } else {
      setTableData([])
      setPagination({ total: 0, page: 1, limit: PAGE_LIMIT, totalPages: 0, hasNext: false })
      setIsLoading(false)
    }
  }, [activeTab])

  const handleFilter = (selectedFilters) => {
    const newFilters = { ...selectedFilters }

    if (Array.isArray(newFilters.status) && newFilters.status.length > 0) {
      newFilters.status = newFilters.status[newFilters.status.length - 1]
    } else {
      newFilters.status = ""
    }

    setActiveFilters(newFilters)
    if (activeTab === "Users") loadUsers(searchQuery, newFilters, 1)
  }

  const handleSearch = (query) => {
    setSearchQuery(query)
    if (activeTab === "Users") debouncedLoad(query, activeFilters)
  }

  const handleUserAdded = () => loadUsers(searchQuery, activeFilters, 1)
  const handleUserEdited = () => loadUsers(searchQuery, activeFilters, 1)
  const handleUserStatusChanged = () => loadUsers(searchQuery, activeFilters, 1)
  const handleUserDeleted = () => loadUsers(searchQuery, activeFilters, 1)


  const headerDetails = {
    Users: { icon: UserPlus, btnText: "Add User" },
    Contractors: { icon: HardHat, btnText: "Add Contractor" },
    Suppliers: { icon: PackageOpen, btnText: "Add Supplier" },
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#121212] rounded-lg p-4 ">

      {/* <div className="flex flex-wrap gap-6 mb-16">
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            title={cat.id}
            description={cat.desc}
            isActive={activeTab === cat.id}
            onClick={() => {
              setActiveTab(cat.id)
              setSearchQuery("")
              setActiveFilters({})
            }}
          />
        ))}
      </div> */}

      <PageHeader
        title={activeTab}
        badgeCount={activeTab === "Users" ? pagination.total : undefined}
        description="Here, you can add, edit, update, delete, and activate/deactivate users."
        actionText={headerDetails[activeTab].btnText}
        ActionIcon={headerDetails[activeTab].icon}
        onAction={() => setIsAddOpen(true)}
        filters={activeTab === "Users" ? USER_FILTERS : []}
        onFilter={handleFilter}
        onSearch={handleSearch}
        isRefreshing={isLoadingMore}
      />

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400 font-sfpro">{error}</p>
      )}

      <UserTable
        data={tableData}
        isLoading={isLoading}
        onEdit={(user) => setEditUser(user)}
        onRefresh={handleUserStatusChanged}
        onDelete={handleUserDeleted}
      />

      <div
        ref={scrollSentinelRef}
        className="w-full h-1"
        aria-hidden="true"
      />
      {isLoadingMore && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-[#71717a]" />
          <span className="text-sm text-gray-400 dark:text-[#71717a] font-sfpro">
            Loading more...
          </span>
        </div>
      )}

      {/* End of list message */}
      {!isLoading &&
        !isLoadingMore &&
        tableData.length > 0 &&
        !pagination.hasNext &&
        pagination.page >= pagination.totalPages && (
          <div className="flex items-center justify-center py-4">
            <span className="text-xs text-gray-400 dark:text-[#52525b] font-sfpro">
              Showing all {pagination.total} results
            </span>
          </div>
        )}

      <AddUserModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        activeTab={activeTab}
        onSuccess={handleUserAdded}
      />

      <EditUserModal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        user={editUser}
        onSuccess={handleUserEdited}
      />
    </div>
  )
}