import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crosshair, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DISASTER_TYPES, severityLabel, timeAgo } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/incidents")({
  head: () => ({
    meta: [
      { title: "Emergency Reporting | SahayGrid" },
      {
        name: "description",
        content:
          "Report disasters with GPS location, severity and people affected, assign rescue missions to agencies and track status from reported to resolved.",
      },
      { property: "og:title", content: "Emergency Reporting | SahayGrid" },
      {
        property: "og:description",
        content: "Report incidents, task agencies and track missions to resolution.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IncidentsPage,
});

const schema = z.object({
  title: z.string().trim().min(4, "Describe the emergency in a short title").max(140),
  disaster_type: z.string().min(1, "Select a disaster type"),
  severity: z.number().int().min(1).max(5),
  description: z.string().trim().max(1000),
  address: z.string().trim().max(300),
  photo_url: z.string().trim().max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  people_affected: z.number().int().min(0).max(1_000_000),
});

const EMPTY = {
  title: "",
  disaster_type: "",
  severity: 3,
  description: "",
  address: "",
  photo_url: "",
  latitude: 22.5,
  longitude: 78.9,
  people_affected: 0,
};

const STATUSES = ["reported", "assigned", "in_progress", "resolved"] as const;

function IncidentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY });
  const [openId, setOpenId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["incident-board"],
    queryFn: async () => {
      const [incidents, agencies, missions, myAgency] = await Promise.all([
        supabase.from("incidents").select("*").order("created_at", { ascending: false }),
        supabase.from("agencies").select("*").eq("status", "verified"),
        supabase.from("missions").select("*"),
        supabase.from("agencies").select("*").eq("owner_id", user?.id ?? "").maybeSingle(),
      ]);
      if (incidents.error) throw incidents.error;
      if (agencies.error) throw agencies.error;
      if (missions.error) throw missions.error;
      return {
        incidents: incidents.data,
        agencies: agencies.data,
        missions: missions.data,
        myAgency: myAgency.data,
      };
    },
    enabled: !!user,
  });

  useEffect(() => {
    const channel = supabase
      .channel("incident-board")
      .on("postgres_changes", { event: "*", schema: "public" }, () =>
        qc.invalidateQueries({ queryKey: ["incident-board"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const incidents = data?.incidents ?? [];
  const agencies = data?.agencies ?? [];
  const missions = data?.missions ?? [];
  const myAgency = data?.myAgency ?? null;

  const report = useMutation({
    mutationFn: async () => {
      const parsed = schema.parse(form);
      const { error } = await supabase.from("incidents").insert({
        reporter_id: user!.id,
        title: parsed.title,
        disaster_type: parsed.disaster_type,
        severity: parsed.severity,
        description: parsed.description || null,
        address: parsed.address || null,
        photo_url: parsed.photo_url || null,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        people_affected: parsed.people_affected,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Emergency reported");
      setForm({ ...EMPTY });
      qc.invalidateQueries({ queryKey: ["incident-board"] });
    },
    onError: (e) =>
      toast.error(e instanceof z.ZodError ? (e.issues[0]?.message ?? "Invalid") : (e as Error).message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: (typeof STATUSES)[number] }) => {
      const { error } = await supabase.from("incidents").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incident-board"] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const useGps = () => {
    if (!navigator.geolocation) {
      toast.error("GPS unavailable on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setForm((f) => ({
          ...f,
          latitude: Number(pos.coords.latitude.toFixed(5)),
          longitude: Number(pos.coords.longitude.toFixed(5)),
        })),
      () => toast.error("Could not read GPS location"),
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <section className="panel h-fit p-5">
        <h1 className="text-xl font-bold">Report an emergency</h1>
        <p className="text-sm text-muted-foreground">
          Captures GPS location, disaster type, severity and people affected.
        </p>

        <div className="mt-4 space-y-3">
          <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="label-mono">Disaster type</Label>
              <Select
                value={form.disaster_type}
                onValueChange={(v) => setForm({ ...form, disaster_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {DISASTER_TYPES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="label-mono">Severity</Label>
              <Select
                value={String(form.severity)}
                onValueChange={(v) => setForm({ ...form, severity: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s} · {severityLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field
              label="Latitude"
              value={String(form.latitude)}
              onChange={(v) => setForm({ ...form, latitude: Number(v) || 0 })}
            />
            <Field
              label="Longitude"
              value={String(form.longitude)}
              onChange={(v) => setForm({ ...form, longitude: Number(v) || 0 })}
            />
            <Field
              label="People affected"
              value={String(form.people_affected)}
              onChange={(v) => setForm({ ...form, people_affected: Number(v) || 0 })}
            />
            <Field
              label="Photo URL"
              value={form.photo_url}
              onChange={(v) => setForm({ ...form, photo_url: v })}
            />
          </div>
          <Button variant="outline" size="sm" onClick={useGps}>
            <Crosshair className="mr-2 h-4 w-4" /> Use current GPS location
          </Button>
          <Field label="Address / landmark" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          <div className="space-y-1.5">
            <Label className="label-mono">Situation details</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <Button className="w-full" disabled={report.isPending} onClick={() => report.mutate()}>
            Raise emergency
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Incident board</h2>
        {incidents.length === 0 && (
          <p className="panel p-6 text-sm text-muted-foreground">No incidents reported yet.</p>
        )}
        {incidents.map((i) => {
          const own = i.reporter_id === user?.id;
          const incidentMissions = missions.filter((m) => m.incident_id === i.id);
          return (
            <article key={i.id} className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{i.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {i.disaster_type} · Severity {i.severity} ({severityLabel(i.severity)}) ·{" "}
                    {i.people_affected} affected · {timeAgo(i.created_at)}
                  </p>
                  {i.address && <p className="mt-1 text-xs text-muted-foreground">{i.address}</p>}
                </div>
                {own ? (
                  <Select
                    value={i.status}
                    onValueChange={(v) =>
                      setStatus.mutate({ id: i.id, status: v as (typeof STATUSES)[number] })
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="rounded bg-secondary px-2 py-1 text-[11px] uppercase text-muted-foreground">
                    {i.status.replace("_", " ")}
                  </span>
                )}
              </div>

              {i.description && <p className="mt-2 text-sm text-muted-foreground">{i.description}</p>}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenId(openId === i.id ? null : i.id)}
                >
                  {openId === i.id ? "Hide coordination" : `Coordination (${incidentMissions.length})`}
                </Button>
              </div>

              {openId === i.id && (
                <Coordination
                  incidentId={i.id}
                  agencies={agencies}
                  missions={incidentMissions}
                  myAgencyId={myAgency?.id ?? null}
                  userId={user?.id ?? ""}
                />
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}

type AgencyRow = { id: string; name: string; agency_type: string; owner_id: string };
type MissionRow = { id: string; agency_id: string; resource_id: string | null; status: string; note: string | null };

function Coordination({
  incidentId,
  agencies,
  missions,
  myAgencyId,
  userId,
}: {
  incidentId: string;
  agencies: AgencyRow[];
  missions: MissionRow[];
  myAgencyId: string | null;
  userId: string;
}) {
  const qc = useQueryClient();
  const [agencyId, setAgencyId] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [note, setNote] = useState("");
  const [alertText, setAlertText] = useState("");

  const { data: resources } = useQuery({
    queryKey: ["assignable-resources", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("agency_id", agencyId)
        .eq("status", "available");
      if (error) throw error;
      return data;
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ["alerts", incidentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("incident_id", incidentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const assign = useMutation({
    mutationFn: async () => {
      if (!agencyId) throw new Error("Select an agency to task");
      const { error } = await supabase.from("missions").insert({
        incident_id: incidentId,
        agency_id: agencyId,
        resource_id: resourceId || null,
        note: note.trim().slice(0, 300) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNote("");
      setResourceId("");
      toast.success("Mission created");
      qc.invalidateQueries({ queryKey: ["incident-board"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const respond = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("missions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incident-board"] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const broadcast = useMutation({
    mutationFn: async () => {
      if (alertText.trim().length < 3) throw new Error("Write a message");
      const { error } = await supabase.from("alerts").insert({
        sender_id: userId,
        incident_id: incidentId,
        from_agency_id: myAgencyId,
        message: alertText.trim().slice(0, 500),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAlertText("");
      qc.invalidateQueries({ queryKey: ["alerts", incidentId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mt-4 space-y-4 rounded border border-border bg-secondary/30 p-4">
      <div>
        <h4 className="label-mono">Task an agency</h4>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Select value={agencyId} onValueChange={setAgencyId}>
            <SelectTrigger>
              <SelectValue placeholder="Agency" />
            </SelectTrigger>
            <SelectContent>
              {agencies.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} · {a.agency_type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={resourceId} onValueChange={setResourceId} disabled={!agencyId}>
            <SelectTrigger>
              <SelectValue placeholder="Resource (optional)" />
            </SelectTrigger>
            <SelectContent>
              {(resources ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} · {r.kind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-2 flex gap-2">
          <Input placeholder="Tasking note" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button onClick={() => assign.mutate()} disabled={assign.isPending}>
            Assign
          </Button>
        </div>
      </div>

      <div>
        <h4 className="label-mono">Missions</h4>
        <ul className="mt-2 divide-y divide-border">
          {missions.length === 0 && <li className="py-2 text-sm text-muted-foreground">No missions yet.</li>}
          {missions.map((m) => {
            const agency = agencies.find((a) => a.id === m.agency_id);
            const mine = m.agency_id === myAgencyId;
            return (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm">{agency?.name ?? "Agency"}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.status} {m.note ? `· ${m.note}` : ""}
                  </p>
                </div>
                {mine && m.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => respond.mutate({ id: m.id, status: "accepted" })}>
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => respond.mutate({ id: m.id, status: "declined" })}
                    >
                      Decline
                    </Button>
                  </div>
                )}
                {mine && m.status === "accepted" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => respond.mutate({ id: m.id, status: "completed" })}
                  >
                    Mark completed
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h4 className="label-mono">Inter-agency alerts</h4>
        <div className="mt-2 flex gap-2">
          <Input
            placeholder="Request assistance or share an update"
            value={alertText}
            onChange={(e) => setAlertText(e.target.value)}
          />
          <Button onClick={() => broadcast.mutate()} disabled={broadcast.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <ul className="mt-2 space-y-1">
          {(alerts ?? []).map((a) => (
            <li key={a.id} className="text-xs text-muted-foreground">
              <span className="text-foreground">
                {agencies.find((x) => x.id === a.from_agency_id)?.name ?? "Command"}:
              </span>{" "}
              {a.message} · {timeAgo(a.created_at)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="label-mono">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
