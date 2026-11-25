import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

function getRuntimeConnectionString(value: string) {
  const url = new URL(value);
  if (url.hostname.endsWith(".alwaysdata.net")) {
    url.port = "5433";
  }
  return url.toString();
}

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const client =
  globalForDb.conn ??
  postgres(getRuntimeConnectionString(connectionString), {
    prepare: false,
    max: 1,
    idle_timeout: 5,       // Cierra conexiones idle a los 5 segundos
    max_lifetime: 60 * 5,  // Recicla la conexión cada 5 minutos
    connect_timeout: 10,
  });

globalForDb.conn = client;

export const db = drizzle(client, { schema });
