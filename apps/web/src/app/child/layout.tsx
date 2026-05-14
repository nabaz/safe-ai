import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'KidAI Playground',
  description: 'Your safe AI playground',
}

export default function ChildLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
