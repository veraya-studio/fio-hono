import { listLocalDatabases } from '@prisma/adapter-d1'
import { defineConfig } from 'prisma/config'

let localDatabase: string | undefined
try {
  localDatabase = listLocalDatabases().at(-1)
}
catch {
  localDatabase = undefined
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: localDatabase
      ? `file:${localDatabase}`
      : 'file:./.wrangler/local-d1-placeholder.sqlite',
  },
  migrations: {
    path: 'migrations',
  },
})
