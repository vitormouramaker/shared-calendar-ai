const OPENAI_API_URL = "https://api.openai.com/v1/responses";

function extractOutputText(responseBody) {
  const output = Array.isArray(responseBody?.output) ? responseBody.output : [];

  for (const item of output) {
    if (item?.type !== "message" || !Array.isArray(item.content)) {
      continue;
    }

    const outputText = item.content.find((contentItem) => contentItem?.type === "output_text");

    if (typeof outputText?.text === "string" && outputText.text.trim()) {
      return outputText.text;
    }

    const refusal = item.content.find((contentItem) => contentItem?.type === "refusal");
    if (typeof refusal?.refusal === "string" && refusal.refusal.trim()) {
      throw new Error(refusal.refusal);
    }
  }

  if (typeof responseBody?.output_text === "string" && responseBody.output_text.trim()) {
    return responseBody.output_text;
  }

  throw new Error("The OpenAI response did not include output text.");
}

function getOpenAIConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY || null,
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  };
}

async function createStructuredResponse({ systemPrompt, userPrompt, schemaName, schema }) {
  const { apiKey, model } = getOpenAIConfig();

  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is not configured.");
    error.code = "missing_openai_key";
    throw error;
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const error = new Error(`OpenAI Responses API error ${response.status}: ${errorBody}`);
    error.code = "openai_request_failed";
    throw error;
  }

  const data = await response.json();
  const outputText = extractOutputText(data);

  return {
    data: JSON.parse(outputText),
    model,
    provider: "openai",
  };
}

module.exports = {
  createStructuredResponse,
  getOpenAIConfig,
};
