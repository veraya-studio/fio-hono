import { readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { listLocalDatabases } from '@prisma/adapter-d1'

const migrationName = process.argv[2]
if (!migrationName || !/^[\w-]+$/.test(migrationName)) {
  throw new Error('Usage: bun run db:migration:create <migration_name>')
}

let localDatabases: string[] = []
try {
  localDatabases = listLocalDatabases()
}
catch {
  // Wrangler has not created its local state directory yet.
}

if (localDatabases.length === 0) {
  throw new Error('No local D1 database found. Run `bun run db:migrate:local` first.')
}

const migrationsDirectory = path.resolve('migrations')
const files = await readdir(migrationsDirectory)
const lastNumber = files.reduce((highest, file) => {
  const value = Number.parseInt(file.match(/^(\d+)_/)?.[1] ?? '0', 10)
  return Math.max(highest, value)
}, 0)
const filename = `${String(lastNumber + 1).padStart(4, '0')}_${migrationName}.sql`
const outputPath = path.join(migrationsDirectory, filename)

const child = Bun.spawn([
  'bunx',
  '--bun',
  'prisma',
  'migrate',
  'diff',
  '--from-config-datasource',
  '--to-schema',
  'prisma/schema.prisma',
  '--script',
], {
  stdout: 'pipe',
  stderr: 'inherit',
})

const sql = await new Response(child.stdout).text()
if (await child.exited !== 0)
  throw new Error('Prisma could not generate the migration')

if (!sql.trim() || sql.includes('This is an empty migration'))
  throw new Error('Prisma schema and local D1 database are already in sync')

await writeFile(outputPath, sql)
console.log(`Created ${path.relative(process.cwd(), outputPath)}`)
