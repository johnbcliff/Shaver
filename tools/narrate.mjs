// Turn a text or Markdown file into narration audio with ElevenLabs.
//
//   npm run narrate -- README.md
//   npm run narrate -- Assets/Scripts/intro.txt --out Assets/Audio/intro.mp3
//   npm run narrate -- README.md --dry-run      (print the spoken text, make no audio)
//
// The API key is read from ELEVENLABS_API_KEY, which `npm run narrate` loads from .env.local.

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { Readable } from "node:stream";
import { parseArgs } from "node:util";

const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George (pre-made, narrative)
const DEFAULT_MODEL_ID = "eleven_v4";
const OUTPUT_DIR = join("Assets", "Audio");
const MAX_CHARS_PER_REQUEST = 3000;

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string" },
    voice: { type: "string", default: DEFAULT_VOICE_ID },
    model: { type: "string", default: DEFAULT_MODEL_ID },
    "dry-run": { type: "boolean", default: false },
  },
});

const inputPath = positionals[0];
if (!inputPath) {
  console.error("Usage: npm run narrate -- <file.md|file.txt> [--out file.mp3] [--voice id] [--model id] [--dry-run]");
  process.exit(1);
}

/** Strip Markdown syntax so only the words meant to be heard remain. */
function markdownToSpokenText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, "") // fenced code blocks
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links: keep the link text
    .replace(/<[^>]+>/g, "") // inline HTML
    .replace(/^[ \t]*#{1,6}[ \t]*(.*?)[ \t]*#*[ \t]*$/gm, (_, heading) => (/[.!?:]$/.test(heading) ? heading : `${heading}.`))
    .replace(/^\s*[-*+]\s+/gm, "") // bullet markers
    .replace(/^\s*>\s?/gm, "") // block quotes
    .replace(/(\*\*|__|\*|_|`)/g, "") // emphasis and inline code marks
    .replace(/(\w)--(\w)/g, "$1, $2") // typed dashes read better as a pause
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");
}

/** Group paragraphs into requests that stay under the per-request size. */
function splitIntoRequests(text) {
  const requests = [];
  let current = "";
  for (const paragraph of text.split("\n\n")) {
    if (current && current.length + paragraph.length + 2 > MAX_CHARS_PER_REQUEST) {
      requests.push(current);
      current = "";
    }
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  if (current) requests.push(current);
  return requests;
}

const source = await readFile(inputPath, "utf8");
const spokenText = extname(inputPath).toLowerCase() === ".md" ? markdownToSpokenText(source) : source.trim();

if (!spokenText) {
  console.error(`Nothing to narrate in ${inputPath}.`);
  process.exit(1);
}

if (options["dry-run"]) {
  console.log(spokenText);
  console.log(`\n(${spokenText.length} characters; no audio made)`);
  process.exit(0);
}

if (!process.env.ELEVENLABS_API_KEY) {
  console.error("ELEVENLABS_API_KEY is not set. Run this through `npm run narrate`, which loads .env.local.");
  process.exit(1);
}

const outputPath = options.out ?? join(OUTPUT_DIR, `${basename(inputPath, extname(inputPath))}.mp3`);
await mkdir(dirname(outputPath), { recursive: true });

const client = new ElevenLabsClient();
const requests = splitIntoRequests(spokenText);
const output = createWriteStream(outputPath);

try {
  for (let i = 0; i < requests.length; i++) {
    const audio = await client.textToSpeech.convert(options.voice, {
      text: requests[i],
      modelId: options.model,
      outputFormat: "mp3_44100_128",
      voiceSettings: { stability: 0.7, similarityBoost: 0.5 }, // narration preset
      // Neighbouring text keeps tone and pacing steady across request boundaries.
      previousText: requests[i - 1],
      nextText: requests[i + 1],
    });
    for await (const chunk of Readable.fromWeb(audio)) {
      output.write(chunk);
    }
    console.log(`Part ${i + 1} of ${requests.length} done.`);
  }
} catch (error) {
  console.error(`ElevenLabs request failed: ${error.message ?? error}`);
  process.exitCode = 1;
} finally {
  await new Promise((resolve) => output.end(resolve));
}

if (!process.exitCode) {
  console.log(`Wrote ${outputPath} (${spokenText.length} characters spoken).`);
}
