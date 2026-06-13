export const metadata = {
  title: "CMS Construction Management System",
  description: "Role-based construction management platform",
};

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] px-4 py-6 font-sfpro">
      {children}
    </div>
  );
}