"use client";

function formatCompactAmount(value) {
  if (value === null || value === undefined || value === "") return value;
  const original = String(value);
  const hasCurrency = original.includes("₹");
  const hasPercent = original.includes("%");

  if (hasPercent) return original;

  const cleaned = original.replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.")
    return value;

  const num = Number(cleaned);
  if (!Number.isFinite(num)) return value;

  const abs = Math.abs(num);
  const compact = (n, suffix) => {
    const formatted = parseFloat(n.toFixed(2)).toString();
    return `${hasCurrency ? "₹" : ""}${formatted}${suffix}`;
  };

  if (abs >= 10000000) return compact(num / 10000000, "Cr");
  if (abs >= 100000) return compact(num / 100000, "L");
  if (abs >= 1000) return compact(num / 1000, "K");
  return value;
}

function PayableCard({ item }) {
  const displayValue = formatCompactAmount(item.value);

  return (
    <div
      className={`p-4 sm:p-5 lg:p-6 rounded-3xl sm:rounded-4xl transition-all duration-300 font-sfpro flex flex-col justify-center min-h-32 sm:min-h-36 lg:min-h-40 ${item.colorClass}`}
    >
      <h2
        className="text-[26px] sm:text-[30px] lg:text-[34px] font-sfpro-bold leading-none mb-1.5 sm:mb-2 text-gray-800 dark:text-gray-100 truncate"
        title={item.value}
      >
        {displayValue}
      </h2>
      <p className="text-[14px] sm:text-[15px] lg:text-[16px] font-sfpro-bold text-gray-800/80 dark:text-gray-200 truncate">
        {item.title || item.label}
      </p>
      <p className="text-[11px] sm:text-[12px] text-gray-400 dark:text-gray-400 mt-0.5 sm:mt-1 truncate">
        {item.subtitle || item.subLabel}
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="h-32 sm:h-36 lg:h-40 rounded-3xl sm:rounded-4xl bg-gray-100 dark:bg-[#1e1e1e] animate-pulse" />
  );
}

export default function SummaryCards({ cards = [], isLoading = false }) {
  if (isLoading || cards.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
      {cards.map((card) => (
        <PayableCard key={card.id} item={card} />
      ))}
    </div>
  );
}