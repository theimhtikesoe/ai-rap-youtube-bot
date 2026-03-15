import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <div className="card">
        <p className="text-xs uppercase tracking-[0.3em] text-slate">AI Rap Studio</p>
        <h1 className="font-['Bebas_Neue'] text-5xl mt-4">AI Rap Video Generator</h1>
        <p className="mt-4 text-slate">
          Turn lyrics into cinematic rap videos with AI analysis, ComfyUI visuals,
          and automated YouTube uploads.
        </p>
        <div className="mt-8 flex gap-4 flex-wrap">
          <Link href="/generate" className="badge">Create a Video</Link>
          <span className="tag">Public Web MVP</span>
        </div>
      </div>
    </main>
  );
}
