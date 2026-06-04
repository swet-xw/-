"use client";

import { PlatformNav } from "./platform-nav";
import { SettingsModal } from "./settings-modal";

export function SettingsPage() {
  return (
    <main className="cnShell">
      <PlatformNav active="settings" />
      <section className="settingsBackdrop">
        <SettingsModal />
      </section>
    </main>
  );
}
