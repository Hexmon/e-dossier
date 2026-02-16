import "dotenv/config";
import { db } from "../app/db/client";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Truncating site_history...");
    await db.execute(sql`TRUNCATE TABLE site_history CASCADE;`);
    console.log("Done.");
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
