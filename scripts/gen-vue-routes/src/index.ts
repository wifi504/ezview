import process from 'node:process'
import { main } from './generate-routes.js'

export type { RouteRecordOption } from './types'

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
