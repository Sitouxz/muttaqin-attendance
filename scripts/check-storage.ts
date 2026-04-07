import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Manually load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};
envContent.split("\n").forEach(line => {
  const [key, ...value] = line.split("=");
  if (key && value) {
    envVars[key.trim()] = value.join("=").trim();
  }
});

const supabaseUrl = envVars["NEXT_PUBLIC_SUPABASE_URL"];
const serviceKey = envVars["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !serviceKey) {
  console.error("Supabase URL or Service Key not found in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkBucket() {
  console.log(`Checking project: ${supabaseUrl}`);
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error("Error listing buckets:", listError);
    return;
  }
  
  const qrBucket = buckets.find(b => b.name === "qr-codes");
  if (!qrBucket) {
    console.log("Bucket 'qr-codes' does not exist. Creating it...");
    const { error: createError } = await supabase.storage.createBucket("qr-codes", {
      public: true,
      allowedMimeTypes: ["image/png"],
    });
    if (createError) {
      console.error("Error creating bucket:", createError);
    } else {
      console.log("Bucket 'qr-codes' created successfully and set to public.");
    }
  } else {
    console.log("Bucket 'qr-codes' exists.");
    console.log("Is public:", qrBucket.public);
    if (!qrBucket.public) {
      console.log("Updating bucket 'qr-codes' to be public...");
      const { error: updateError } = await supabase.storage.updateBucket("qr-codes", {
        public: true,
      });
      if (updateError) {
        console.error("Error updating bucket:", updateError);
      } else {
        console.log("Bucket 'qr-codes' is now public.");
      }
    }
  }
}

checkBucket().catch(console.error);
