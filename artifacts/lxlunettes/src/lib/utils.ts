import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const BRAND_LOGOS: Record<string, string> = {
  'MIU MIU': 'MiuMiu.svg',
  'CARTIER': 'Cartier.svg',
  'CELINE': 'Celine.svg',
  'LOEWE': 'Loewe.svg',
  'STEPPER': 'stepper.svg',
  'RAY.BAN': 'rayban-wordmark.svg',
  'RAY-BAN': 'rayban-wordmark.svg',
  'CHANEL': 'chanel.svg',
  'FENDI': 'Fendi.svg',
  'GUCCI': 'Gucci.svg',
  'SALVATORE FERRAGAMO': 'salvatore-ferragamo.svg',
  'SALVATORE FERRAGAM': 'salvatore-ferragamo.svg',
  'CARRERA': 'carrera.svg',
  'DOLCE & GABBANA': 'dolce-gabbana.svg',
  'FERRARI': 'ferrari-wordmark.svg',
  'GIORGIO ARMANI': 'giorgio&armani.svg',
  'PRADA': 'prada-wordmark.svg',
  'MONT BLANC': 'montblanc-wordmark.svg',
  'LOUIS VUITTON': 'Louis-vuitton.svg',
  'DIOR': 'Christian-Dior.svg',
  'MOSCOT': 'Moscot.svg',
  'OFF-WHITE TM': 'Off-White.svg',
  'OFF-WHITE': 'Off-White.svg',
  'TIFFANY & CO.': 'Tiffany-Co.svg',
  'SAINT LAURENT': 'saint-laurent-wordmark.svg',
  'EYEWEAR BY DAVID BECKHAM': 'Eyewear-by-David-Beckham_DB.svg'
};

export function getBrandLogo(name: string) {
  if (!name) return null;
  return BRAND_LOGOS[name.toUpperCase()] || null;
}
