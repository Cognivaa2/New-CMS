"use client";
import { useEffect, useMemo, useState } from "react"; // ✅ add useMemo
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  getCompanyId,
  fetchCompany,
  updateCompany,
  toProfileData,
  toInfoData,
  toStatsAndLegalData,
  toEditFormState,
  getFallbackCompany,
} from "./api";

import OrganizationLoading from "./loading";
import ProfileHeader from "@/components/organization/ProfileHeader";
import InformationCard from "@/components/organization/InformationCard";
import StatsAndLegal from "@/components/organization/StatsAndLegal";
import EditOrganizationDrawer from "@/components/organization/EditOrganizationModal";
import Tooltip from "@/components/ui/Tooltip";

export default function OrganizationPage() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const editFormData = useMemo(
    () => (company ? toEditFormState(company) : null),
    [company]
  );

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    const companyId = getCompanyId();

    if (!companyId) {
      toast.error("Company Not Found", {
        description: "No company ID found. Please log in again.",
      });
      setCompany(getFallbackCompany());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetchCompany(companyId);
      setCompany(res.data);
    } catch (err) {
      toast.error("Failed to load company", { description: err.message });
      setCompany(getFallbackCompany());
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formState) => {
    const companyId = getCompanyId();
    if (!companyId) {
      toast.error("Cannot Save", {
        description: "No company ID found. Please log in again.",
      });
      return;
    }

    try {
      setSaving(true);
      const res = await updateCompany(companyId, formState);

      toast.success(res.title || "Company Updated", {
        description:
          res.description ||
          "Company information has been successfully updated.",
      });

      setDrawerOpen(false);

      loadCompany().catch((err) => {
        toast.error("Reload Failed", { description: err.message });
      });
    } catch (err) {
      toast.error("Update Failed", {
        description: err.message || "Failed to update company details.",
      });
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <OrganizationLoading />;
  }

  if (!company) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center gap-4 bg-white dark:bg-[#121212]">
        <p className="text-gray-500 dark:text-[#71717a] font-sfpro">
          No company data found.
        </p>
        <button
          onClick={loadCompany}
          className="cursor-pointer font-sfpro-bold flex items-center gap-2 bg-[#2a2a2a] dark:bg-white hover:bg-black dark:hover:bg-gray-200 text-white dark:text-black px-4 py-2 rounded-lg text-[16px] transition-colors duration-300"
        >
          Retry
        </button>
      </div>
    );
  }
  const profileData = toProfileData(company);
  const infoData = toInfoData(company);
  const { stats, legal } = toStatsAndLegalData(company);

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#121212] rounded-lg p-4">
      <div className="flex justify-between items-center w-full mb-4">
        <h1 className="text-[40px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none font-sfpro">
          Organization
        </h1>
        <Tooltip content="Edit Your Company Profile" side="left">
          <button
            onClick={() => setDrawerOpen(true)}
            className="font-sfpro-bold cursor-pointer flex items-center gap-2 bg-[#2a2a2a] dark:bg-white hover:bg-black dark:hover:bg-gray-200 text-white dark:text-black px-4 py-2 rounded-lg text-[16px] transition-colors duration-300"
          >
            <Pencil className="w-5 h-5" />
            Edit
          </button>
        </Tooltip>
      </div>

      <ProfileHeader data={profileData} />

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-12 ">
        <InformationCard data={infoData} />
        <StatsAndLegal stats={stats} legal={legal} />
      </div>

      <EditOrganizationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialData={editFormData}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}