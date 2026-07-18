// AI recipe generation — deliberately a *fallback*, not a feature pillar.
// This only gets called from AIFallback.jsx, which only appears when a real
// Spoonacular/TheMealDB search comes back sparse. Every recipe generated
// here is clearly labeled as AI-made in the UI (no sourceUrl, no pretending
// it's a real recipe from a real kitchen).
//
// Uses Groq (OpenAI-compatible API, running open models like Llama) rather
// than Anthropic or Gemini — both hit billing/spend-cap friction. Groq's
// free tier has no spend cap or card requirement, just rate limits.

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

function requireKey() {
  if (!API_KEY) {
    throw new Error("No Groq API key found. Add VITE_GROQ_API_KEY to your .env file.");
  }
}

// filters: { ingredients: string[], mealType, mood, diet, cuisine }
// Returns { title, ingredients: string[], instructions: string, readyInMinutes }
export async function generateRecipe(filters = {}) {
  requireKey();

  const { ingredients = [], mealType, mood, diet, cuisine } = filters;

  const constraints = [
    ingredients.length ? `Primarily uses these pantry ingredients: ${ingredients.join(", ")}.` : null,
    mealType ? `Meal course: ${mealType}.` : null,
    mood ? `Mood/style: ${mood}.` : null,
    diet ? `Dietary requirement: ${diet}.` : null,
    cuisine ? `Cuisine: ${cuisine}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const prompt = `Invent one simple, realistic home-cook recipe. ${constraints}
Respond with ONLY a JSON object, no markdown fences, no commentary, in exactly this shape:
{"title": string, "readyInMinutes": number, "ingredients": string[], "instructions": string}
"ingredients" should be short lowercase items (e.g. "2 eggs", "1 cup rice"). "instructions" should be 3-6 numbered steps as a single string separated by newlines.`;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || "";
    } catch {
      // Response wasn't JSON — fall back to the status code alone.
    }
    const err = new Error(`Groq request failed (${res.status})${detail ? `: ${detail}` : ""}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content?.trim() || "";

  // Strip markdown code fences if the model adds them despite instructions.
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Couldn't parse the AI's recipe response.");
  }

  return {
    id: `ai-${Date.now()}`,
    title: parsed.title || "AI-generated recipe",
    image: null,
    readyInMinutes: parsed.readyInMinutes ?? null,
    difficulty: null,
    sourceUrl: null,
    ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
    instructions: parsed.instructions || "",
    aiGenerated: true,
  };
}
