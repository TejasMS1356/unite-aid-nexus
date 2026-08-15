import { project } from "@/lib/geo";
import { cn } from "@/lib/utils";

const OUTLINE: [number, number][] = [
  [34.5, 74.5],
  [35.5, 77.5],
  [34.0, 78.9],
  [32.5, 79.0],
  [30.4, 81.0],
  [28.6, 83.5],
  [27.5, 88.2],
  [27.9, 88.9],
  [28.1, 92.0],
  [27.7, 95.4],
  [28.3, 97.3],
  [27.0, 97.0],
  [25.5, 95.2],
  [24.0, 94.5],
  [23.0, 93.4],
  [22.0, 92.5],
  [23.7, 92.2],
  [24.9, 92.5],
  [25.2, 89.8],
  [26.6, 88.1],
  [25.3, 88.0],
  [23.5, 88.9],
  [21.6, 87.5],
  [19.9, 86.0],
  [17.0, 82.3],
  [15.9, 80.3],
  [13.1, 80.3],
  [11.0, 79.8],
  [8.1, 77.5],
  [8.9, 76.6],
  [11.9, 75.2],
  [15.0, 73.9],
  [18.9, 72.8],
  [21.5, 72.6],
  [22.4, 68.9],
  [23.7, 68.2],
  [24.7, 71.0],
  [25.9, 70.1],
  [27.7, 71.0],
  [28.0, 73.9],
  [30.0, 74.5],
  [32.3, 74.5],
];

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sub?: string;
  kind: "agency" | "incident";
  tone: "primary" | "accent" | "destructive" | "success" | "muted";
};

const toneDot: Record<MapMarker["tone"], string> = {
  primary: "bg-primary",
  accent: "bg-accent",
  destructive: "bg-destructive",
  success: "bg-success",
  muted: "bg-muted-foreground",
};

export function IndiaMap({
  markers,
  selectedId,
  onSelect,
  className,
}: {
  markers: MapMarker[];
  selectedId?: string | null;
  onSelect?: (m: MapMarker) => void;
  className?: string;
}) {
  const points = OUTLINE.map(([lat, lng]) => {
    const p = project(lat, lng);
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(" ");

  return (
    <div className={cn("relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-border bg-secondary/40 sm:aspect-[5/4]", className)}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="currentColor" strokeWidth="0.12" className="text-border" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        <polygon
          points={points}
          className="fill-card stroke-accent"
          strokeWidth="0.4"
          vectorEffect="non-scaling-stroke"
          opacity={0.9}
        />
      </svg>

      {markers.map((m) => {
        const p = project(m.lat, m.lng);
        const active = selectedId === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect?.(m)}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            aria-label={m.label}
          >
            <span className="relative flex items-center justify-center">
              {m.kind === "incident" && (
                <span className={cn("pulse-ring absolute h-4 w-4 rounded-full", toneDot[m.tone])} />
              )}
              <span
                className={cn(
                  "relative block border border-background shadow",
                  toneDot[m.tone],
                  m.kind === "incident" ? "h-3 w-3 rotate-45" : "h-2.5 w-2.5 rounded-full",
                  active && "ring-2 ring-foreground",
                )}
              />
            </span>
            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden w-max max-w-44 -translate-x-1/2 rounded border border-border bg-popover px-2 py-1 text-[11px] leading-tight text-popover-foreground shadow-lg group-hover:block">
              <span className="font-medium">{m.label}</span>
              {m.sub ? <span className="block text-muted-foreground">{m.sub}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
