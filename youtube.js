import fs from "fs";
import { google } from "googleapis";
import open from "open";
import readline from "readline";

const SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];
const TOKEN_PATH = "token.json";

function logStep(msg){
  console.log("\n==============================");
  console.log(msg);
  console.log("==============================\n");
}

export function authorize(){

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

export async function uploadVideo(auth,video,meta,thumbnailPath){

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

  if(thumbnailPath && fs.existsSync(thumbnailPath)){
    try{
      await youtube.thumbnails.set({
        videoId: res.data.id,
        media:{
          body: fs.createReadStream(thumbnailPath)
        }
      });
      console.log("✅ Thumbnail set");
    }catch(err){
      console.warn("⚠️ Thumbnail upload failed");
      console.warn(err?.message || err);
    }
  }

}
