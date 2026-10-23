/** SPDX-License-Identifier: GPL-3.0-or-later
 * Minimal read-only window onto the D_AI service. No credentials or mutations.
 */
import { createResource, createSignal, For, Show } from "solid-js"
import type { ElectronAPI } from "./api-types"

export function DaiDesktopPanel(props: { api: ElectronAPI }) {
  const [opened, setOpened] = createSignal(false)
  const [selectedProject, setSelectedProject] = createSignal("")
  const [status, { refetch: refreshStatus }] = createResource(() => props.api.daiDesktopStatus())
  const [systems, { refetch: refreshSystems }] = createResource(
    opened, (active) => active ? props.api.daiDesktopSystems() : Promise.resolve([]),
  )
  const [projects, { refetch: refreshProjects }] = createResource(
    opened, (active) => active ? props.api.daiDesktopProjects() : Promise.resolve([]),
  )
  const [missions, { refetch: refreshMissions }] = createResource(
    selectedProject, (projectId) => projectId ? props.api.daiDesktopMissions(projectId) : Promise.resolve([]),
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
    const next = !opened()
    setOpened(next)
    if (!next) setSelectedProject("")
    void refreshStatus()
  }
  const refresh = () => {
    void refreshStatus()
    if (opened()) {
      void refreshSystems()
      void refreshProjects()
      if (selectedProject()) void refreshMissions()
    }
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
            <div class="mt-5 border-t border-border-base pt-3">
              <h3 class="text-sm font-semibold">Projects and missions</h3>
              <p class="mt-1 text-xs text-text-weak">
                Read-only project summaries. Evidence files and approval actions are not exposed.
              </p>
              <Show when={projects.error}>
                <p class="mt-2 text-xs text-text-weak" role="status">Project catalog is not available.</p>
              </Show>
              <Show when={(projects() || []).length > 0} fallback={
                <p class="mt-2 text-xs text-text-weak">No accessible projects or the mission service is unavailable.</p>
              }>
                <label class="mt-3 block text-xs text-text-weak" for="dai-project-select">
                  Project
                </label>
                <select
                  id="dai-project-select" value={selectedProject()}
                  class="mt-1 w-full rounded-md border border-border-base bg-background-base p-2 text-sm"
                  onChange={(event) => setSelectedProject(event.currentTarget.value)}
                >
                  <option value="">Select a project</option>
                  <For each={projects() || []}>
                    {(project) => <option value={project.id}>{project.name}</option>}
                  </For>
                </select>
              </Show>
              <Show when={selectedProject()}>
                <Show when={missions.loading}>
                  <p class="mt-3 text-xs text-text-weak">Reading missions…</p>
                </Show>
                <Show when={missions.error}>
                  <p class="mt-3 text-xs text-text-weak" role="status">Mission data is not available.</p>
                </Show>
                <ul class="mt-3 space-y-2" aria-label="D_AI project missions">
                  <For each={missions() || []}>
                    {(mission) => (
                      <li class="rounded-lg border border-border-base p-2">
                        <div class="flex justify-between gap-2">
                          <span class="text-sm font-medium">{mission.system}</span>
                          <span class="text-xs text-text-weak">{mission.status}</span>
                        </div>
                        <p class="mt-1 text-xs">{mission.objective}</p>
                        <p class="mt-1 text-xs text-text-weak">Next: {mission.next_action}</p>
                        <p class="mt-1 text-xs text-text-weak">Version {mission.version}</p>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </div>
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
