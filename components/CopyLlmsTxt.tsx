'use client'

import { useCallback, useState } from 'react'

export default function CopyLlmsTxt() {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      const res = await fetch('/llms.txt')
      const text = await res.text()
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.open('/llms.txt', '_blank')
    }
  }, [])

  return (
    <button className="footer-llms-btn" onClick={handleCopy}>
      {copied ? 'Copiado!' : '\uD83D\uDCCB Copiar llms.txt para usar com IA'}
    </button>
  )
}
