import { describe, expect, test } from "bun:test"
import { CONSOLE_PROVIDERS, consoleIntegration, providerConnectionTargets } from "./auth-route"
import { dict as english } from "../../runtime/i18n/en"
import { dict as arabic } from "../../runtime/i18n/ar"

describe("D_AI Desktop native OpenCode/provider authentication routing", () => {
  test("account login uses the real OpenCode Console integration for free models", () => {
    expect(CONSOLE_PROVIDERS.has("opencode")).toBe(true)
    expect(providerConnectionTargets("opencode")).toEqual({ signIn: "opencode", apiKey: "opencode" })
  })

  test("OpenCode Go account sign-in is shared but its service-account API key is not lost", () => {
    expect(CONSOLE_PROVIDERS.has("opencode-go")).toBe(true)
    expect(providerConnectionTargets("opencode-go")).toEqual({
      signIn: "opencode",
      apiKey: "opencode-go",
    })
  })

  test("third-party subscription logins and API providers are not rewritten as OpenCode", () => {
    for (const id of ["openai", "anthropic", "google", "openrouter", "github-copilot", "ollama"]) {
      expect(consoleIntegration(id)).toBe(id)
      expect(providerConnectionTargets(id)).toEqual({ signIn: id, apiKey: id })
    }
  })

  test("English and Arabic explain account-based free-tier access and other credentials", () => {
    const keys = ["provider.connect.console.daiFreeAccount", "provider.connect.console.daiOtherProviders"] as const
    for (const key of keys) {
      expect(typeof english[key]).toBe("string")
      expect(english[key].length).toBeGreaterThan(40)
      expect(typeof arabic[key]).toBe("string")
      expect(arabic[key].length).toBeGreaterThan(40)
    }
    expect(english[keys[0]]).toContain("OpenCode")
    expect(arabic[keys[1]]).toContain("API")
  })
})
