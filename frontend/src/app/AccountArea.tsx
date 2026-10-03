"use client";

import Providers from "./providers";
import ConnectButton from "./ConnectButton";

/** The wallet stack and the account button, as one lazily loaded unit (see AccountDock). */
export default function AccountArea({ openOnMount }: { openOnMount: boolean }) {
  return (
    <Providers>
      <ConnectButton openOnMount={openOnMount} />
    </Providers>
  );
}
