'use client'

import { useEffect } from 'react'
import Clarity from '@microsoft/clarity'

/**
 * Microsoft Clarity analytics — official SDK integration.
 *
 * Uses the `@microsoft/clarity` npm package with `useEffect` so
 * initialization only runs client-side after hydration.
 * Kept as a separate client component to avoid making RootLayout
 * a client component — the rest of the app benefits from SSR.
 *
 * Requires env var: NEXT_PUBLIC_CLARITY_ID
 *
 * @see https://clarity.microsoft.com/blog/npm-integration/
 * @see https://www.npmjs.com/package/@microsoft/clarity
 */
export default function MicrosoftClarity() {
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID

  useEffect(() => {
    if (clarityId) {
      Clarity.init(clarityId)
    }
  }, [clarityId])

  return null
}
