/**
 * Marks screens whose backend contract is NOT final. Those screens stay on
 * isolated mock data until their official Final API contract arrives.
 */
export function DemoBadge() {
  return (
    <span
      title="This screen uses demo data — its backend API is not final yet."
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300"
    >
      Demo data
    </span>
  )
}
