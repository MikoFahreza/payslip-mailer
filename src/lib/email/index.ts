import { EmailProvider } from "./types";
import { GmailProvider } from "./gmail-provider";
import { SimulateProvider } from "./simulate-provider";

let defaultProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (defaultProvider) {
    return defaultProvider;
  }

  const mode = process.env.EMAIL_MODE?.toLowerCase();

  if (mode === "live") {
    defaultProvider = new GmailProvider();
    return defaultProvider;
  }

  // Default to SimulateProvider for dev/testing/safe mode
  defaultProvider = new SimulateProvider();
  return defaultProvider;
}

// Allow overriding for tests
export function setEmailProvider(provider: EmailProvider | null) {
  defaultProvider = provider;
}
