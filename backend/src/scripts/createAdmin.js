// Usage: node src/scripts/createAdmin.js [username] [email]
// The password is never taken from the command line (it would land in shell history and
// the process list): set ADMIN_PASSWORD, or leave it unset for a hidden interactive prompt.
// Missing username/email are also prompted for.
const readline = require('readline');
const bcrypt = require('bcryptjs');
const db = require('../db');

function ask(question, hidden) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Echo the prompt itself but not the typed characters.
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
      };
    }
    rl.question(question, (answer) => {
      if (hidden) process.stdout.write('\n');
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  let [username, email] = process.argv.slice(2);
  let password = process.env.ADMIN_PASSWORD;
  if (!username) username = await ask('Username: ');
  if (!email) email = await ask('Email: ');
  if (!password) password = await ask('Password (min 12 chars): ', true);

  username = (username || '').trim();
  if (!username) throw new Error('Username is required');
  if (!password || password.length < 12) throw new Error('Password must be at least 12 characters');

  if (db.prepare("SELECT 1 FROM users WHERE role = 'admin'").get()) {
    console.log('An admin already exists; nothing to do.');
    return;
  }
  const hash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)').run(
    username,
    (email || '').trim() || null,
    hash,
    'admin'
  );
  console.log(`Admin "${username}" created.`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
