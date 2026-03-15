import { generateLyrics, analyzeLyrics } from "./lyrics.js";
import { generateThumbnail } from "./thumbnail.js";
import { renderVideo } from "./video.js";
import { authorize, uploadVideo } from "./youtube.js";
import { generateTitle } from "./title.js";
import { generateDescription } from "./description.js";
import { generateHashtags } from "./hashtags.js";

function logStep(msg){
  console.log("\n==============================");
  console.log(msg);
  console.log("==============================\n");
}

async function run(){

  try{

    logStep("🚀 AI RAP PIPELINE START");

    const lyrics = await generateLyrics();

    const analysis = await analyzeLyrics(lyrics);

    logStep("🧾 Generating Metadata");
    const title = generateTitle(lyrics, analysis);
    const hashtags = generateHashtags(lyrics, analysis);
    const description = generateDescription(lyrics, analysis, hashtags);
    const tags = hashtags.map(tag => tag.replace(/^#/, ""));
    const metadata = { title, description, tags };

    console.log("Title:",title);

    const thumbnailPromise = generateThumbnail(analysis);
    const authPromise = authorize();

    const thumbnailPath = await thumbnailPromise;

    const video = await renderVideo(thumbnailPath);

    const auth = await authPromise;

    await uploadVideo(auth,video,metadata,thumbnailPath);

    logStep("✅ PIPELINE COMPLETE");

  }catch(err){

    console.error("💥 Pipeline Error");
    console.error(err);

  }

}

run();
