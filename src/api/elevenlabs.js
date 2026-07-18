// ElevenLabs layer — used for two things only, both utility rather than a
// primary feature: (1) speech-to-text for the recipe search mic (replacing
// the Web Speech API, which is broken inside packaged Electron builds), and
// (2) text-to-speech to read a recipe's instructions aloud hands-free while
// cooking. Recipes themselves still come from Spoonacular/TheMealDB — this
// file never generates or invents recipe content.

const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const VOICES_URL = "https://api.elevenlabs.io/v1/voices";

// Free-tier accounts can't use arbitrary "voice library" IDs via the API
// (e.g. the old Rachel/Domi/etc. shared voices) — only voices already saved
// to the account's own library. Rather than hardcode one that may not exist
// on a given account, fetch the account's actual voices once and cache the
// first result. Override with VITE_ELEVENLABS_VOICE_ID if you want a
// specific one.
const VOICE_OVERRIDE = import.meta.env.VITE_ELEVENLABS_VOICE_ID;
let cachedVoiceId = null;

function requireKey() {
  if (!API_KEY) {
    throw new Error("No ElevenLabs API key found. Add VITE_ELEVENLABS_API_KEY to your .env file.");
  }
}

async function resolveVoiceId() {
  if (VOICE_OVERRIDE) return VOICE_OVERRIDE;
  if (cachedVoiceId) return cachedVoiceId;

  const res = await fetch(VOICES_URL, { headers: { "xi-api-key": API_KEY } });
  if (!res.ok) throw await describeError(res, "ElevenLabs voice lookup");

  const data = await res.json();
  const voice = data.voices?.[0];
  if (!voice) {
    throw new Error(
      "No voices found in your ElevenLabs library. Add a voice at elevenlabs.io/app/voice-library (click \"Add to my voices\" on any default voice), then try again."
    );
  }
  cachedVoiceId = voice.voice_id;
  return cachedVoiceId;
}

// ElevenLabs error bodies are JSON like { detail: { status, message } } or
// { detail: "..." }. Pull the real reason out instead of surfacing a bare
// status code, since "402" alone doesn't say whether it's quota, billing,
// or something else.
async function describeError(res, label) {
  let detail = "";
  try {
    const body = await res.json();
    detail = body?.detail?.message || (typeof body?.detail === "string" ? body.detail : "") || "";
  } catch {
    // Response wasn't JSON — fall back to the status code alone.
  }
  const err = new Error(`${label} failed (${res.status})${detail ? `: ${detail}` : ""}`);
  err.status = res.status;
  return err;
}

// Transcribes a recorded audio Blob (e.g. from MediaRecorder) to text using
// ElevenLabs Scribe. Returns the transcript string, or "" if nothing was
// understood.
export async function transcribeAudio(blob) {
  requireKey();

  const form = new FormData();
  form.append("file", blob, "recording.webm");
  form.append("model_id", "scribe_v1");

  const res = await fetch(STT_URL, {
    method: "POST",
    headers: { "xi-api-key": API_KEY },
    body: form,
  });

  if (!res.ok) {
    throw await describeError(res, "ElevenLabs transcription");
  }

  const data = await res.json();
  return (data.text || "").trim();
}

// Converts text to speech and returns a playable object URL (mp3). Caller is
// responsible for revoking the URL when done (e.g. on audio "ended").
// Free-tier credits are consumed per character, so a long recipe's
// instructions can burn through the monthly allowance in a handful of
// clicks. Capping here keeps each read-aloud affordable; the cut text still
// covers the first several steps in practice.
const MAX_TTS_CHARS = 800;

export async function textToSpeech(text, voiceId) {
  requireKey();

  const resolvedVoiceId = voiceId || (await resolveVoiceId());
  const trimmed = text.length > MAX_TTS_CHARS ? `${text.slice(0, MAX_TTS_CHARS)}…` : text;

  const res = await fetch(`${TTS_URL}/${resolvedVoiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: trimmed,
      model_id: "eleven_multilingual_v2",
    }),
  });

  if (!res.ok) {
    throw await describeError(res, "ElevenLabs text-to-speech");
  }

  const audioBlob = await res.blob();
  return URL.createObjectURL(audioBlob);
}
