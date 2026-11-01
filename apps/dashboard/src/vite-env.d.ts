/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The Zahln server for this deployment; https only, else dev.zahln.de. */
  readonly VITE_ZAHLN_BASE_URL?: string;
}
