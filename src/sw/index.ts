import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

// Service worker global scope
declare let self: Window & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: (self as unknown as { __SW_MANIFEST: string[] }).__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
