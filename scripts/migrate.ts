import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString, { prepare: false });

async function migrate() {
  console.log("Running migration...");

  await sql`
    DO $$ BEGIN
      CREATE TYPE order_status AS ENUM ('draft', 'sent', 'approved', 'rejected', 'cancelled');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      brand VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      image_url VARCHAR(500),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS companies (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      monthly_budget NUMERIC(10, 2) NOT NULL,
      supervisor_id UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      company_id UUID NOT NULL REFERENCES companies(id),
      supervisor_id UUID NOT NULL REFERENCES users(id),
      status order_status NOT NULL DEFAULT 'draft',
      total NUMERIC(10, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id),
      name_snapshot VARCHAR(255) NOT NULL,
      brand_snapshot VARCHAR(255) NOT NULL,
      price_snapshot NUMERIC(10, 2) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1
    )
  `;

  console.log("Migration complete!");
  await sql.end();
}

migrate().catch(console.error);
