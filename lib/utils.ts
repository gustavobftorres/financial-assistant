import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatCurrencyInput(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function parseCurrencyInput(value: string): number {
  const v = value.trim()
  if (!v) return 0

  // Brazilian format: comma as decimal separator (120,50 = 120.50)
  if (v.includes(",")) {
    const [intStr, decStr] = v.split(",")
    const intPart = (intStr ?? "").replace(/\./g, "").replace(/\D/g, "") || "0"
    const decPart = (decStr ?? "").replace(/\D/g, "").slice(0, 2).padEnd(2, "0")
    return Number(intPart + "." + decPart)
  }

  // No decimal separator: integer (120 = 120, 1.234 = 1234)
  const digits = v.replace(/\./g, "").replace(/\D/g, "")
  return digits ? Number(digits) : 0
}

export function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}
