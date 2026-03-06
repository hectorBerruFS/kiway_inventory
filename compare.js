// compare.js
const bcrypt = require('bcryptjs');
const plain = 'Admin123!'; // la contraseña que pruebas
const hash = '$2a$10$7QJQyS9g7uF5KxYtS7YkAOfw4yLw5mH3z1wPq7FzK6uXcJv8WlY8e';
bcrypt.compare(plain, hash).then(result => {
  console.log('match?', result);
}).catch(console.error);