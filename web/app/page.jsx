"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const STEPS = [
  { key: "queued", label: "Queued" },
  { key: "running", label: "Running" },
  { key: "analysis_complete", label: "Lyrics Analysis" },
  { key: "image_complete", label: "Thumbnail" },
  { key: "video_complete", label: "Video Render" },
  { key: "uploaded", label: "YouTube Upload" },
  { key: "done", label: "Complete" }
];

export default function Home() {
  const [lyrics, setLyrics] = useState("");
  const [style, setStyle] = useState("");
  const [title, setTitle] = useState("");
  const [music, setMusic] = useState(null);
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/jobs/${jobId}`);
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
      form.append("lyrics", lyrics);
      if (style) form.append("style", style);
      if (title) form.append("title", title);
      if (music) form.append("music", music);

      const res = await fetch(`${API_BASE}/jobs`, {
        method: "POST",
        body: form
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create job");
      }

      const data = await res.json();
      setJobId(data.job_id);
      setStatus({ status: "queued" });
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const currentStatus = status?.status || (jobId ? "queued" : "");
  const stepIndex = STEPS.findIndex((step) => step.key === currentStatus);
  const isFailed = currentStatus === "failed";

  const analysis = status?.analysis;

  const downloads = useMemo(() => {
    if (!jobId) return [];
    return [
      { label: "Thumbnail", kind: "thumbnail" },
      { label: "Video", kind: "video" },
      { label: "Analysis", kind: "analysis" }
    ];
  }, [jobId]);

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Zayat Vibes Studio</p>
          <h1>AI Rap YouTube Automation</h1>
          <p className="lead">
            Paste your lyrics, choose a style, and upload optional music. The
            system analyzes the mood, generates a cinematic thumbnail, renders a
            full video, and uploads to YouTube with unique metadata.
          </p>
          <div className="hero-actions">
            <span className="badge">Public Web · Production Queue</span>
            <span className="tag">No text or logos on thumbnails</span>
          </div>
        </div>
        <div className="hero-card">
          <div className="hero-card-title">Pipeline</div>
          <ol>
            <li>Lyrics analysis</li>
            <li>Image generation</li>
            <li>Video render</li>
            <li>YouTube upload</li>
          </ol>
        </div>
      </header>

      <section className="card">
        <div className="card-header">
          <div>
            <h2>Start a New Job</h2>
            <p>Each job produces a unique title, description, and thumbnail.</p>
          </div>
        </div>

        <form onSubmit={submit} className="form">
          <label>
            Lyrics
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Paste your lyrics here..."
              required
            />
          </label>

          <div className="grid">
            <label>
              Style (optional)
              <input
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="emo drill, trap, cinematic..."
              />
            </label>
            <label>
              Song Title (optional)
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Leave empty to auto-generate"
              />
            </label>
          </div>

          <label>
            Music File (optional)
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setMusic(e.target.files?.[0] || null)}
            />
          </label>

          <button type="submit" disabled={submitting || !lyrics.trim()}>
            {submitting ? "Submitting..." : "Start Job"}
          </button>

          {error && <div className="error">{error}</div>}
        </form>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2>Job Status</h2>
            <p>Track every step from analysis to upload.</p>
          </div>
          {jobId && <span className="pill">Job ID: {jobId}</span>}
        </div>

        {jobId ? (
          <div className="status">
            <div className="timeline">
              {STEPS.map((step, index) => {
                const done = stepIndex >= index && !isFailed;
                const active = step.key === currentStatus && !isFailed;
                return (
                  <div
                    key={step.key}
                    className={`step ${done ? "done" : ""} ${active ? "active" : ""}`}
                  >
                    <div className="dot" />
                    <div className="label">{step.label}</div>
                  </div>
                );
              })}
              {isFailed && (
                <div className="step failed">
                  <div className="dot" />
                  <div className="label">Failed</div>
                </div>
              )}
            </div>

            {analysis && (
              <div className="meta">
                <div><strong>Mood:</strong> {analysis.mood}</div>
                <div><strong>Vibe:</strong> {analysis.vibe}</div>
                <div><strong>Title:</strong> {analysis.youtube_title}</div>
              </div>
            )}

            {status?.video_id && (
              <div className="meta">
                <div><strong>Video ID:</strong> {status.video_id}</div>
              </div>
            )}

            <div className="downloads">
              {downloads.map((item) => (
                <a
                  key={item.kind}
                  href={`${API_BASE}/jobs/${jobId}/download/${item.kind}`}
                  target="_blank"
                >
                  Download {item.label}
                </a>
              ))}
            </div>
          </div>
        ) : (
          <p>No job yet. Submit lyrics to start.</p>
        )}
      </section>

      <section className="card accent">
        <h3>Deployment Ready</h3>
        <p>
          This MVP is wired for public deployment with Vercel (frontend) and
          Render (backend). Connect Redis for queue processing and run your jobs
          continuously.
        </p>
      </section>
    </main>
  );
}
