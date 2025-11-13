import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ✅ V2 Phase 2.9 : Génération automatique des relances
// S'exécute tous les jours à 4h du matin (Europe/Paris)
// Délègue toute la logique à reminders.generateDailyReminders
crons.daily(
  "daily reminder generation",
  { hourUTC: 3, minuteUTC: 0 }, // 3h UTC = 4h Europe/Paris (hiver) / 5h (été)
  internal.reminders.generateDailyReminders,
  { generatedByCron: true } // Marquer comme généré par le cron
);

export default crons;
