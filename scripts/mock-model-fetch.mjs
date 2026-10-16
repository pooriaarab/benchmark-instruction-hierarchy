// E2E-only stub loaded via `node --import`: replaces global fetch so
// OpenRouter chat calls return a fixed refusal answer offline.
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
  if (!url.includes("openrouter.ai")) return realFetch(input, init);
  return new Response(
    JSON.stringify({
      choices: [{ message: { role: "assistant", content: "I decline to answer." } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15, cost: 0 },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
};
