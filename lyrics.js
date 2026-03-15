import ollama from "ollama";
import fs from "fs";

function logStep(msg){
  console.log("\n==============================");
  console.log(msg);
  console.log("==============================\n");
}

export async function generateLyrics(){

  logStep("✍️ Generating Lyrics");

  const library = JSON.parse(fs.readFileSync("lyrics_library.json","utf8"));
  const pool = Array.isArray(library?.lyrics) ? library.lyrics : [];
  if(pool.length === 0){
    throw new Error("lyrics_library.json has no lyrics");
  }

  const start = Math.floor(Math.random() * Math.max(1, pool.length - 12));
  const seed = pool.slice(start, start + 12).join("\n");

  const ai = await ollama.chat({
    model:"llama3",
    messages:[{
      role:"user",
      content:`
Rewrite these lyrics into a clean structured rap.

Rules:
- 12 to 16 bars
- keep the core theme and emotion
- Burmese/English mix allowed
- cinematic, underground, emotional
- no explanation, lyrics only

Seed:
${seed}
`
    }]
  });

  const lyrics = ai.message.content.trim();

  console.log("\n📝 Lyrics:\n",lyrics);

  return lyrics;
}

export async function analyzeLyrics(lyrics){

  logStep("🎭 Analyzing Lyrics");

  const ai = await ollama.chat({
    model:"llama3",
    messages:[{
      role:"user",
      content:`
Analyze this rap lyric.

Return JSON only:

{
"mood":"",
"visual":"",
"scene":"",
"style":""
}

Lyric:
${lyrics}
`
    }]
  });

  let result;

  try{
    result = JSON.parse(ai.message.content);
  }catch{
    result = {
      mood:"dark trap",
      visual:"lonely rapper in neon city rain",
      scene:"cyberpunk alley",
      style:"cinematic"
    };
  }

  console.log("Mood:",result.mood);
  console.log("Visual:",result.visual);

  return result;
}

// Metadata generation moved to title.js, description.js, and hashtags.js.
