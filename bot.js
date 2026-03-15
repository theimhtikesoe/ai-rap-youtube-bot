import ollama from "ollama";
import { exec } from "child_process";
import fs from "fs";
import fetch from "node-fetch";
import { google } from "googleapis";
import open from "open";
import readline from "readline";

const SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];
const TOKEN_PATH = "token.json";

const COMFY_OUTPUT = "/Users/rhyzoe/ComfyUI/output";

function logStep(msg){
  console.log("\n==============================");
  console.log(msg);
  console.log("==============================\n");
}

function ensureDir(dir){
  if(!fs.existsSync(dir)){
    fs.mkdirSync(dir,{recursive:true});
  }
}

function sleep(ms){
  return new Promise(r=>setTimeout(r,ms));
}

function getLatestImage(){

  const files = fs.readdirSync(COMFY_OUTPUT)
    .filter(f=>f.endsWith(".png"));

  const latest = files
    .map(f=>({
      name:f,
      time:fs.statSync(`${COMFY_OUTPUT}/${f}`).mtime
    }))
    .sort((a,b)=>b.time-a.time)[0].name;

  return `${COMFY_OUTPUT}/${latest}`;
}

function getRandomBeat(){

  const beats = fs.readdirSync("audio")
    .filter(f=>f.endsWith(".mp3"));

  const beat = beats[Math.floor(Math.random()*beats.length)];

  console.log("🎧 Beat:",beat);

  return "audio/"+beat;
}

async function generateLyrics(){

  logStep("✍️ Generating Lyrics");

  const ai = await ollama.chat({
    model:"llama3",
    messages:[{
      role:"user",
      content:`
Write a dark hip hop rap lyric.

Rules:
- 12 bars
- dark trap rap
- modern underground hiphop
- cinematic
- no explanation
`
    }]
  });

  const lyrics = ai.message.content.trim();

  console.log("\n📝 Lyrics:\n",lyrics);

  return lyrics;
}

async function analyzeLyrics(lyrics){

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

async function generateMetadata(lyrics){

  logStep("🤖 Generating Metadata");

  const ai = await ollama.chat({
    model:"llama3",
    messages:[{
      role:"user",
      content:`
Create YouTube metadata for a rap video.

Rules:
- do NOT mention AI
- make it sound like a real underground rap release
- title under 60 characters
- return JSON only

{
"title":"",
"description":"",
"tags":[]
}

Lyric:
${lyrics}
`
    }]
  });

  let meta;

  try{
    meta = JSON.parse(ai.message.content);
  }catch{
    meta={
      title:"Underground Dark Trap Freestyle",
      description:"A dark cinematic trap rap freestyle from the underground streets.",
      tags:["dark rap","trap rap","hip hop","underground rap"]
    }
  }

  console.log("Title:",meta.title);

  return meta;
}

async function generateThumbnail(analysis){

  logStep("🎨 Generating Thumbnail");

  ensureDir("thumbnails");

  const workflow = JSON.parse(
    fs.readFileSync("image_z_image_turbo.json","utf8")
  );

  const prompt = `
${analysis.scene},
${analysis.visual},
${analysis.style},
dark hip hop rapper portrait,
rainy neon cyberpunk city,
dramatic rim lighting,
ultra realistic,
cinematic color grading,
8k detail,
professional youtube thumbnail
`;

  workflow["57:27"].inputs.text = prompt;
// IMPORTANT
workflow["57:3"].inputs.seed = Math.floor(Math.random()*999999999);
  await fetch(
    "http://127.0.0.1:8188/prompt",
    {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ prompt:workflow })
    }
  );

  console.log("⏳ Waiting ComfyUI render...");

  await sleep(420000);

  const latest = getLatestImage();

  fs.copyFileSync(latest,"thumbnails/raw.png");

  await new Promise((resolve,reject)=>{

    exec(`
ffmpeg -y -i thumbnails/raw.png \
-vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" \
thumbnails/cover.png
`,(err)=>{

      if(err){
        reject(err);
        return;
      }

      resolve();
    });

  });

  console.log("✅ Thumbnail ready");
}

function renderVideo(){

  return new Promise((resolve,reject)=>{

    logStep("🎬 Rendering Video");

    ensureDir("videos");

    const beat = getRandomBeat();

    const output = `videos/video_${Date.now()}.mp4`;

    const cmd = `
ffmpeg -y \
-loop 1 -i thumbnails/cover.png \
-i ${beat} \
-vf "scale=1920:1080" \
-r 30 \
-c:v libx264 \
-pix_fmt yuv420p \
-c:a aac \
-shortest \
${output}
`;

    exec(cmd,(error)=>{

      if(error){
        reject(error);
        return;
      }

      console.log("✅ Video ready:",output);

      resolve(output);

    });

  });

}

function authorize(){

  const credentials = JSON.parse(fs.readFileSync("client_secret.json"));
  const {client_secret,client_id,redirect_uris} = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  if(fs.existsSync(TOKEN_PATH)){
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
    return Promise.resolve(oAuth2Client);
  }

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type:"offline",
    scope:SCOPES
  });

  open(authUrl);

  const rl = readline.createInterface({
    input:process.stdin,
    output:process.stdout
  });

  return new Promise((resolve)=>{

    rl.question("Enter code: ",(code)=>{

      rl.close();

      oAuth2Client.getToken(code,(err,token)=>{

        oAuth2Client.setCredentials(token);
        fs.writeFileSync(TOKEN_PATH,JSON.stringify(token));

        resolve(oAuth2Client);

      });

    });

  });

}

async function uploadVideo(auth,video,meta){

  logStep("📤 Uploading Video");

  const youtube = google.youtube({
    version:"v3",
    auth
  });

  const res = await youtube.videos.insert({

    part:"snippet,status",

    requestBody:{
      snippet:{
        title:meta.title,
        description:meta.description,
        tags:meta.tags
      },
      status:{
        privacyStatus:"public"
      }
    },

    media:{
      body:fs.createReadStream(video)
    }

  });

  console.log("🎉 Upload Success");
  console.log("Video ID:",res.data.id);

}

async function run(){

  try{

    logStep("🚀 AI RAP PIPELINE START");

    const lyrics = await generateLyrics();

    const analysis = await analyzeLyrics(lyrics);

    const metadata = await generateMetadata(lyrics);

    await generateThumbnail(analysis);

    const video = await renderVideo();

    const auth = await authorize();

    await uploadVideo(auth,video,metadata);

    logStep("✅ PIPELINE COMPLETE");

  }catch(err){

    console.error("💥 Pipeline Error");
    console.error(err);

  }

}

run();