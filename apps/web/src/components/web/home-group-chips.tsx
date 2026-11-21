'use client';

type HomeGroupChipsProps = {
  label: string;
  items: { id: string; label: string; count?: number }[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  allLabel: string;
};

export function HomeGroupChips({ label, items, selectedId, onSelect, allLabel }: HomeGroupChipsProps) {
  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
            selectedId === null
              ? 'border-ink bg-ink text-white'
              : 'border-border text-foreground hover:border-ink hover:bg-ink hover:text-white'
          }`}
        >
          {allLabel}
        </button>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
              selectedId === item.id
                ? 'border-ink bg-ink text-white'
                : 'border-border text-foreground hover:border-ink hover:bg-ink hover:text-white'
            }`}
          >
            {item.label}
            {item.count != null && item.count > 0 ? (
              <span className={selectedId === item.id ? 'text-white/70' : 'text-muted-foreground'}>
                {' '}
                ({item.count})
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}