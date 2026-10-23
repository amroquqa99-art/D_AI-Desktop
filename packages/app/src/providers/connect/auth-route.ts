/** D_AI Desktop: provider identities stay under the inherited OpenCode authentication system.
 * OpenCode Console sign-in unlocks account-scoped free and hosted models;
 * Go service-account keys retain the Go provider identity. Other subscriptions
 * and provider API credentials must never be remapped into OpenCode Console.
 */
export const CONSOLE_INTEGRATION = "opencode"

export const CONSOLE_PROVIDERS = new Set(["opencode", "opencode-go"])

export function consoleIntegration(provider: string) {
  return CONSOLE_PROVIDERS.has(provider) ? CONSOLE_INTEGRATION : provider
}

export function providerConnectionTargets(provider: string) {
  return { signIn: consoleIntegration(provider), apiKey: provider } as const
}
