import postgres from "postgres";
import { hashSync } from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString, { prepare: false });

async function seed() {
  console.log("Seeding database...");

  // Create Admin user
  const adminPassword = hashSync("admin123", 10);
  const [admin] = await sql`
    INSERT INTO users (name, email, password, role)
    VALUES ('Admin Principal', 'admin@kiway.com', ${adminPassword}, 2)
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;

  // Create Supervisor user
  const supervisorPassword = hashSync("super123", 10);
  const [supervisor] = await sql`
    INSERT INTO users (name, email, password, role)
    VALUES ('Carlos Supervisor', 'supervisor@kiway.com', ${supervisorPassword}, 1)
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;

  console.log("Users created:", { admin: admin.id, supervisor: supervisor.id });

  // Create Companies
  const [company1] = await sql`
    INSERT INTO companies (name, monthly_budget, supervisor_id)
    VALUES ('Edificio Central S.A.', 150000, ${supervisor.id})
    ON CONFLICT DO NOTHING
    RETURNING id
  `;

  const [company2] = await sql`
    INSERT INTO companies (name, monthly_budget, supervisor_id)
    VALUES ('Torre Norte Ltda.', 80000, ${supervisor.id})
    ON CONFLICT DO NOTHING
    RETURNING id
  `;

  console.log("Companies created:", { company1: company1?.id, company2: company2?.id });

  // Create Products
  await sql`
    INSERT INTO products (name, brand, category, price)
    VALUES 
      ('Detergente Multiuso 5L', 'CleanPro', 'Limpieza General', 2500),
      ('Lavandina Concentrada 2L', 'PureClean', 'Desinfeccion', 1200),
      ('Bolsas Residuos 50u', 'EcoBag', 'Residuos', 1800),
      ('Jabon Liquido 5L', 'CleanPro', 'Higiene Personal', 3200),
      ('Cera para Pisos 5L', 'BrilloPiso', 'Pisos', 4500)
    ON CONFLICT DO NOTHING
  `;

  console.log("Products created!");
  console.log("\nSeed complete!");
  console.log("Admin: admin@kiway.com / admin123");
  console.log("Supervisor: supervisor@kiway.com / super123");

  await sql.end();
}

seed().catch(console.error);
