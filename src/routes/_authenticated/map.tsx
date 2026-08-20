import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crosshair } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { IndiaMap, type MapMarker } from "@/components/IndiaMap";
import { AGENCY_TYPES, CAPABILITIES, haversineKm, severityLabel, timeAgo } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({
    meta: [
      { title: "Live Rescue Map | SahayGrid" },
      {
        name: "description",
        content:
          "Live map of verified rescue agencies and active disaster incidents, filterable by agency type, capability, availability and distance.",
      },
      { property: "og:title", content: "Live Rescue Map | SahayGrid" },
      {
        property: "og:description",
        content: "Every verified agency and active disaster on one filterable national map.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapPage,
});

const ALL = "all";

function MapPage() {
  const [type, setType] = useState(ALL);
  const [capability, setCapability] = useState(ALL);
  const [availability, setAvailability] = useState(ALL);
  const [activeWithin, setActiveWithin] = useState(ALL);
  const [radius, setRadius] = useState(2000);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const qc = useQueryClient();
  const [liveAt, setLiveAt] = useState<Date | null>(null);

  const { data } = useQuery({
    queryKey: ["map-data"],
    queryFn: async () => {
      const [agencies, incidents] = await Promise.all([
        supabase.from("agencies").select("*").eq("status", "verified"),
        supabase.from("incidents").select("*").neq("status", "resolved"),
      ]);
      if (agencies.error) throw agencies.error;
      if (incidents.error) throw incidents.error;
      return { agencies: agencies.data, incidents: incidents.data };
    },
  });

  const filtered = useMemo(() => {
    const list = data?.agencies ?? [];
    return list.filter((a) => {
      if (type !== ALL && a.agency_type !== type) return false;
      if (capability !== ALL && !(a.capabilities ?? []).includes(capability)) return false;
      if (availability !== ALL && a.availability !== availability) return false;
      if (activeWithin !== ALL) {
        const hours = Number(activeWithin);
        if (Date.now() - new Date(a.last_active_at).getTime() > hours * 3600_000) return false;
      }
      if (origin && haversineKm(origin.lat, origin.lng, a.latitude, a.longitude) > radius) return false;
      return true;
    });
  }, [data, type, capability, availability, activeWithin, origin, radius]);

  const markers: MapMarker[] = [
    ...filtered.map<MapMarker>((a) => ({
      id: `a-${a.id}`,
      lat: a.latitude,
      lng: a.longitude,
      label: a.name,
      sub: `${a.agency_type} · ${a.availability.replace("_", " ")}`,
      kind: "agency",
      tone: a.availability === "available" ? "success" : a.availability === "on_mission" ? "accent" : "muted",
    })),
    ...(data?.incidents ?? []).map<MapMarker>((i) => ({
      id: `i-${i.id}`,
      lat: i.latitude,
      lng: i.longitude,
      label: i.title,
      sub: `${i.disaster_type} · ${severityLabel(i.severity)}`,
      kind: "incident",
      tone: "destructive",
    })),
  ];

  const locate = () => {
    if (!navigator.geolocation) {
      toast.error("GPS unavailable on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Distance filter anchored to your location");
      },
      () => toast.error("Could not read GPS location"),
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="label-mono">Situational awareness</p>
        <h1 className="text-2xl font-bold">Live rescue map</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="panel p-4">
          <IndiaMap markers={markers} selectedId={selected} onSelect={(m) => setSelected(m.id)} />
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <Legend className="bg-success" label="Available agency" />
            <Legend className="bg-accent" label="On mission" />
            <Legend className="bg-muted-foreground" label="Offline" />
            <Legend className="bg-destructive" label="Active incident" />
          </div>
        </section>

        <aside className="space-y-4">
          <div className="panel space-y-4 p-4">
            <h2 className="text-sm font-semibold">Filters</h2>
            <Picker label="Agency type" value={type} onChange={setType} options={[...AGENCY_TYPES]} />
            <Picker
              label="Capability"
              value={capability}
              onChange={setCapability}
              options={[...CAPABILITIES]}
            />
            <div className="space-y-1.5">
              <Label className="label-mono">Availability</Label>
              <Select value={availability} onValueChange={setAvailability}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="on_mission">On mission</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="label-mono">Last reported activity</Label>
              <Select value={activeWithin} onValueChange={setActiveWithin}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any time</SelectItem>
                  <SelectItem value="1">Within 1 hour</SelectItem>
                  <SelectItem value="6">Within 6 hours</SelectItem>
                  <SelectItem value="24">Within 24 hours</SelectItem>
                  <SelectItem value="168">Within 7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="label-mono">Distance radius · {radius} km</Label>
              <Slider
                min={25}
                max={2000}
                step={25}
                value={[radius]}
                onValueChange={([v]) => setRadius(v ?? radius)}
                disabled={!origin}
              />
              <Button variant="outline" size="sm" className="w-full" onClick={locate}>
                <Crosshair className="mr-2 h-4 w-4" />
                {origin ? "Re-anchor to my location" : "Anchor to my location"}
              </Button>
            </div>
          </div>

          <div className="panel p-4">
            <h2 className="text-sm font-semibold">
              Matching agencies <span className="text-muted-foreground">({filtered.length})</span>
            </h2>
            <ul className="mt-2 max-h-96 divide-y divide-border overflow-auto">
              {filtered.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(`a-${a.id}`)}
                    className="w-full py-2.5 text-left"
                  >
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.agency_type} · {a.district || a.state || "—"} · {a.personnel_count} personnel
                      {origin
                        ? ` · ${haversineKm(origin.lat, origin.lng, a.latitude, a.longitude).toFixed(0)} km`
                        : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Active {timeAgo(a.last_active_at)}
                    </p>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="py-4 text-sm text-muted-foreground">No agencies match these filters.</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Picker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="label-mono">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
