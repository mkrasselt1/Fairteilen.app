export type Category = { id: string; label: string; icon: string; group: string };

export const CATEGORIES: Category[] = [
  { id: "general", label: "Allgemein", icon: "🧾", group: "Allgemein" },
  { id: "groceries", label: "Lebensmittel", icon: "🛒", group: "Essen & Trinken" },
  { id: "restaurant", label: "Restaurant", icon: "🍽️", group: "Essen & Trinken" },
  { id: "drinks", label: "Getränke & Bar", icon: "🍻", group: "Essen & Trinken" },
  { id: "rent", label: "Miete", icon: "🏠", group: "Wohnen" },
  { id: "utilities", label: "Nebenkosten", icon: "💡", group: "Wohnen" },
  { id: "internet", label: "Internet & Telefon", icon: "📶", group: "Wohnen" },
  { id: "household", label: "Haushalt", icon: "🧹", group: "Wohnen" },
  { id: "furniture", label: "Möbel", icon: "🛋️", group: "Wohnen" },
  { id: "fuel", label: "Tanken", icon: "⛽", group: "Unterwegs" },
  { id: "publictransport", label: "Bus & Bahn", icon: "🚆", group: "Unterwegs" },
  { id: "taxi", label: "Taxi", icon: "🚕", group: "Unterwegs" },
  { id: "flight", label: "Flug", icon: "✈️", group: "Unterwegs" },
  { id: "parking", label: "Parken & Maut", icon: "🅿️", group: "Unterwegs" },
  { id: "hotel", label: "Unterkunft", icon: "🏨", group: "Reise" },
  { id: "activities", label: "Aktivitäten", icon: "🎟️", group: "Reise" },
  { id: "entertainment", label: "Unterhaltung", icon: "🎬", group: "Freizeit" },
  { id: "sports", label: "Sport", icon: "⚽", group: "Freizeit" },
  { id: "gifts", label: "Geschenke", icon: "🎁", group: "Freizeit" },
  { id: "shopping", label: "Einkaufen", icon: "🛍️", group: "Sonstiges" },
  { id: "health", label: "Gesundheit", icon: "💊", group: "Sonstiges" },
  { id: "insurance", label: "Versicherung", icon: "🛡️", group: "Sonstiges" },
  { id: "education", label: "Bildung", icon: "📚", group: "Sonstiges" },
  { id: "pets", label: "Haustiere", icon: "🐾", group: "Sonstiges" },
  { id: "childcare", label: "Kinder", icon: "🧸", group: "Sonstiges" },
  { id: "payment", label: "Zahlung", icon: "💸", group: "Sonstiges" },
];

export function categoryOf(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export const CATEGORY_GROUPS = [...new Set(CATEGORIES.map((c) => c.group))];

export const GROUP_TYPES = [
  { id: "trip", label: "Reise", icon: "🏝️" },
  { id: "home", label: "WG / Zuhause", icon: "🏡" },
  { id: "couple", label: "Paar", icon: "❤️" },
  { id: "event", label: "Veranstaltung", icon: "🎉" },
  { id: "project", label: "Projekt", icon: "📁" },
  { id: "other", label: "Sonstiges", icon: "👥" },
];

export function groupTypeOf(id: string) {
  return GROUP_TYPES.find((t) => t.id === id) ?? GROUP_TYPES[GROUP_TYPES.length - 1];
}
