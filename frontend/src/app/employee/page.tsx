import type { Metadata } from "next";
import RolePage from "../RolePage";

export const metadata: Metadata = { title: "Employee Dashboard · Weep" };

export default function Page() {
  return <RolePage role="employee" />;
}
