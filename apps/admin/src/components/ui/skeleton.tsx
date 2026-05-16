export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-neutral-200 ${className}`} />;
}

export function TableRowSkeleton({ cols }: { cols: number }) {
  return (
    <tr className="border-t-2 border-neutral-900">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[160px]" />
        </td>
      ))}
    </tr>
  );
}
