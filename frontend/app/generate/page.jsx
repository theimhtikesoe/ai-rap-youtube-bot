"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const STEPS = [
  { key: "analysis", label: "Analyzing lyrics" },
  { key: "image", label: "Generating image" },
  { key: "video", label: "Rendering video" },
  { key: "uploading", label: "Uploading to YouTube" },
  { key: "done", label: "Complete" }
];

export default function GeneratePage() {
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("Trap");
  const [lyrics, setLyrics] = useState("");
  const [musicFile, setMusicFile] = useState(null);
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/job-status/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        setStatus(data);
      } catch (err) {
        setError(String(err));
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [jobId]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const form = new FormData();
      form.append("title", title);
      form.append("style", style);
      form.append("lyrics", lyrics);
      if (musicFile) form.append("music_file", musicFile);

      const res = await fetch(`${API_BASE}/api/generate-video`, {
        method: "POST",
        body: form
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to start job");
      }

      const data = await res.json();
      setJobId(data.job_id);
      setStatus({ status: data.status });
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const currentStep = status?.step || status?.status || (jobId ? "analysis" : "");
  const stepIndex = STEPS.findIndex((step) => step.key === currentStep);

  const downloads = useMemo(() => {
    if (!jobId) return [];
    return [
      { label: "Analysis", kind: "analysis" },
      { label: "Thumbnail", kind: "thumbnail" },
      { label: "Video", kind: "video" }
    ];
  }, [jobId]);

  return (
    <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-slate">AI Rap Video Generator</p>
        <h1 className="font-['Bebas_Neue'] text-5xl">Generate a New Video</h1>
        <p className="text-slate max-w-2xl">
          Provide lyrics, choose a style, and optionally upload your beat. The
          pipeline will analyze mood, generate a thumbnail, render a video, and
          upload directly to YouTube.
        </p>
        <div className="flex flex-wrap gap-3">
          <span className="badge">No text or logos on thumbnails</span>
          <span className="tag">Auto metadata</span>
        </div>
      </header>

      <section className="card">
        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate">Song Title</label>
            <input
              className="mt-2 w-full rounded-xl border border-[#e6dfd6] px-4 py-3"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Optional, leave blank for auto"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate">Style</label>
            <select
              className="mt-2 w-full rounded-xl border border-[#e6dfd6] px-4 py-3 bg-white"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            >
              {["Trap", "Drill", "Dark Trap", "Boom Bap", "Freestyle"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate">Lyrics</label>
            <textarea
              className="mt-2 w-full rounded-xl border border-[#e6dfd6] px-4 py-3 min-h-[180px]"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Paste lyrics here..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate">Upload Beat</label>
            <input
              className="mt-2 w-full rounded-xl border border-[#e6dfd6] px-4 py-3 bg-white"
              type="file"
              accept="audio/*"
              required
              onChange={(e) => setMusicFile(e.target.files?.[0] || null)}
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-ember text-white px-5 py-3 font-semibold"
            disabled={submitting || !lyrics.trim()}
          >
            {submitting ? "Generating..." : "Generate Video"}
          </button>

          {error && <p className="text-red-500">{error}</p>}
        </form>
      </section>

      <section className="card">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-semibold">Processing Status</h2>
            <p className="text-slate">Follow the pipeline step-by-step.</p>
          </div>
          {jobId && <span className="badge">Job ID: {jobId}</span>}
        </div>

        {jobId ? (
          <div className="space-y-4">
            <div className="space-y-2">
              {STEPS.map((step, index) => (
                <div
                  key={step.key}
                  className={`flex items-center gap-3 ${index <= stepIndex ? "text-ink" : "text-mist"}`}
                >
                  <span className={`h-3 w-3 rounded-full ${index <= stepIndex ? "bg-ember" : "bg-[#d8d0c6]"}`} />
                  <span>{step.label}</span>
                </div>
              ))}
            </div>

            {status?.video_url && (
              <div className="text-sm text-slate">
                YouTube Link: <a className="text-ember" href={status.video_url} target="_blank">{status.video_url}</a>
              </div>
            )}

            {status?.analysis && (
              <div className="grid gap-2 text-sm text-slate">
                <div><strong>Mood:</strong> {status.analysis.mood}</div>
                <div><strong>Vibe:</strong> {status.analysis.vibe}</div>
                <div><strong>Title:</strong> {status.analysis.youtube_title}</div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {downloads.map((item) => (
                <a
                  key={item.kind}
                  className="badge"
                  href={`${API_BASE}/job-status/${jobId}/download/${item.kind}`}
                  target="_blank"
                >
                  Download {item.label}
                </a>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-slate">Start a job to see progress updates.</p>
        )}
      </section>
    </main>
  );
}
