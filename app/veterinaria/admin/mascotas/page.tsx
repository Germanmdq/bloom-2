"use client";
import { Suspense, useState } from "react";
import { Cake, PawPrint } from "lucide-react";
import type { Pet, Species } from "@/lib/vet/types";
import { ageFromBirthDate } from "@/lib/vet/domain/dates";
import { formatDate, uid } from "@/lib/vet/domain/format";
import { PET_SPECIES, SPECIES_META } from "@/lib/vet/domain/labels";
import { upcomingBirthdays } from "@/lib/vet/domain/automations";
import { useCollection } from "@/lib/vet/client/store";
import { CrudSection } from "@/components/veterinaria/admin/CrudSection";
import { Chips, PageHeader, Panel } from "@/components/veterinaria/admin/ui";
import { RequirePermission } from "@/components/veterinaria/admin/AdminShell";
import { Badge } from "@/components/veterinaria/ui/primitives";

export default function MascotasAdmin() {
  const customers = useCollection("customers");
  const pets = useCollection("pets");
  const [species, setSpecies] = useState<Species | "todas">("todas");
  const owner = (id: string) => customers.items.find((c) => c.id === id);
  const birthdays = upcomingBirthdays(pets.items, new Date(), 30);

  return (
    <RequirePermission perm="pets.manage">
      <PageHeader title="Mascotas" subtitle={`${pets.items.length} mascotas registradas`} />
      {birthdays.length > 0 && (
        <Panel title="🎂 Próximos cumpleaños (30 días)" className="mb-4">
          <div className="vet-scroll-x -mx-1 flex gap-2 overflow-x-auto px-1">
            {birthdays.map(({ pet, inDays }) => (
              <div key={pet.id} className="shrink-0 rounded-2xl bg-[#fdf0f3] px-3 py-2 text-sm">
                <p className="font-bold">{SPECIES_META[pet.species].emoji} {pet.name}</p>
                <p className="text-xs text-neutral-600">{inDays === 0 ? "¡Hoy!" : `en ${inDays} días`} · {owner(pet.customerId)?.name ?? ""}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <div className="mb-4">
        <Chips label="Especie" value={species} onChange={setSpecies} options={[{ value: "todas", label: "Todas", count: pets.items.length }, ...PET_SPECIES.filter((s) => pets.items.some((p) => p.species === s)).map((s) => ({ value: s, label: SPECIES_META[s].plural, count: pets.items.filter((p) => p.species === s).length }))]} />
      </div>
      <Suspense>
        <CrudSection<"pets">
          collection="pets"
          newLabel="Nueva mascota"
          emptyIcon={<PawPrint className="size-6" />}
          filter={(p) => species === "todas" || p.species === species}
          sort={(a, b) => a.name.localeCompare(b.name, "es")}
          blank={(): Pet => ({ id: uid("p_"), customerId: customers.items[0]?.id ?? "", name: "", species: "perro", sex: "desconocido", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })}
          validate={(p) => (!p.name.trim() ? "Ingresá el nombre" : !p.customerId ? "Elegí el dueño/a" : null)}
          beforeSave={(p) => ({ ...p, updatedAt: new Date().toISOString() })}
          fields={[
            { key: "name", label: "Nombre", type: "text", required: true },
            { key: "customerId", label: "Dueño/a", type: "select", options: customers.items.map((c) => ({ value: c.id, label: `${c.name} · ${c.phone}` })) },
            { key: "species", label: "Especie", type: "select", options: PET_SPECIES.map((s) => ({ value: s, label: SPECIES_META[s].label })) },
            { key: "breed", label: "Raza", type: "text" },
            { key: "sex", label: "Sexo", type: "select", options: [{ value: "macho", label: "Macho" }, { value: "hembra", label: "Hembra" }, { value: "desconocido", label: "Sin dato" }] },
            { key: "birthDate", label: "Fecha de nacimiento", type: "date", hint: "Activa el saludo de cumpleaños" },
            { key: "weightKg", label: "Peso (kg)", type: "number", nullable: true, step: 0.1 },
            { key: "notes", label: "Observaciones (alergias, temperamento, cuidados)", type: "textarea" },
          ]}
          row={(p) => {
            const age = ageFromBirthDate(p.birthDate, new Date()) ?? p.approxAgeYears;
            return {
              title: <span>{SPECIES_META[p.species].emoji} {p.name}</span>,
              subtitle: [p.breed, age != null ? `${age} años` : null, p.weightKg ? `${p.weightKg} kg` : null, owner(p.customerId)?.name].filter(Boolean).join(" · "),
              badges: p.birthDate ? <Badge tone="pink"><Cake className="size-3" /> {formatDate(p.birthDate, { day: "numeric", month: "short" })}</Badge> : undefined,
            };
          }}
        />
      </Suspense>
      <p className="mt-4 text-xs text-neutral-500">Preparado para sumar historia clínica: vacunas, turnos, baños y peluquería por mascota.</p>
    </RequirePermission>
  );
}
