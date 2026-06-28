import { randomUUID } from "crypto";

export function generateReference(): string {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  
  return `HFI-${yyyy}${mm}${dd}-${randomUUID().slice(0, 8).toUpperCase()}`;
}
