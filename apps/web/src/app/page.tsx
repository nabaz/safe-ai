import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col text-white">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-sm font-black font-mono">
            &gt;_
          </div>
          <span className="font-bold text-white text-lg tracking-tight">CodeMind</span>
          <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
            for kids
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              Parent Login
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
              Get Started Free
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 max-w-5xl mx-auto">
        {/* Code snippet decoration */}
        <div className="font-mono text-xs text-gray-500 mb-8 bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 inline-block text-left">
          <span className="text-purple-400">def</span>{' '}
          <span className="text-yellow-400">learn</span>
          <span className="text-gray-300">(</span>
          <span className="text-green-400">child</span>
          <span className="text-gray-300">, </span>
          <span className="text-green-400">curiosity</span>
          <span className="text-gray-300">):</span>
          <br />
          <span className="ml-4 text-gray-400"># </span>
          <span className="text-gray-500">build the next generation</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tight">
          Where kids become{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            programmers.
          </span>
        </h1>

        <p className="text-xl text-gray-400 mb-4 max-w-2xl leading-relaxed">
          Real Python. Real math. Real problem-solving. CodeMind teaches children to think like 
          engineers — with an AI tutor that guides, never just gives answers.
        </p>

        <p className="text-sm text-gray-600 mb-10 font-mono">
          Ages 4–15 · Safe · Parent-supervised
        </p>

        <div className="flex items-center gap-4 flex-wrap justify-center">
          <Link href="/signup">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8">
              Start coding for free
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg" className="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10">
              Parent dashboard
            </Button>
          </Link>
        </div>

        {/* Subject pills */}
        <div className="mt-12 flex flex-wrap gap-2 justify-center">
          {[
            { label: 'Python', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
            { label: 'Mathematics', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
            { label: 'Algorithms', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
            { label: 'Logic', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
            { label: 'Debugging', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
            { label: 'Data Structures', color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' },
            { label: 'Geometry', color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
          ].map((s) => (
            <span
              key={s.label}
              className={`text-xs font-mono font-semibold px-3 py-1 rounded-full border ${s.color}`}
            >
              {s.label}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-900/50 border-t border-white/5 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-mono text-indigo-400 uppercase tracking-widest mb-3">
            How CodeMind Works
          </p>
          <h2 className="text-3xl font-bold text-white text-center mb-14">
            Learn by doing. Think by building.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: '💻',
                title: 'Code Lab',
                desc: 'Hands-on Python lessons with an in-browser editor. Kids write real code, see real output, and pass real challenges — not drag-and-drop.',
              },
              {
                step: '02',
                icon: '🧮',
                title: 'Math Missions',
                desc: 'From counting to algebra. Every concept is taught through programming — turning abstract maths into code that runs, proves, and surprises.',
              },
              {
                step: '03',
                icon: '🤖',
                title: 'AI Tutor Chat',
                desc: 'Ask anything. The AI never just hands over answers — it asks questions back, breaks problems into steps, and builds real understanding.',
              },
            ].map((item) => (
              <div key={item.step} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-mono text-xs text-gray-600">{item.step}</span>
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curriculum preview */}
      <section className="px-6 py-20 max-w-5xl mx-auto w-full">
        <p className="text-xs font-mono text-indigo-400 uppercase tracking-widest mb-3">
          Curriculum
        </p>
        <h2 className="text-3xl font-bold text-white mb-3">
          A real path from zero to coder.
        </h2>
        <p className="text-gray-400 mb-10 max-w-xl">
          Three tiers — each one expanding what kids can build, prove, and understand.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              tier: 'Explorer',
              ages: 'Ages 4–7',
              color: 'from-green-900/50 to-green-950 border-green-800/50',
              accent: 'text-green-400',
              badge: 'bg-green-400/10 text-green-400 border-green-400/20',
              topics: ['print() & output', 'Counting & numbers', 'Simple loops', 'Patterns & colours', 'Story logic'],
            },
            {
              tier: 'Builder',
              ages: 'Ages 8–11',
              color: 'from-blue-900/50 to-blue-950 border-blue-800/50',
              accent: 'text-blue-400',
              badge: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
              topics: ['Variables & types', 'If / else logic', 'Loops & lists', 'Functions', 'Multiplication & division', 'Algebra basics', 'Area & perimeter'],
            },
            {
              tier: 'Creator',
              ages: 'Ages 12–15',
              color: 'from-purple-900/50 to-purple-950 border-purple-800/50',
              accent: 'text-purple-400',
              badge: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
              topics: ['Dictionaries & data', 'Algorithms', 'FizzBuzz & classics', 'Functions & return values', 'Equations & graphs', 'Statistics', 'Geometry proofs'],
            },
          ].map((tier) => (
            <div key={tier.tier} className={`bg-gradient-to-b ${tier.color} border rounded-2xl p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-bold text-lg ${tier.accent}`}>{tier.tier}</h3>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${tier.badge}`}>
                  {tier.ages}
                </span>
              </div>
              <ul className="space-y-2">
                {tier.topics.map((t) => (
                  <li key={t} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className={`text-xs ${tier.accent}`}>▸</span>
                    <span className="font-mono text-xs">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Differentiators */}
      <section className="bg-gray-900/50 border-t border-white/5 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-mono text-indigo-400 uppercase tracking-widest mb-3 text-center">
            Why CodeMind is Different
          </p>
          <h2 className="text-3xl font-bold text-white text-center mb-14">
            Not a toy. A real education.
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🧠', title: 'Socratic AI', desc: 'Guides kids to answers through questions, not shortcuts' },
              { icon: '⚙️', title: 'Real Python', desc: 'Not blocks — actual code that runs in-browser instantly' },
              { icon: '📐', title: 'Math through code', desc: 'Maths concepts taught by writing programs that prove them' },
              { icon: '🏆', title: 'XP & Levels', desc: '10-level progression from Seedling to Wizard Coder' },
              { icon: '🛡️', title: 'COPPA Safe', desc: 'Built for US child privacy law, zero ad tracking' },
              { icon: '👨‍👩‍👧', title: 'Parent controls', desc: 'Full oversight, remote pause, topic management' },
              { icon: '🎯', title: 'Daily challenges', desc: '5 fresh lessons every day — never stale, always progressing' },
              { icon: '🤖', title: 'Always AI-labelled', desc: 'Kids always know they\'re talking to an AI, not a person' },
            ].map((item) => (
              <div key={item.title} className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="font-semibold text-white text-sm mb-1">{item.title}</div>
                <div className="text-gray-500 text-xs leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center max-w-3xl mx-auto">
        <div className="font-mono text-gray-600 text-sm mb-6">
          <span className="text-indigo-400">const</span>{' '}
          <span className="text-yellow-400">future</span>{' '}
          <span className="text-gray-500">= </span>
          <span className="text-green-400">buildWith</span>
          <span className="text-gray-500">(</span>
          <span className="text-orange-400">"your child"</span>
          <span className="text-gray-500">)</span>
        </div>
        <h2 className="text-4xl font-black text-white mb-4">
          Ready to grow a coder?
        </h2>
        <p className="text-gray-400 mb-8 text-lg">
          Free to start. No credit card. Your child writes their first program today.
        </p>
        <Link href="/signup">
          <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-10 py-6 text-base rounded-2xl">
            Start for free →
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-6 text-center">
        <p className="text-gray-600 text-xs font-mono">
          CodeMind · Safe AI for young programmers · COPPA compliant
        </p>
      </footer>
    </main>
  )
}
