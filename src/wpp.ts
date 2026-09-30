// wa-js has no ES exports: importing it runs the bundle, which sets self.WPP.
import "@wppconnect/wa-js";

export const WPP = (self as unknown as { WPP: typeof import("@wppconnect/wa-js") }).WPP;

WPP.config.disableGoogleAnalytics = true