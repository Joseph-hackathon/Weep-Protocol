import Image from "next/image";
import Link from "next/link";
import { BrandLink } from "./Brand";
import SiteFooter from "./SiteFooter";
import { ROLES, type RoleId } from "./roles";

/**
 * Where each chooser card lands. Same shell as the landing (header, void, footer) so the move feels
 * like one product. The body is a holding state until this space is designed — honest, not a dead end:
 * it names the space and offers the way back.
 */
export default function RolePage({ role }: { role: RoleId }) {
  const r = ROLES.find((x) => x.id === role)!;
  return (
    <>
      <div className="void" aria-hidden>
        <div className="void-glow void-glow-a" />
        <div className="void-glow void-glow-b" />
        <div className="void-glow void-glow-c" />
        <div className="void-grain" />
      </div>

      <header className="site-header">
        <div className="page site-header-row">
          <BrandLink priority />
        </div>
      </header>

      <main className="site-main hero">
        <div className="page role-page">
          <div className="role-page-photo">
            <Image src={r.img} alt="" fill sizes="120px" priority />
          </div>
          <h1 className="role-page-title">{r.title}</h1>
          <p className="role-page-line">{r.line}</p>
          <p className="role-page-note">This space is being designed next.</p>
          <Link href="/start" className="btn-secondary role-page-back">Choose another</Link>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
