import { Mail, Phone, MapPin, Globe } from "lucide-react"

const NotProvided = () => (
  <span className="text-sm font-sfpro italic text-[#c2c2c2] dark:text-[#3f3f46] transition-colors">Not provided</span>
)
export default function InformationCard({ data }) {
  return (
    <div className="bg-[#f0f0f0] dark:bg-[#18181b] border border-transparent dark:border-[#27272a] rounded-2xl p-8 h-full transition-colors duration-300 font-sfpro">
      <h3 className="text-lg font-sfpro-medium text-gray-900 dark:text-[#f4f4f5] mb-6 transition-colors">
        Information
      </h3>      
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-gray-600 dark:text-[#a1a1aa] shrink-0 mt-0.5 transition-colors" />
          {data.email 
            ? <span className="text-[14px] text-gray-800 dark:text-[#d4d4d8] font-sfpro-medium transition-colors">{data.email}</span>
            : <NotProvided />
          }
        </div>        
        <div className="flex items-start gap-3">
          <Phone className="w-5 h-5 text-gray-600 dark:text-[#a1a1aa] shrink-0 mt-0.5 transition-colors" />
          {data.phone
            ? <span className="text-[14px] text-gray-800 dark:text-[#d4d4d8] font-sfpro-medium transition-colors">{data.phone}</span>
            : <NotProvided />
          }
        </div>        
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-gray-600 dark:text-[#a1a1aa] shrink-0 mt-0.5 transition-colors" />
          {data.address
            ? <span className="text-[14px] text-gray-800 dark:text-[#d4d4d8] font-sfpro-medium leading-relaxed whitespace-pre-line transition-colors">{data.address}</span>
            : <NotProvided />
          }
        </div>        
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-gray-600 dark:text-[#a1a1aa] shrink-0 mt-0.5 transition-colors" />
          {data.website
            ? <a href={data.website} className="text-[14px] text-gray-800 dark:text-[#d4d4d8] font-sfpro-medium hover:underline transition-colors">{data.website}</a>
            : <NotProvided />
          }
        </div>
      </div>
    </div>
  )
}