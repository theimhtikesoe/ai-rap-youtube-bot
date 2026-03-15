function extractLines(lyrics){
  return lyrics
    .split(/\r?\n/)
    .map(l=>l.trim())
    .filter(Boolean);
}

function stripQuotes(text){
  return text
    .replace(/^["'“”‘’]+/g, "")
    .replace(/["'“”‘’]+$/g, "")
    .trim();
}

function containsBurmese(text){
  return /[\u1000-\u109F]/.test(text);
}

function clampLine(line, maxLen){
  if(line.length <= maxLen){
    return line;
  }
  const cut = line.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  if(lastSpace > 10){
    return cut.slice(0, lastSpace).trim();
  }
  return cut.trim();
}

function guessGenreTag(analysis, lyrics){
  const text = `${analysis?.mood || ""} ${analysis?.style || ""} ${analysis?.scene || ""} ${lyrics || ""}`.toLowerCase();
  if(text.includes("emo") || text.includes("heartbreak") || text.includes("broken")){
    return "Burmese Emo Drill";
  }
  if(text.includes("drill")){
    return "Burmese Drill";
  }
  if(text.includes("trap")){
    return "Burmese Trap";
  }
  return "Burmese Rap";
}

export function generateTitle(lyrics, analysis){
  const lines = extractLines(lyrics);
  const burmeseLines = lines.filter(containsBurmese);
  let base = burmeseLines[0] || lines[0] || "မေ့မရတဲ့ည";
  base = stripQuotes(base);
  base = base.replace(/[|()]/g, "").trim();
  base = clampLine(base, 40);

  const genre = guessGenreTag(analysis, lyrics);
  return `${base} | ${genre}`;
}
