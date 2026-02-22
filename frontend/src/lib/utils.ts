import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateLocal(isoString: string) {
  if (!isoString) return "--"
  try {
    let safeString = isoString
    // Check if string ends with Z or a timezone offset (e.g., +05:30, -0500)
    // Python isoformat() often returns naive strings "YYYY-MM-DDTHH:MM:SS.mmmmmm" which browsers treat as local time.
    // We strictly check for Z or a timezone offset at the end.
    const hasTimezone = /Z|[+-]\d{2}:?\d{2}(:\d{2})?$/.test(safeString)

    if (!hasTimezone) {
      safeString += "Z"
    }

    // Use a nice format: "Feb 3, 2026, 6:45 PM"
    const date = new Date(safeString)
    if (isNaN(date.getTime())) return isoString

    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hour12: true
    }).format(date)
  } catch (e) {
    return isoString
  }
}

