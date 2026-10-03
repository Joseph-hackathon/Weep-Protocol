/** The three ways into Weep. One list feeds the chooser cards and the role pages, so they can't drift. */
export type RoleId = "merchant" | "employee" | "customer";

/** `chip`: a small live detail on each card, straight from the product (DOCS.md §3–4). */
export const ROLES: { id: RoleId; href: `/${RoleId}`; title: string; line: string; img: string; chip: string }[] = [
  { id: "merchant", href: "/merchant", title: "Merchant Portal", line: "Set the tip rules once. Your team gets paid automatically.", img: "/hero/kitchen.jpg", chip: "70% floor · 30% kitchen" },
  { id: "employee", href: "/employee", title: "Employee Dashboard", line: "See every tip you've earned, the moment it lands.", img: "/hero/bartender.jpg", chip: "just now" },
  { id: "customer", href: "/customer", title: "Customer", line: "Thank the people who served you, in seconds.", img: "/hero/bar.jpg", chip: "Shared 3 ways" },
];
