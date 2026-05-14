import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌟</span>
          <span className="font-bold text-gray-900 text-lg">KidAI Playground</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Parent Login
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
          <span>Safe AI for children</span>
        </div>

        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          AI your kids can explore.
          <br />
          <span className="text-indigo-600">Safety you can trust.</span>
        </h1>

        <p className="text-xl text-gray-600 mb-10 max-w-2xl">
          KidAI Playground gives children a safe space to learn, create, and ask questions — 
          with full parent oversight, age-appropriate AI, and multi-layer content filtering.
        </p>

        <div className="flex items-center gap-4 flex-wrap justify-center">
          <Link href="/signup">
            <Button size="lg">Start for free — no credit card</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">
              Parent dashboard
            </Button>
          </Link>
        </div>

        {/* Trust badges */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-3xl">
          {[
            { icon: '🛡️', title: 'COPPA Compliant', desc: 'Built for US child privacy law' },
            { icon: '👨‍👩‍👧', title: 'Parent Controls', desc: 'Full oversight & remote pause' },
            { icon: '🔒', title: 'No Ad Tracking', desc: 'Zero behavioural advertising' },
            { icon: '🤖', title: 'Always AI-labelled', desc: 'Kids always know it\'s AI' },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="font-semibold text-gray-900 text-sm">{item.title}</div>
              <div className="text-gray-500 text-xs mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
