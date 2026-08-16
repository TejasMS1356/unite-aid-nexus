import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Ambulance, Building2, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { IndiaMap, type MapMarker } from "@/components/IndiaMap";
import { severityLabel, timeAgo } from "@/lib/geo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Command Dashboard | SahayGrid" },
      {
        name: "description",
        content:
          "Live operational picture of active emergencies, verified rescue agencies, deployable resources and mission status across the country.",
      },
      { property: "og:title", content: "Command Dashboard | SahayGrid" },
      {
        property: "og:description",
        content: "Active emergencies, agency posture and mission status in one operational picture.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["command-overview"],
    queryFn: async () => {
      const [agencies, incidents, resources, missions] = await Promise.all([
        supabase.from("agencies").select("*"),
        supabase.from("incidents").select("*").order("created_at", { ascending: false }),
        supabase.from("resources").select("*"),
        supabase.from("missions").select("*"),
      ]);
      if (agencies.error) throw agencies.error;
      if (incidents.error) throw incidents.error;
      if (resources.error) throw resources.error;
      if (missions.error) throw missions.error;
      return {
        agencies: agencies.data,
        incidents: incidents.data,
        resources: resources.data,
        missions: missions.data,
      };
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("command-overview")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        qc.invalidateQueries({ queryKey: ["command-overview"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const agencies = data?.agencies ?? [];
  const incidents = data?.incidents ?? [];
  const resources = data?.resources ?? [];
  const missions = data?.missions ?? [];

  const active = incidents.filter((i) => i.status !== "resolved");

  const markers: MapMarker[] = [
    ...agencies
      .filter((a) => a.status === "verified")
      .map<MapMarker>((a) => ({
        id: `a-${a.id}`,
        lat: a.latitude,
        lng: a.longitude,
        label: a.name,
        sub: `${a.agency_type} · ${a.availability.replace("_", " ")}`,
        kind: "agency",
        tone: a.availability === "available" ? "success" : a.availability === "on_mission" ? "accent" : "muted",
      })),
    ...active.map<MapMarker>((i) => ({
      id: `i-${i.id}`,
      lat: i.latitude,
      lng: i.longitude,
      label: i.title,
      sub: `${i.disaster_type} · ${severityLabel(i.severity)}`,
      kind: "incident",
      tone: "destructive",
    })),
  ];

  const stats = [
    {
      icon: AlertTriangle,
      label: "Active emergencies",
      value: active.length,
      note: `${incidents.length - active.length} resolved`,
    },
    {
      icon: Building2,
      label: "Verified agencies",
      value: agencies.filter((a) => a.status === "verified").length,
      note: `${agencies.filter((a) => a.status === "pending").length} awaiting verification`,
    },
    {
      icon: Ambulance,
      label: "Resources available",
      value: resources.filter((r) => r.status === "available").length,
      note: `${resources.filter((r) => r.status === "on_mission").length} committed`,
    },
    {
      icon: Radio,
      label: "Open missions",
      value: missions.filter((m) => m.status === "pending" || m.status === "accepted").length,
      note: `${missions.filter((m) => m.status === "completed").length} completed`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-mono">National operational picture</p>
          <h1 className="text-2xl font-bold">Command dashboard</h1>
        </div>
        <Button asChild size="sm">
          <Link to="/incidents">Report emergency</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="panel p-4">
            <div className="flex items-center justify-between">
              <span className="label-mono">{s.label}</span>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-3xl font-bold tabular-nums">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="panel p-4">
          <h2 className="mb-3 text-sm font-semibold">Live grid</h2>
          <IndiaMap markers={markers} />
        </section>

        <section className="panel p-4">
          <h2 className="text-sm font-semibold">Active emergencies</h2>
          <ul className="mt-3 divide-y divide-border">
            {active.length === 0 && (
              <li className="py-6 text-sm text-muted-foreground">No active emergencies reported.</li>
            )}
            {active.slice(0, 8).map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">{i.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.disaster_type} · {severityLabel(i.severity)} · {i.people_affected} affected
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded bg-secondary px-2 py-0.5 text-[11px] uppercase text-muted-foreground">
                    {i.status.replace("_", " ")}
                  </span>
                  <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(i.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
