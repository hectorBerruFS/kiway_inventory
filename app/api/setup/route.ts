import { NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import postgres from "postgres";

export async function POST() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }

  const sql = postgres(connectionString, { prepare: false });

  try {
    // Create enum
    await sql`
      DO $$ BEGIN
        CREATE TYPE order_status AS ENUM ('draft', 'sent', 'approved', 'rejected', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    // Create tables
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
        intended_month VARCHAR(7),
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

    await sql`
      CREATE TABLE IF NOT EXISTS remitos (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
        internal_number INTEGER GENERATED ALWAYS AS IDENTITY,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_remitos_number ON remitos(internal_number)
    `;

    // Seed data
    const adminPassword = hashSync("admin123", 10);
    const [admin] = await sql`
      INSERT INTO users (name, email, password, role)
      VALUES ('Admin Principal', 'admin@kiway.com', ${adminPassword}, 2)
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;

    const supervisorPassword = hashSync("super123", 10);
    const [supervisor] = await sql`
      INSERT INTO users (name, email, password, role)
      VALUES ('Carlos Supervisor', 'supervisor@kiway.com', ${supervisorPassword}, 1)
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;

    // Check if companies exist
    const existingCompanies = await sql`SELECT id FROM companies LIMIT 1`;
    if (existingCompanies.length === 0) {
      await sql`
        INSERT INTO companies (name, monthly_budget, supervisor_id)
        VALUES 
          ('Edificio Central S.A.', 150000, ${supervisor.id}),
          ('Torre Norte Ltda.', 80000, ${supervisor.id})
      `;
    }

    // Check if products exist
    const existingProducts = await sql`SELECT id FROM products LIMIT 1`;
    if (existingProducts.length === 0) {
      await sql`
        INSERT INTO products (name, brand, category, price)
        VALUES 
          ('Detergente Multiuso 5L', 'CleanPro', 'Limpieza General', 2500),
          ('Lavandina Concentrada 2L', 'PureClean', 'Desinfeccion', 1200),
          ('Bolsas Residuos 50u', 'EcoBag', 'Residuos', 1800),
          ('Jabon Liquido 5L', 'CleanPro', 'Higiene Personal', 3200),
          ('Cera para Pisos 5L', 'BrilloPiso', 'Pisos', 4500)
      `;
    }

    await sql.end();

    return NextResponse.json({
      success: true,
      message: "Base de datos inicializada correctamente",
      credentials: {
        admin: "admin@kiway.com / admin123",
        supervisor: "supervisor@kiway.com / super123",
      },
    });
  } catch (error) {
    await sql.end();
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al configurar la base de datos" },
      { status: 500 }
    );
  }
}
