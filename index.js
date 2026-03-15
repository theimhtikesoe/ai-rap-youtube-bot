import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

console.log("API Loaded:", process.env.OPENAI_API_KEY);

async function test() {
  const res = await openai.images.generate({
    model: "gpt-image-1",
    prompt: "dark rap album cover, neon city, night mood",
    size: "1024x1024"
  });

  console.log(res.data[0].url);
}

test();