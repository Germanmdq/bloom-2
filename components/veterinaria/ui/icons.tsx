/**
 * Íconos por nombre (categorías, servicios). Solo se importan los usados
 * para mantener el bundle chico. Para una categoría nueva, sumar el ícono acá.
 */
import {
  BedDouble,
  Bird,
  Bone,
  Cat,
  Dog,
  Fish,
  Footprints,
  Gift,
  Hand,
  HeartPulse,
  Luggage,
  Package,
  PawPrint,
  Pill,
  Rabbit,
  Scissors,
  Shirt,
  ShowerHead,
  Soup,
  Sparkles,
  Squirrel,
  Stethoscope,
  Syringe,
  Turtle,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { Species } from "@/lib/vet/types";

export const ICONS: Record<string, LucideIcon> = {
  BedDouble, Bird, Bone, Cat, Dog, Fish, Footprints, Gift, Hand, HeartPulse, Luggage, Package, PawPrint, Pill,
  Rabbit, Scissors, Shirt, ShowerHead, Soup, Sparkles, Squirrel, Stethoscope, Syringe, Turtle, Wind,
};

export const ICON_NAMES = Object.keys(ICONS);

export function NamedIcon({ name, className, strokeWidth = 1.75 }: { name: string; className?: string; strokeWidth?: number }) {
  const Icon = ICONS[name] ?? PawPrint;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

export const SPECIES_ICON: Record<Species, LucideIcon> = {
  perro: Dog,
  gato: Cat,
  conejo: Rabbit,
  ave: Bird,
  pequenos: Squirrel,
  peces: Fish,
  reptil: Turtle,
  personas: Gift,
  otro: PawPrint,
};
