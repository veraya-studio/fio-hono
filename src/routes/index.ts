import type { Routes } from '../app'
import { health } from './health'
import { echo } from './echo'

/**
 * All HTTP routes registered with the app. Keep this flat — group by feature
 * folder once the project grows (e.g. `routes/users/...`).
 */
export const routes: Routes = [
  ['GET', '/healthz', health],
  ['POST', '/echo', echo],
]
