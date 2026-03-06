const postgres = require('postgres');
const bcrypt = require('bcryptjs');

async function main() {
  const [,, email, password] = process.argv;
  if (!email || !password) {
    console.error('Uso: node scripts/set-password.js <email> <newPassword>');
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: define la variable de entorno DATABASE_URL');
    process.exit(1);
  }

  const sql = postgres(connectionString, { prepare: false });

  try {
    const hashed = bcrypt.hashSync(password, 10);

    const result = await sql`
      UPDATE users
      SET password = ${hashed}
      WHERE email = ${email}
      RETURNING id, email
    `;

    if (!result || result.length === 0) {
      console.error('Usuario no encontrado:', email);
      process.exitCode = 2;
    } else {
      console.log('Contraseña actualizada para:', result[0].email);
    }
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 3;
  } finally {
    await sql.end();
  }
}

main();
