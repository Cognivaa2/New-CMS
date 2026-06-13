import { CheckCircle2, ChevronRight, Mail, Phone, MapPin, Globe } from "lucide-react"

function BankItem({ label, value, isMasked }) {
  return (
    <div className="group">
      <div className="text-[12px] text-gray-400 font-sfpro-bold flex items-center gap-1 mb-1.5 uppercase tracking-widest">
        {label}{" "}
        <ChevronRight className="w-3 h-3 opacity-50 group-hover:translate-x-0.5 transition-transform" />
      </div>
      <div
        className={`text-[16px] font-sfpro-bold text-gray-800 dark:text-white ${isMasked ? "tracking-[0.15em]" : ""
          }`}
      >
        {value || "—"}
      </div>
    </div>
  )
}

export default function VendorOverview({ vendor }) {
  if (!vendor) return null

  const {
    name,
    photo,
    email,
    phone,
    address,
    website,
    description,
    vendorType,
    supplyCategories = [],
    isVerified,
    legalDetails = {},
    bankDetails = {},
  } = vendor

  const legalPills = Object.entries(legalDetails)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k.toUpperCase()}: ${v}`)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 animate-in fade-in duration-500">

      <div className="space-y-10">

        <div>
          <div className="flex items-center gap-2.5 mb-5">
            {photo ? (
              <img
                src={photo}
                alt={name}
                style={{ width: 48, height: 48, minWidth: 48, minHeight: 48 }}
                className="rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm shrink-0"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            ) : null}
            <h3 className="text-[30px] font-sfpro-bold text-gray-900 dark:text-white tracking-tight">
              {name}
            </h3>
            {isVerified && (
              <CheckCircle2 className="w-6 h-6 text-[#22c55e] fill-[#22c55e]/10" />
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {vendorType && (
              <span className="px-5 py-2.5 bg-gray-50 dark:bg-[#1c1c1c] rounded-full text-[13px] font-sfpro-medium text-gray-500 border border-gray-100/50 dark:border-gray-800">
                {vendorType}
              </span>
            )}
            {supplyCategories.map((cat, i) => (
              <span
                key={i}
                className="px-5 py-2.5 bg-gray-50 dark:bg-[#1c1c1c] rounded-full text-[13px] font-sfpro-medium text-gray-500 border border-gray-100/50 dark:border-gray-800"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
        {description && (
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 text-[13px] font-sfpro-bold text-gray-400 uppercase tracking-wider">
              Description <ChevronRight className="w-3.5 h-3.5" />
            </div>
            <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-[1.6] max-w-md">
              {description}
            </p>
          </div>
        )}
        <div className="space-y-5 text-[14px] text-gray-600 dark:text-gray-400 font-sfpro-medium">
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-3.5 hover:text-black dark:hover:text-white transition-colors"
            >
              <Mail className="w-4.5 h-4.5 text-gray-400" />
              {email}
            </a>
          )}
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-3.5 hover:text-black dark:hover:text-white transition-colors"
            >
              <Phone className="w-4.5 h-4.5 text-gray-400" />
              {phone}
            </a>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3.5 hover:text-black dark:hover:text-white transition-colors"
            >
              <Globe className="w-4.5 h-4.5 text-gray-400" />
              {website}
            </a>
          )}
          {address && (
            <div className="flex items-start gap-3.5 hover:text-black dark:hover:text-white transition-colors">
              <MapPin className="w-4.5 h-4.5 text-gray-400 mt-1 shrink-0" />
              <span className="leading-relaxed">{address}</span>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-12">
        {legalPills.length > 0 && (
          <section>
            <h4 className="text-[20px] font-sfpro-bold mb-6 text-gray-900 dark:text-white tracking-tight">
              Legal Details
            </h4>
            <div className="flex flex-wrap gap-3">
              {legalPills.map((pill) => (
                <span
                  key={pill}
                  className="px-5 py-3.5 bg-gray-50 dark:bg-[#1c1c1c] rounded-full text-[13px] font-sfpro-bold text-gray-700 dark:text-gray-300 border border-gray-100/50 dark:border-gray-800"
                >
                  {pill}
                </span>
              ))}
            </div>
          </section>
        )}
        {Object.keys(bankDetails).some((k) => bankDetails[k]) && (
          <section>
            <h4 className="text-[20px] font-sfpro-bold mb-8 text-gray-900 dark:text-white tracking-tight">
              Bank Details
            </h4>
            <div className="space-y-7">
              {bankDetails.accountName && (
                <BankItem label="Account Name" value={bankDetails.accountName} />
              )}
              {bankDetails.accountNumber && (
                <BankItem
                  label="Account Number"
                  value={`XXXXXXXXXXXXX${String(bankDetails.accountNumber).slice(-4)}`}
                  isMasked
                />
              )}
              {bankDetails.bankName && (
                <BankItem label="Bank Name" value={bankDetails.bankName} />
              )}
              {bankDetails.ifsc && (
                <BankItem label="IFSC Code" value={bankDetails.ifsc} />
              )}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}