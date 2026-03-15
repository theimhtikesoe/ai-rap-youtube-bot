import { exec } from "child_process";
import fs from "fs";
import fetch from "node-fetch";

const COMFY_URL = process.env.COMFY_URL || "http://127.0.0.1:8188";
const COMFY_OUTPUT = process.env.COMFY_OUTPUT || "/Users/rhyzoe/ComfyUI/output";
const COMFY_TEMP = process.env.COMFY_TEMP || COMFY_OUTPUT.replace(/\/output$/, "/temp");
const COMFY_TIMEOUT_MS = Number(process.env.COMFY_TIMEOUT_MS) || 12 * 60 * 1000;
const THUMB_WIDTH = Number(process.env.THUMB_WIDTH) || 1280;
const THUMB_HEIGHT = Number(process.env.THUMB_HEIGHT) || 720;
const THUMB_STEPS = Number(process.env.THUMB_STEPS) || 8;
const THUMB_CFG = Number(process.env.THUMB_CFG) || 3;

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

function resolveComfyImagePath(image){
  if(!image || !image.filename){
    return null;
  }
  const base = image.type === "temp" ? COMFY_TEMP : COMFY_OUTPUT;
  const sub = image.subfolder ? `/${image.subfolder}` : "";
  return `${base}${sub}/${image.filename}`;
}

function pickComfyImage(historyItem){
  const outputs = historyItem?.outputs || {};
  const preferred = outputs["9"]?.images;
  if(preferred && preferred.length){
    return preferred[0];
  }
  for(const nodeId of Object.keys(outputs)){
    const images = outputs[nodeId]?.images;
    if(images && images.length){
      return images[0];
    }
  }
  return null;
}

async function enqueueComfyPrompt(workflow){
  const res = await fetch(
    `${COMFY_URL}/prompt`,
    {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ prompt:workflow })
    }
  );

  if(!res.ok){
    const text = await res.text().catch(()=>"<no body>");
    throw new Error(`ComfyUI /prompt failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  if(!data?.prompt_id){
    throw new Error("ComfyUI /prompt response missing prompt_id");
  }
  return data.prompt_id;
}

async function waitForComfyImage(promptId){
  const deadline = Date.now() + COMFY_TIMEOUT_MS;
  let interval = 2000;
  let lastError;

  while(Date.now() < deadline){
    try{
      const res = await fetch(`${COMFY_URL}/history/${promptId}`);
      if(res.ok){
        const history = await res.json();
        const item = history?.[promptId];
        if(item?.status?.status === "error"){
          throw new Error(`ComfyUI job failed for prompt ${promptId}`);
        }

        const image = pickComfyImage(item);
        const path = resolveComfyImagePath(image);
        if(path && fs.existsSync(path)){
          return path;
        }
      }else{
        lastError = new Error(`ComfyUI /history failed: ${res.status}`);
      }
    }catch(err){
      lastError = err;
    }

    await sleep(interval);
    interval = Math.min(10000, Math.floor(interval * 1.25));
  }

  if(lastError){
    throw lastError;
  }
  throw new Error(`ComfyUI timed out after ${COMFY_TIMEOUT_MS}ms`);
}

export async function generateThumbnail(analysis){

  logStep("🎨 Generating Thumbnail");

  ensureDir("thumbnails");

  const workflow = JSON.parse(
    fs.readFileSync("image_z_image_turbo.json","utf8")
  );

  if(workflow["57:13"]?.inputs){
    workflow["57:13"].inputs.width = THUMB_WIDTH;
    workflow["57:13"].inputs.height = THUMB_HEIGHT;
  }
  if(workflow["57:3"]?.inputs){
    workflow["57:3"].inputs.steps = THUMB_STEPS;
    workflow["57:3"].inputs.cfg = THUMB_CFG;
  }

  const prompt = `
${analysis.scene},
${analysis.visual},
${analysis.style},
dark cinematic,
neon city lights,
rapper portrait,
trap / drill aesthetic,
rainy night atmosphere,
dramatic rim lighting,
no text,
no logos,
no watermark,
no typography,
no play button,
no youtube icon,
ultra realistic,
cinematic color grading,
8k detail,
professional youtube thumbnail
`;

  const file = `thumbnails/thumb_${Date.now()}.png`;
  const rawFile = file.replace("thumb_", "raw_");
  workflow["57:27"].inputs.text = prompt;
  // IMPORTANT
  workflow["57:3"].inputs.seed = Math.floor(Math.random()*999999999);
  const promptId = await enqueueComfyPrompt(workflow);

  console.log("⏳ Waiting ComfyUI render...");

  let latest = await waitForComfyImage(promptId);
  if(!latest){
    throw new Error("No ComfyUI image output found");
  }
  fs.copyFileSync(latest,rawFile);

  await new Promise((resolve,reject)=>{

    exec(`
ffmpeg -y -i ${rawFile} \
-vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" \
${file}
`,(err)=>{

      if(err){
        reject(err);
        return;
      }

      resolve();
    });

  });

  console.log("✅ Thumbnail ready");
  return file;
}
