import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <div className="inline-flex items-center gap-2 bg-purple-900/30 border border-purple-600 px-4 py-2 rounded-full mb-8">
          <span className="text-purple-400 text-sm">⚡ Powered by Arbitrum Stylus</span>
        </div>

        <h1 className="text-6xl font-black mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          StylusForge
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl mb-12">
          The first interactive IDE to learn Arbitrum Stylus smart contracts in Rust.
          Write, deploy and certify on-chain.
        </p>

        <div className="flex gap-4">
          <Link
            href="/learn"
            className="bg-purple-600 hover:bg-purple-700 px-8 py-4 rounded-xl font-bold text-lg transition"
          >
            Start learning →
          </Link>
          
            href="https://github.com/wkalidev/stylusforge"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-gray-600 hover:border-gray-400 px-8 py-4 rounded-xl font-bold text-lg transition"
          >
            GitHub
          </a>
        </div>
      </section>

      {/* Curriculum preview */}
      <section className="max-w-4xl mx-auto py-20 px-4">
        <h2 className="text-3xl font-bold mb-8">Curriculum</h2>
        <div className="space-y-4">
          {[
            { id: 1, title: "Hello World Stylus", difficulty: "Beginner", xp: 100 },
            { id: 2, title: "Storage & State", difficulty: "Beginner", xp: 150 },
            { id: 3, title: "Events & Errors", difficulty: "Intermediate", xp: 200 },
            { id: 4, title: "ERC-20 Token", difficulty: "Intermediate", xp: 300 },
            { id: 5, title: "DeFi Interaction", difficulty: "Advanced", xp: 500 },
          ].map((lesson) => (
            <div
              key={lesson.id}
              className="flex items-center justify-between bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-purple-600 transition"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl font-black text-gray-700">
                  {String(lesson.id).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-bold">{lesson.title}</p>
                  <p className="text-gray-400 text-sm">{lesson.difficulty}</p>
                </div>
              </div>
              <span className="text-yellow-400 font-bold">⚡ {lesson.xp} XP</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
