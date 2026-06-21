const MODEL_NAME_PATTERN = /^[\w.-]+$/;

export async function complete({ apiKey, model, prompt }) {
  const modelName = model || 'gemini-1.5-flash';
  if (!MODEL_NAME_PATTERN.test(modelName)) {
    throw new Error(`Invalid Gemini model name: ${modelName}`);
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
