/**
 * The ways into Weep. Two sides share the same three slots: the business side (a merchant runs the team, an
 * employee sees their tips, a customer tips the team) and its personal twin for individuals (send, see your
 * money, tip). One list feeds the chooser cards, so the two sides can't drift apart.
 */
export type RoleId = "merchant" | "employee" | "customer"; // the slot; also the flower petal that flies into it
export type Side = "individual" | "business";

type Card = { href: string; title: string; line: string; chip: string };
/** `chip`: a small live detail on each card's photo, straight from the product (DOCS.md §3–4). */
export const ROLES: { id: RoleId; img: string; individual: Card; business: Card }[] = [
  {
    id: "merchant", img: "/hero/kitchen.jpg",
    individual: { href: "/send", title: "Send", line: "Say who gets what in plain words. Weep lays it out; you send it.", chip: "“$60 to Sam and Ama”" },
    business: { href: "/merchant", title: "Merchant Portal", line: "Set the tip rules once. Your team gets paid automatically.", chip: "70% floor · 30% kitchen" },
  },
  {
    id: "employee", img: "/hero/bartender.jpg",
    individual: { href: "/money", title: "My money", line: "Everything you've received: how much, from whom, and when.", chip: "just now" },
    business: { href: "/employee", title: "Employee Dashboard", line: "See every tip you've earned, the moment it lands.", chip: "just now" },
  },
  {
    id: "customer", img: "/hero/bar.jpg",
    individual: { href: "/tip", title: "Tip", line: "Scan a code, choose an amount, see exactly who it reaches.", chip: "Shared 3 ways" },
    business: { href: "/customer", title: "Customer", line: "Thank the people who served you, in seconds.", chip: "Shared 3 ways" },
  },
];

export const SIDES: { id: Side; label: string; sub: string }[] = [
  { id: "individual", label: "Individual", sub: "Send, receive and tip, in seconds." },
  { id: "business", label: "Business", sub: "Pick one. You can switch anytime." },
];
