import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0e1117] font-sans">
      
      <h1 className="text-[140px] sm:text-[180px] md:text-[220px] font-bold text-[#cbd5e1] leading-none tracking-tight font-sfpro-bold">
        404
      </h1>

      <p className="mt-2 sm:mt-4 text-xs sm:text-sm text-gray-400 mb-8 sm:mb-10 tracking-wide font-sfpro-medium">
        Oops something went wrong
      </p>

      <Link
        href="/dashboard" 
        className="flex items-center gap-2.5 px-5 py-2.5 sm:px-6 sm:py-3 rounded-md border border-white/10 bg-white/2 text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200 text-xs sm:text-sm font-medium font-sfpro"
      >
        Back to Home
        <Home size={16} strokeWidth={2.5} />
      </Link>
 
    </div>
  );
}