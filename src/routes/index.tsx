import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Ambulance, Map, Radar, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SahayGrid | National Rescue Agency Coordination Grid" },
      {
        name: "description",
        content:
          "A central registry and live map for rescue agencies during natural and man-made disasters: verified agencies, incident reporting, resource tracking and command dashboard.",
      },
      { property: "og:title", content: "SahayGrid | National Rescue Agency Coordination Grid" },
      {
        property: "og:description",
        content:
          "Register rescue agencies, map live incidents, coordinate ambulances, boats and teams from one command dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Registration & verification",
    body: "Agencies register location, type, capabilities, personnel and resources. Command staff verify before activation.",
  },
  {
    icon: Map,
    title: "Live agency & incident map",
    body: "Every verified agency and active disaster on one map, filtered by type, distance, availability and capability.",
  },
  {
    icon: AlertTriangle,
    title: "Emergency reporting",
    body: "Report an incident with GPS location, disaster type, severity and people affected. Track it to resolution.",
  },
  {
    icon: Ambulance,
    title: "Resource coordination",
    body: "Ambulances, boats, rescue and medical teams tracked live. A committed resource can never be double-assigned.",
  },
  {
    icon: Users,
    title: "Inter-agency alerts",
    body: "Broadcast or direct assistance requests between agencies attached to a live incident.",
  },
  {
    icon: Radar,
    title: "Central command dashboard",
    body: "Active emergencies, agency posture and mission status in a single operational picture.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-primary" />
            <span className="font-display text-sm font-bold tracking-wide">
              SAHAY<span className="text-primary">GRID</span>
            </span>
          </div>
          <Button asChild size="sm">
            <Link to="/auth">Agency login</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <p className="label-mono">Ministry of Home Affairs · Disaster Management</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
          One grid for every rescue agency in the country.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          A central, access-controlled registry where rescue agencies publish their location,
          capabilities and resources — and see each other live during natural or man-made
          calamities.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Register your agency</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">Open command dashboard</Link>
          </Button>
        </div>
      </section>

      <section className="border-t border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-px bg-border px-0 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="bg-background p-6">
              <f.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 text-base font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        Access restricted to registered agencies and authorised command staff.
      </footer>
    </div>
  );
}
