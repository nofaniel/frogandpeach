import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { useMemo } from 'react'

export function Markdown({ body }: { body: string }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(body || '') as string), [body])
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html || '<p>No content yet.</p>' }} />
}
