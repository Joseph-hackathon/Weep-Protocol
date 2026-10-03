import type { Metadata } from "next";
import RolePage from "../RolePage";

export const metadata: Metadata = { title: "Merchant Portal · Weep" };

export default function Page() {
  return <RolePage role="merchant" />;
}
