/**
 * Seeds the players table from public/players.json (written by
 * scripts/import-players.ts) using parameterized batched inserts over the
 * Neon HTTP driver. Run with: npm run db:seed-players
 */
import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

type EligiblePlayer = {
  id: string;
  fullName: string;
  team: string | null;
  position: string;
  searchName: string;
};

const BATCH_SIZE = 200;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const sql = neon(url);

  const players: EligiblePlayer[] = JSON.parse(readFileSync("public/players.json", "utf-8"));

  for (let i = 0; i < players.length; i += BATCH_SIZE) {
    const batch = players.slice(i, i + BATCH_SIZE);
    const values: string[] = [];
    const params: unknown[] = [];

    batch.forEach((p, idx) => {
      const base = idx * 5;
      values.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, true, $${base + 5})`,
      );
      params.push(p.id, p.fullName, p.team, p.position, p.searchName);
    });

    const text = `
      INSERT INTO players (id, full_name, team, position, active, search_name)
      VALUES ${values.join(", ")}
      ON CONFLICT (id) DO UPDATE SET
        full_name = excluded.full_name,
        team = excluded.team,
        position = excluded.position,
        active = excluded.active,
        search_name = excluded.search_name;
    `;
    await sql.query(text, params);
    console.log(`Seeded ${Math.min(i + BATCH_SIZE, players.length)}/${players.length}`);
  }

  const rows = await sql.query("select count(*)::int as count from players");
  console.log(`players table now has ${(rows[0] as { count: number }).count} rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
