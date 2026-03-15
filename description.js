function extractLines(lyrics){
  return lyrics
    .split(/\r?\n/)
    .map(l=>l.trim())
    .filter(Boolean);
}

function containsBurmese(text){
  return /[\u1000-\u109F]/.test(text);
}

function pickHook(lines){
  const burmese = lines.filter(containsBurmese);
  const pick = burmese.length ? burmese : lines;
  return pick.slice(0, 2).join("\n");
}

function pickHighlight(lines){
  const burmese = lines.filter(containsBurmese);
  const source = burmese.length >= 4 ? burmese : lines;
  const start = Math.min(2, Math.max(0, source.length - 3));
  const pick = source.slice(start, start + 2);
  return pick.join("\n");
}

function moodTokens(analysis, lyrics){
  const text = `${analysis?.mood || ""} ${analysis?.style || ""} ${analysis?.scene || ""} ${analysis?.visual || ""} ${lyrics || ""}`.toLowerCase();
  const parts = [];

  if(text.includes("heartbreak") || text.includes("broken") || text.includes("emo")){
    parts.push("Broken Love");
  }
  if(text.includes("rain")){
    parts.push("Rainy Night");
  }
  if(text.includes("drill")){
    parts.push("Drill Energy");
  }
  if(text.includes("trap")){
    parts.push("Trap Smoke");
  }
  if(text.includes("street") || text.includes("underground")){
    parts.push("Street Confession");
  }
  if(text.includes("cinematic")){
    parts.push("Cinematic Mood");
  }

  while(parts.length < 3){
    parts.push(parts.length === 0 ? "Midnight Vibes" : "Emo Confession");
  }

  return parts.slice(0, 3).join(" x ");
}

function genreLabel(analysis, lyrics){
  const text = `${analysis?.mood || ""} ${analysis?.style || ""} ${analysis?.scene || ""} ${lyrics || ""}`.toLowerCase();
  if(text.includes("emo") || text.includes("heartbreak") || text.includes("broken")){
    return "Emo Drill";
  }
  if(text.includes("drill")){
    return "Drill";
  }
  if(text.includes("trap")){
    return "Trap";
  }
  return "Rap";
}

function buildParagraph(analysis, lyrics){
  const scene = analysis?.scene ? `through ${analysis.scene}` : "through midnight rain";
  const vibe = analysis?.style || analysis?.mood || "raw";
  const genre = genreLabel(analysis, lyrics);
  return [
    "This is not just a song.",
    `It's a final letter soaked in ${vibe}, a voice trembling ${scene}.`,
    `Rhyzoe delivers a Burmese-English ${genre} confession laced with regret and rawness.`
  ].join("\n");
}

export function generateDescription(lyrics, analysis, hashtags){
  const lines = extractLines(lyrics);
  const hook = pickHook(lines);
  const highlight = pickHighlight(lines);
  const mood = moodTokens(analysis, lyrics);
  const hashLine = (hashtags || []).join(" ");

  return `${hook}\n\n${buildParagraph(analysis, lyrics)}\n\nLyrics Highlight:\n\"${highlight}\"\n\nCreated with SUNO AI | Powered by Zayat Vibes\n\nMood: ${mood}\n\n${hashLine}`;
}
