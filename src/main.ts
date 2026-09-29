// Page world (manifest "world": "MAIN"), where wa-js can reach WhatsApp's internals.
import { startAutorespond } from "./autorespond";
import { startScheduler } from "./scheduler";

startAutorespond();
startScheduler();
