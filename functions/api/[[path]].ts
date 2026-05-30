import { handleApi } from '../../src/api/router'
import type { Env } from '../../src/api/types'

export const onRequest: PagesFunction<Env> = (context) => handleApi(context)
