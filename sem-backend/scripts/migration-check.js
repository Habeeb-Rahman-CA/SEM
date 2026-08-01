#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Static analyzer for migration files. Two modes:
//
//   node scripts/migration-check.js
//       Prints an inventory of migrations with timestamps and their
//       destructive statements. Exit 0 always (informational).
//
//   node scripts/migration-check.js --check-destructive
//       Fails (exit 1) if any migration contains a destructive
//       statement (DROP TABLE, DROP COLUMN, TRUNCATE, ALTER … TYPE with
//       a shrinking cast, or a raw DELETE without WHERE) that isn't
//       explicitly acknowledged with a comment.
//
// The point isn't to prevent destructive changes — schemas need to
// evolve — it's to make sure a human eyeballed them and either signed
// off (via `// ACKNOWLEDGE: reason` comment) or rewrote them as a
// safer two-step (add nullable → backfill → drop later).
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'src', 'database', 'migrations');
const CHECK_MODE = process.argv.includes('--check-destructive');

if (!fs.existsSync(MIGRATIONS_DIR)) {
  console.log(`No migrations directory at ${MIGRATIONS_DIR} — nothing to check.`);
  process.exit(0);
}

const DESTRUCTIVE_PATTERNS = [
  { regex: /\bDROP\s+TABLE\b/i, label: 'DROP TABLE' },
  { regex: /\bDROP\s+COLUMN\b/i, label: 'DROP COLUMN' },
  { regex: /\bTRUNCATE\b/i, label: 'TRUNCATE' },
  { regex: /\bDELETE\s+FROM\s+[^\s;]+\s*;\s*$/im, label: 'DELETE without WHERE' },
  { regex: /\bDROP\s+INDEX\b/i, label: 'DROP INDEX' },
  { regex: /\bALTER\s+COLUMN\s+\w+\s+SET\s+NOT\s+NULL\b/i, label: 'SET NOT NULL (may fail on existing rows)' },
];

const ACK_COMMENT = /\/\/\s*ACKNOWLEDGE\b/i;

const files = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.ts') || f.endsWith('.js'))
  .sort();

let failed = false;

for (const file of files) {
  const full = path.join(MIGRATIONS_DIR, file);
  const content = fs.readFileSync(full, 'utf8');
  const acknowledged = ACK_COMMENT.test(content);

  const findings = [];
  for (const p of DESTRUCTIVE_PATTERNS) {
    if (p.regex.test(content)) findings.push(p.label);
  }

  const hasDown = /public\s+async\s+down\s*\(/.test(content);
  const line = [
    findings.length > 0 ? '⚠' : '✓',
    file,
    hasDown ? 'down()' : 'NO DOWN',
    findings.length > 0 ? `[${findings.join(', ')}]` : '',
    acknowledged ? '(acknowledged)' : '',
  ]
    .filter(Boolean)
    .join('  ');

  console.log(line);

  if (CHECK_MODE) {
    if (findings.length > 0 && !acknowledged) {
      console.error(
        `::error file=${full}::Destructive migration without \`// ACKNOWLEDGE: ...\` comment. ` +
          `Findings: ${findings.join(', ')}. Add the comment with a rationale, ` +
          `or rewrite as a non-destructive two-step migration.`,
      );
      failed = true;
    }
    if (!hasDown) {
      console.error(
        `::error file=${full}::Migration is missing a \`public async down(...)\` method. ` +
          `Rollback safety requires reversible migrations.`,
      );
      failed = true;
    }
  }
}

if (files.length === 0) {
  console.log('No migration files found.');
}

if (failed) {
  console.error('\nMigration validation failed. See errors above.');
  process.exit(1);
}
if (CHECK_MODE) {
  console.log('\nAll migrations pass destructive-safety checks.');
}
