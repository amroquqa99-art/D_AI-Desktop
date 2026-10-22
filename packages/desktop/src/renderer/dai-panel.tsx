/** SPDX-License-Identifier: GPL-3.0-or-later
 * Minimal read-only window onto the D_AI service. No credentials or mutations.
 */
import { createResource, createSignal, For, Show } from "solid-js"
import type { ElectronAPI } from "./api-types"

export function DaiDesktopPanel(props: { api: ElectronAPI }) {
  const [opened, setOpened] = createSignal(false)
  const [status, { refetch: refreshStatus }] = createResource(() => props.api.daiDesktopStatus())
  const [systems, { refetch: refreshSystems }] = createResource(
    opened, (active) => active ? props.api.daiDesktopSystems() : Promise.resolve([]),
  )
  const stateText = () => {
    const state = status()?.state
    if (state === "connected") return "Connected"
    if (state === "starting") return "Connecting"
    if (state === "disabled") return "Not configured"
    if (state === "unavailable") return "Unavailable"
    return "Checking"
  }
  const toggle = () => {
    setOpened(!opened())
    void refreshStatus()
  }
  const refresh = () => {
    void refreshStatus()
    if (opened()) void refreshSystems()
  }

  return (
    <div class="fixed bottom-4 right-4 z-[95] flex flex-col items-end gap-2" data-component="dai-desktop">
      <Show when={opened()}>
        <section
          class="w-[min(24rem,calc(100vw-2rem))] max-h-[min(68vh,34rem)] overflow-y-auto rounded-xl border border-border-base bg-background-base p-4 shadow-2xl text-text-base"
          aria-label="D_AI systems panel"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold">D_AI OS</h2>
              <p class="text-xs text-text-weak">{stateText()}</p>
            </div>
            <button type="button" class="rounded-md border border-border-base px-3 py-1 text-xs" onClick={refresh}>
              Refresh
            </button>
          </div>
          <p class="mt-3 text-xs text-text-weak">
            Read-only integration. Execution and approvals are not connected yet.
          </p>
          <Show when={status()?.state === "connected"} fallback={
            <p class="mt-4 text-sm text-text-weak">
              Set DAI_DESKTOP_BRIDGE_PYTHON in the desktop environment to connect D_AI Core.
            </p>
          }>
            <div class="mt-3 flex justify-between text-xs text-text-weak">
              <span>Core {status()?.version || "unknown"}</span>
              <span>{(systems() || []).length} systems</span>
            </div>
            <ul class="mt-3 space-y-2">
              <For each={systems() || []}>
                {(system) => (
                  <li class="rounded-lg border border-border-base p-2">
                    <div class="flex justify-between gap-2">
                      <span class="text-sm font-medium">{system.id}</span>
                      <span class="text-xs text-text-weak">{system.maturity}</span>
                    </div>
                    <p class="mt-1 text-xs text-text-weak">{system.roles.join(" · ")}</p>
                    <p class="mt-1 text-xs text-text-weak">Validation: {system.professional_validation}</p>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </section>
      </Show>
      <button
        type="button" aria-expanded={opened()} aria-label="Toggle D_AI systems panel"
        onClick={toggle}
        class="rounded-xl border border-border-base bg-background-base px-4 py-2 text-sm font-semibold shadow-lg"
      >
        D_AI · {stateText()}
      </button>
    </div>
  )
}
