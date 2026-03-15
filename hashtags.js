const REQUIRED = ["#Rhyzoe", "#ZayatVibes", "#BurmeseRap", "#SunoAI"];

function uniquePush(list, value){
  if(!list.includes(value)){
    list.push(value);
  }
}

function toLowerText(analysis, lyrics){
  return `${analysis?.mood || ""} ${analysis?.visual || ""} ${analysis?.scene || ""} ${analysis?.style || ""} ${lyrics || ""}`.toLowerCase();
}

export function generateHashtags(lyrics, analysis){
  const text = toLowerText(analysis, lyrics);
  const tags = [...REQUIRED];

  if(text.includes("drill")){
    uniquePush(tags, "#BurmeseDrill");
    uniquePush(tags, "#DrillRap");
  }
  if(text.includes("trap")){
    uniquePush(tags, "#TrapRap");
  }
  if(text.includes("emo") || text.includes("heartbreak") || text.includes("broken")){
    uniquePush(tags, "#BurmeseEmoRap");
    uniquePush(tags, "#EmoDrill");
    uniquePush(tags, "#HeartbreakRap");
  }
  if(text.includes("rain")){
    uniquePush(tags, "#RainyNight");
  }
  if(text.includes("night")){
    uniquePush(tags, "#NightVibes");
  }
  if(text.includes("underground") || text.includes("street")){
    uniquePush(tags, "#UndergroundRap");
  }
  if(text.includes("cinematic")){
    uniquePush(tags, "#CinematicRap");
  }

  const fallbacks = [
    "#BurmeseDrill",
    "#BurmeseEmoRap",
    "#MyanmarRap",
    "#EmoRap",
    "#DarkRap",
    "#LoFiRap",
    "#StreetRap",
    "#RapStory",
    "#TrapDrill",
    "#NightDrive"
  ];

  for(const tag of fallbacks){
    if(tags.length >= 10){
      break;
    }
    uniquePush(tags, tag);
  }

  return tags.slice(0, 10);
}
