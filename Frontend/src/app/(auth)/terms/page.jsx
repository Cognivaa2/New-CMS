// app/(auth)/terms/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function TermsPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const sections = [
        {
            id: "01",
            title: "Introduction & Scope of Service",
            content: "Welcome to our Construction Management System (CMS), a multi-tenant cloud-based platform designed to streamline construction project execution, resource planning, financial oversight, and team collaboration. By accessing or using our platform, you acknowledge that you have read, understood, and agree to comply with the terms outlined in this document. These Terms and Conditions govern the relationship between the platform operator and all authorized users, including corporate administrators, project managers, site engineers, accountants, contractors, and any other personnel granted access to the system.",
        },
        {
            id: "02",
            title: "Account Registration & Company Onboarding",
            content: "To utilize our services, an authorized representative of a company must register a tenant workspace by providing accurate company information, including a valid registered company name, official email address, legal registration details, tax profiles, and regional localization parameters. The registering party warrants that they have the legal authority to bind the organization to these terms. Each company tenant is provided with an isolated operational environment, and you are responsible for ensuring that all submitted information remains accurate, current, and complete throughout the duration of platform use.",
        },
        {
            id: "03",
            title: "User Access & Role-Based Permissions",
            content: "Our platform implements a Role-Based Access Control (RBAC) framework that allows authorized administrators to define granular permission profiles for their team members. Administrators may create custom role archetypes such as Project Manager, Accountant, or Site Engineer, and assign company-level or project-specific access vectors. You agree that all permission assignments and modifications conducted within your tenant workspace are the sole responsibility of your authorized administrators, and the platform operator shall not be liable for internal access decisions made within your organization.",
        },
        {
            id: "04",
            title: "User Responsibilities & Account Security",
            content: "Each user is responsible for maintaining the confidentiality of their login credentials and for all activities performed under their account. You agree to notify your organization administrator and the platform support team immediately upon discovering any unauthorized access or suspicious activity related to your account. You shall not share access credentials, transfer your account to another individual, or attempt to circumvent the role-based permission boundaries established by your organization administrators. All actions logged within the system are attributed to the authenticated user account performing them.",
        },
        {
            id: "05",
            title: "Project Workspace & Data Ownership",
            content: "All project data, including site information, work breakdown structures, daily progress reports, inventory records, financial transactions, contractor agreements, and uploaded documents, remain the exclusive property of the registered company tenant. The platform operator acts solely as a service provider and data processor, maintaining secure infrastructure and providing functional tools for managing your construction operations. You retain full ownership and control over your operational data and may export or remove it in accordance with the data management provisions of these terms.",
        },
        {
            id: "06",
            title: "Material Master List & Catalog Management",
            content: "The platform provides a centralized Material Master List that serves as the standardized catalog for all materials used across your project sites. You agree to maintain accurate material definitions, including standardized naming conventions and units of measurement. The platform operator is not responsible for inventory discrepancies arising from inaccurate catalog entries, incorrect unit assignments, or misclassification of materials. Your procurement managers are solely responsible for ensuring catalog integrity and consistent material standardization across all project locations.",
        },
        {
            id: "07",
            title: "Procurement Workflow & Financial Transactions",
            content: "Our platform facilitates procurement workflows including Material Requisitions, Purchase Orders, Goods Receipt Notes, Work Orders, and Payables management. While the system automates ledger updates, status transitions, and three-way match compliance checks, you acknowledge that all financial decisions, vendor selections, payment authorizations, and contractual commitments remain the sole responsibility of your authorized personnel. The platform serves as a record-keeping and workflow management tool and does not constitute financial, legal, or procurement advice.",
        },
        {
            id: "08",
            title: "Vendor & Contractor Relationships",
            content: "The Centralized Vendor Space and Work Orders modules allow your organization to manage external supplier and contractor relationships. You agree that all contractual obligations, payment commitments, performance disputes, and legal matters arising between your company and any third-party vendor or contractor are independent of the platform operator. Our system provides tools to track these relationships but does not establish any direct contractual relationship between the platform operator and your vendors or contractors.",
        },
        {
            id: "09",
            title: "Financial Controls & Three-Way Match Engine",
            content: "Our platform includes an automated Three-Way Match Compliance Engine that cross-verifies Purchase Orders, Goods Receipt Notes, and Vendor Invoices based on configurable variance thresholds. While this feature is designed to assist in detecting discrepancies and preventing erroneous payments, you acknowledge that final payment authorization decisions rest with your authorized financial personnel. The platform operator is not responsible for financial losses, fraud, or accounting errors that may occur within your tenant workspace, and we strongly recommend independent verification of all material financial transactions.",
        },
        {
            id: "10",
            title: "Data Accuracy & Reporting",
            content: "Reports generated by the platform, including Daily Progress Reports, project completion metrics, budget utilization analyses, inventory health indicators, and Gantt chart visualizations, are derived from data entered by your authorized users. The accuracy and timeliness of all reports depend entirely on the quality and completeness of data inputs. You agree to use these reports as decision-support tools and to validate critical metrics through independent verification methods where appropriate for operational, regulatory, or audit purposes.",
        },
        {
            id: "11",
            title: "Document Vault & File Storage",
            content: "The Project Document Vault provides secure cloud storage for construction blueprints, contractor contracts, regulatory permits, site compliance forms, and other operational documents. You retain full ownership of all uploaded files and are responsible for ensuring that the content does not infringe on third-party intellectual property rights, contain illegal material, or violate any applicable laws. The platform operator implements industry-standard security measures to protect stored files but does not guarantee against all forms of data loss, and we recommend maintaining independent backups of critical documents.",
        },
        {
            id: "12",
            title: "Acceptable Use Policy",
            content: "You agree to use the platform exclusively for legitimate construction management activities and in accordance with all applicable laws and regulations. You shall not attempt to gain unauthorized access to other tenant workspaces, reverse engineer the platform, distribute malware, interfere with system operations, or use the platform to engage in any unlawful, fraudulent, or harmful activities. Violations of this acceptable use policy may result in account suspension, termination, or other remedial actions as deemed appropriate by the platform operator.",
        },
        {
            id: "13",
            title: "Data Privacy & Confidentiality",
            content: "We take data privacy seriously and handle all personal and corporate information collected through the platform in accordance with our Privacy Policy. Multi-tenant data isolation ensures that information from one company tenant is not accessible to another. We implement industry-standard encryption, access controls, and security monitoring to protect your data. However, no method of electronic transmission or storage is completely secure, and you acknowledge the inherent risks associated with cloud-based platforms while we continuously work to maintain robust security standards.",
        },
        {
            id: "14",
            title: "Intellectual Property Rights",
            content: "All platform features, including the user interface, software code, dashboards, workflow engines, the Three-Way Match logic, RBAC framework, analytical visualizations, and supporting documentation, are the exclusive intellectual property of the platform operator and are protected by copyright, trademark, and other intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to use the platform during the term of your subscription. Your operational data and uploaded content remain your property, while the platform infrastructure and proprietary technology remain ours.",
        },
        {
            id: "15",
            title: "Subscription, Billing & Service Plans",
            content: "Access to the platform may be provided under various subscription tiers, each defining specific feature availability, user seat limits, project capacity, and storage allocations. Subscription fees, billing cycles, and renewal terms are communicated at the time of purchase. You agree to pay all applicable fees in accordance with the selected plan. We reserve the right to modify pricing structures with reasonable advance notice to existing subscribers, and any pricing changes will not affect the current billing cycle of active subscriptions.",
        },
        {
            id: "16",
            title: "Service Availability & Maintenance",
            content: "We strive to maintain high availability of the platform to support continuous construction operations. However, scheduled maintenance windows, system updates, infrastructure upgrades, and unforeseen technical issues may occasionally affect service availability. We will provide reasonable advance notice for planned maintenance where possible. The platform operator shall not be liable for temporary service interruptions, data synchronization delays, or operational impacts arising from circumstances beyond our reasonable control, including network outages, third-party service disruptions, or force majeure events.",
        },
        {
            id: "17",
            title: "Data Backup & Recovery",
            content: "We perform regular automated backups of platform data as part of our standard operational procedures. In the event of data loss due to system failure, we will make reasonable efforts to restore data from available backups. However, you acknowledge that backup recovery is not guaranteed for every individual transaction, and we recommend that your organization maintain independent backup procedures for critical operational data, financial records, and uploaded documents. Data export tools are available within the platform to facilitate periodic local backups.",
        },
        {
            id: "18",
            title: "Third-Party Integrations",
            content: "The platform may offer integrations with third-party services, including email providers, payment gateways, mapping services, document storage systems, or accounting software. These integrations are provided to enhance functionality and convenience. The platform operator is not responsible for the availability, accuracy, performance, or policies of third-party services, and your use of any integrated third-party service is subject to the terms and conditions of that respective service provider.",
        },
        {
            id: "19",
            title: "Limitation of Liability",
            content: "To the maximum extent permitted by applicable law, the platform operator and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform, including but not limited to lost profits, business interruption, project delays, or data loss. Our total cumulative liability for any claims related to the service shall not exceed the total subscription fees paid by your organization during the twelve months preceding the event giving rise to the claim. This limitation applies regardless of the legal theory under which the claim is brought.",
        },
        {
            id: "20",
            title: "Indemnification",
            content: "You agree to indemnify and hold harmless the platform operator, its officers, employees, and affiliates from any claims, damages, liabilities, or expenses arising from your use of the platform, your violation of these terms, your infringement of third-party rights, or any disputes between your organization and your vendors, contractors, employees, or other third parties. This indemnification obligation extends to any legal fees and costs reasonably incurred in defending against such claims.",
        },
        {
            id: "21",
            title: "Account Suspension & Termination",
            content: "We reserve the right to suspend or terminate access to the platform in cases of material breach of these terms, non-payment of subscription fees, fraudulent activity, or violation of applicable laws. Upon termination, your right to access the platform ceases, though we will provide a reasonable data export window to retrieve your operational data. You may also voluntarily terminate your subscription at any time by contacting our support team, subject to any minimum commitment terms specified in your subscription agreement.",
        },
        {
            id: "22",
            title: "Modifications to Terms & Platform Features",
            content: "We may update these Terms and Conditions periodically to reflect changes in our services, legal requirements, or industry best practices. Material changes will be communicated to organization administrators via email or in-platform notifications with reasonable advance notice. We may also enhance, modify, or deprecate specific platform features as part of our continuous improvement efforts, with reasonable communication regarding significant changes that may affect your operational workflows.",
        },
        {
            id: "23",
            title: "Governing Law & Dispute Resolution",
            content: "These Terms and Conditions shall be governed by and construed in accordance with the laws of the jurisdiction in which the platform operator is registered, without regard to conflict of law principles. Any disputes arising from these terms or your use of the platform shall be resolved through good-faith negotiation in the first instance, followed by mediation or binding arbitration as appropriate. Both parties agree to attempt amicable resolution before initiating formal legal proceedings.",
        },
        {
            id: "24",
            title: "Contact & Support",
            content: "For questions regarding these Terms and Conditions, technical support inquiries, billing matters, or account-related concerns, please contact our support team through the designated channels available within your platform workspace. We are committed to providing responsive assistance and maintaining transparent communication with all users. Your feedback and inquiries help us continuously improve the platform experience for the entire construction management community.",
        },
    ];

    return (
        <div className={`${mounted ? "animate-slideUp" : "opacity-0"} w-full max-w-225 rounded-[20px] p-px bg-[linear-gradient(180deg,#252525_0%,#0b0b0b_100%)]`}>
            <div className="w-full bg-[linear-gradient(135deg,#000000_0%,#1b1b1b_100%)] border border-white/[0.07] rounded-[20px] px-6 py-12 sm:px-16 sm:py-16 relative overflow-hidden">

                {/* Inner border */}
                <div className="pointer-events-none absolute inset-3 rounded-2xl border border-[#202020]" />

                {/* Back link */}
                <div className="relative z-10 mb-10">
                    <Link
                        href="/register"
                        className="inline-flex items-center gap-2 text-sm font-sfpro text-[#666] hover:text-white transition-colors duration-200 group w-fit"
                    >
                        <svg
                            className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Registration
                    </Link>
                </div>

                {/* Header */}
                <div className="relative z-10 text-center mb-14">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] mb-6">
                        <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                    </div>
                    <h1 className="text-[clamp(1.8rem,4vw,2.4rem)] font-sfpro-bold text-white tracking-tight leading-[1.15] mb-3">
                        Terms & Conditions
                    </h1>
                    <p className="text-sm font-sfpro text-[#C2C2C2] leading-relaxed max-w-115 mx-auto">
                        Please review these terms carefully before using our Construction Management System. By creating an account, you agree to be bound by the conditions outlined below.
                    </p>
                    <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.07] bg-white/[0.03]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                        <span className="text-[11px] font-sfpro text-[#666]">Last updated: June 12, 2026</span>
                    </div>
                </div>

                {/* Divider */}
                <div className="relative z-10 w-full h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent mb-14 max-w-170 mx-auto" />

                {/* Terms Content */}
                <div className="relative z-10 max-w-170 mx-auto space-y-4">
                    {sections.map((section, index) => (
                        <div
                            key={index}
                            className="group flex gap-5 sm:gap-7 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.08] px-6 py-6 sm:px-8 sm:py-7 transition-all duration-300"
                        >
                            {/* Section number */}
                            <div className="flex-shrink-0 pt-0.5">
                                <span className="text-[11px] font-sfpro-bold text-[#333] tracking-widest uppercase tabular-nums">
                                    {section.id}
                                </span>
                            </div>

                            {/* Divider line */}
                            <div className="flex-shrink-0 w-px bg-white/[0.06] group-hover:bg-white/[0.12] transition-colors duration-300" />

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <h2 className="text-sm sm:text-base font-sfpro-bold text-white mb-2.5 tracking-tight">
                                    {section.title}
                                </h2>
                                <p className="text-sm font-sfpro text-[#888] leading-[1.8] group-hover:text-[#a0a0a0] transition-colors duration-300">
                                    {section.content}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Divider */}
                <div className="relative z-10 w-full h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent mt-14 mb-12 max-w-170 mx-auto" />

                {/* Acknowledgment Section */}
                <div className="relative z-10 max-w-170 mx-auto mb-10">
                    <div className="rounded-xl border border-white/[0.07] bg-gradient-to-br from-white/[0.03] to-white/[0.01] px-8 py-8 sm:px-10">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                                <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-base font-sfpro-bold text-white mb-2">Acknowledgment of Terms</h3>
                                <p className="text-sm font-sfpro text-[#888] leading-[1.75]">
                                    By proceeding with account registration, you confirm that you have read these Terms and Conditions in full, understand the obligations and rights they establish, and agree to be bound by all provisions outlined above on behalf of yourself and your organization.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact Section */}
                {/* <div className="relative z-10 max-w-170 mx-auto">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-8 py-8 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div>
                            <h3 className="text-base font-sfpro-bold text-white mb-1.5">Need Clarification?</h3>
                            <p className="text-sm font-sfpro text-[#888] leading-relaxed">
                                Our support team is ready to address any questions regarding these terms.
                            </p>
                        </div>
                        <a
                            href="mailto:support@example.com"
                            className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-[#0a0a0a] rounded-xl font-sfpro-bold text-sm px-6 py-3 hover:opacity-85 hover:-translate-y-px active:translate-y-0 active:opacity-95 transition-all duration-200 whitespace-nowrap"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                            Contact Support
                        </a>
                    </div>
                </div> */}
                <div className="relative z-10 mb-10">
                    <Link
                        href="/register"
                        className="inline-flex items-center gap-2 text-sm font-sfpro text-[#666] hover:text-white transition-colors duration-200 group w-fit"
                    >
                        <svg
                            className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Registration
                    </Link>
                </div>

                {/* Footer */}
                <div className="relative z-10 mt-10 text-center">
                    <p className="text-xs font-sfpro text-[#444]">
                        © {new Date().getFullYear()} Construction Management System · All rights reserved.
                        &nbsp;·&nbsp;
                        <Link href="/privacy" className="hover:text-[#888] transition-colors duration-200">
                            Privacy Policy
                        </Link>
                    </p>
                </div>

            </div>
        </div>
    );
}