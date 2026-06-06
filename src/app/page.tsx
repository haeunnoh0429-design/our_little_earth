export default function Home() {
  const setupSteps = [
    "Create a Firebase project and register a web app.",
    "Copy .env.local.example to .env.local and fill in the keys.",
    "Issue a Kakao Developers JavaScript key.",
    "Connect the project to Vercel and add the same env vars.",
  ];

  const stack = [
    "Next.js App Router",
    "TypeScript",
    "Tailwind CSS v4",
    "Firebase SDK",
    "Kakao Map JavaScript SDK",
    "Vercel deployment ready",
  ];

  return (
    <main className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,rgba(129,199,132,0.25),transparent_35%),linear-gradient(180deg,#f4f8ee_0%,#eef4e8_100%)] px-6 py-10 text-foreground">
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 rounded-[2rem] border border-black/5 bg-surface/90 p-8 shadow-[0_30px_80px_rgba(46,125,50,0.12)] backdrop-blur md:p-10">
        <div className="flex flex-col gap-4 border-b border-black/5 pb-6">
          <span className="w-fit rounded-full bg-accent px-4 py-1 text-sm font-semibold text-white">
            Dev Environment Ready
          </span>
          <div className="space-y-3">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
              Our Little Earth starter is ready for development.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted md:text-lg">
              The project now includes a clean base for Next.js, TypeScript,
              Tailwind CSS, Firebase, and Kakao Map integration.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[1.5rem] bg-surface-strong p-6">
            <h2 className="text-xl font-semibold">Installed stack</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {stack.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-black/5 bg-white/80 px-4 py-3 text-sm font-medium"
                >
                  {item}
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.5rem] border border-black/5 bg-white p-6">
            <h2 className="text-xl font-semibold">Next setup steps</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-muted">
              {setupSteps.map((step, index) => (
                <li
                  key={step}
                  className="flex items-start gap-3 rounded-2xl bg-surface px-4 py-3"
                >
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-strong text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </article>
        </div>

        <article className="rounded-[1.5rem] border border-dashed border-accent/30 bg-white px-6 py-5">
          <h2 className="text-lg font-semibold">Environment variables</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Copy <code>.env.local.example</code> to <code>.env.local</code> and
            enter your Firebase and Kakao credentials to start wiring features.
          </p>
        </article>
      </section>
    </main>
  );
}
