import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crosshair, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AGENCY_TYPES, CAPABILITIES, RESOURCE_KINDS } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/agency")({
  head: () => ({
    meta: [
      { title: "My Agency | SahayGrid" },
      {
        name: "description",
        content: "Register or update your rescue agency profile, capabilities and deployable resources.",
      },
      { property: "og:title", content: "My Agency | SahayGrid" },
      { property: "og:description", content: "Manage agency profile, capabilities and resources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgencyPage,
});

const schema = z.object({
  name: z.string().trim().min(3, "Agency name is required").max(120),
  agency_type: z.string().min(1, "Select an agency type"),
  contact_person: z.string().trim().max(100).optional(),
  contact_phone: z.string().trim().max(20).optional(),
  contact_email: z.string().trim().max(255).optional(),
  address: z.string().trim().max(300).optional(),
  district: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  description: z.string().trim().max(600).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  personnel_count: z.number().int().min(0).max(100000),
});

type Form = z.infer<typeof schema> & { capabilities: string[] };

const EMPTY: Form = {
  name: "",
  agency_type: "",
  contact_person: "",
  contact_phone: "",
  contact_email: "",
  address: "",
  district: "",
  state: "",
  description: "",
  latitude: 22.5,
  longitude: 78.9,
  personnel_count: 0,
  capabilities: [],
};

function AgencyPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(EMPTY);

  const agencyQuery = useQuery({
    queryKey: ["my-agency", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const agency = agencyQuery.data;

  useEffect(() => {
    if (agency) {
      setForm({
        name: agency.name,
        agency_type: agency.agency_type,
        contact_person: agency.contact_person ?? "",
        contact_phone: agency.contact_phone ?? "",
        contact_email: agency.contact_email ?? "",
        address: agency.address ?? "",
        district: agency.district ?? "",
        state: agency.state ?? "",
        description: agency.description ?? "",
        latitude: agency.latitude,
        longitude: agency.longitude,
        personnel_count: agency.personnel_count,
        capabilities: agency.capabilities ?? [],
      });
    }
  }, [agency]);

  const save = useMutation({
    mutationFn: async () => {
      const { capabilities, ...rest } = form;
      const parsed = schema.parse(rest);
      const payload = { ...parsed, capabilities, owner_id: user!.id };
      if (agency) {
        const { error } = await supabase.from("agencies").update(payload).eq("id", agency.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("agencies").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(agency ? "Agency updated" : "Agency submitted for verification");
      qc.invalidateQueries({ queryKey: ["my-agency"] });
    },
    onError: (e) =>
      toast.error(e instanceof z.ZodError ? (e.issues[0]?.message ?? "Invalid") : (e as Error).message),
  });

  const setAvailability = useMutation({
    mutationFn: async (value: "available" | "on_mission" | "offline") => {
      const { error } = await supabase
        .from("agencies")
        .update({ availability: value, last_active_at: new Date().toISOString() })
        .eq("id", agency!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-agency"] }),
  });

  const useGps = () => {
    if (!navigator.geolocation) return toast.error("GPS unavailable on this device");
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

  const statusTone =
    agency?.status === "verified" ? "bg-success/15 text-success" : agency?.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{agency ? "Agency profile" : "Register your agency"}</h1>
            <p className="text-sm text-muted-foreground">
              Verified agencies appear on the national live map.
            </p>
          </div>
          {agency && (
            <span className={`rounded px-2 py-1 text-xs font-medium uppercase ${statusTone}`}>
              {agency.status}
            </span>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Text label="Agency name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <div className="space-y-1.5">
            <Label className="label-mono">Agency type</Label>
            <Select
              value={form.agency_type}
              onValueChange={(v) => setForm({ ...form, agency_type: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {AGENCY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Text
            label="Contact person"
            value={form.contact_person ?? ""}
            onChange={(v) => setForm({ ...form, contact_person: v })}
          />
          <Text
            label="Control room phone"
            value={form.contact_phone ?? ""}
            onChange={(v) => setForm({ ...form, contact_phone: v })}
          />
          <Text
            label="Contact email"
            value={form.contact_email ?? ""}
            onChange={(v) => setForm({ ...form, contact_email: v })}
          />
          <Text
            label="Personnel strength"
            value={String(form.personnel_count)}
            onChange={(v) => setForm({ ...form, personnel_count: Number(v) || 0 })}
          />
          <Text
            label="District"
            value={form.district ?? ""}
            onChange={(v) => setForm({ ...form, district: v })}
          />
          <Text label="State" value={form.state ?? ""} onChange={(v) => setForm({ ...form, state: v })} />
          <Text
            label="Latitude"
            value={String(form.latitude)}
            onChange={(v) => setForm({ ...form, latitude: Number(v) || 0 })}
          />
          <Text
            label="Longitude"
            value={String(form.longitude)}
            onChange={(v) => setForm({ ...form, longitude: Number(v) || 0 })}
          />
        </div>

        <Button variant="outline" size="sm" className="mt-3" onClick={useGps}>
          <Crosshair className="mr-2 h-4 w-4" /> Use current GPS location
        </Button>

        <div className="mt-4 space-y-1.5">
          <Label className="label-mono">Base address</Label>
          <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>

        <div className="mt-4 space-y-1.5">
          <Label className="label-mono">Capabilities</Label>
          <div className="flex flex-wrap gap-2">
            {CAPABILITIES.map((c) => {
              const on = form.capabilities.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      capabilities: on
                        ? form.capabilities.filter((x) => x !== c)
                        : [...form.capabilities, c],
                    })
                  }
                  className={`rounded border px-2.5 py-1 text-xs transition-colors ${
                    on
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label className="label-mono">Notes</Label>
          <Textarea
            rows={3}
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {agency ? "Save changes" : "Submit for verification"}
          </Button>
          {agency && (
            <div className="flex items-center gap-2">
              <span className="label-mono">Status</span>
              <Select
                value={agency.availability}
                onValueChange={(v) => setAvailability.mutate(v as "available")}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="on_mission">On mission</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </section>

      <ResourcesPanel agencyId={agency?.id ?? null} />
    </div>
  );
}

function ResourcesPanel({ agencyId }: { agencyId: string | null }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>(RESOURCE_KINDS[0]);
  const [quantity, setQuantity] = useState("1");

  const { data: resources } = useQuery({
    queryKey: ["resources", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("agency_id", agencyId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (name.trim().length < 2) throw new Error("Resource name required");
      const { error } = await supabase.from("resources").insert({
        agency_id: agencyId!,
        name: name.trim().slice(0, 100),
        kind,
        quantity: Math.max(1, Number(quantity) || 1),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("resources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resources"] }),
  });

  const grouped = useMemo(() => resources ?? [], [resources]);

  return (
    <section className="panel h-fit p-5">
      <h2 className="text-lg font-bold">Deployable resources</h2>
      <p className="text-sm text-muted-foreground">
        Ambulances, boats, teams and machinery available for tasking.
      </p>

      {!agencyId ? (
        <p className="mt-4 rounded border border-dashed border-border p-4 text-sm text-muted-foreground">
          Register your agency first to add resources.
        </p>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            <Input placeholder="e.g. ALS Ambulance KA-01" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex gap-2">
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="w-20"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                aria-label="Quantity"
              />
              <Button onClick={() => add.mutate()} disabled={add.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {grouped.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded border border-border p-2.5">
                <div className="flex-1">
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.kind} · qty {r.quantity}
                  </p>
                </div>
                <Badge variant={r.status === "available" ? "secondary" : "default"}>
                  {r.status === "on_mission" ? "On mission" : r.status}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
            {grouped.length === 0 && (
              <li className="text-sm text-muted-foreground">No resources listed yet.</li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}

function Text({
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
