import { exec } from "child_process";
import fs from "fs";

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

function getRandomBeat(){

  const beats = fs.readdirSync("audio")
    .filter(f=>f.endsWith(".mp3"));

  if(beats.length === 0){
    throw new Error("No beats found in audio folder");
  }

  const beat = beats[Math.floor(Math.random()*beats.length)];

  console.log("🎧 Beat:",beat);

  return "audio/"+beat;
}

export function renderVideo(thumbnail){

  return new Promise((resolve,reject)=>{

    logStep("🎬 Rendering Video");

    ensureDir("videos");

    if(!thumbnail){
      reject(new Error("Thumbnail path is required"));
      return;
    }
    if(!fs.existsSync(thumbnail)){
      reject(new Error(`Thumbnail not found: ${thumbnail}`));
      return;
    }

    const beat = getRandomBeat();

    const output = `videos/video_${Date.now()}.mp4`;

    const cmd = `
ffmpeg -y \
-loop 1 -i ${thumbnail} \
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
