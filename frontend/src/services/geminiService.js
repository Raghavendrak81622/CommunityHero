// Helper to convert a browser File object into base64 inline data for Gemini Multimodal API
const fileToGenerativePart = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const geminiService = {
  analyzeIssue: async (issueData, imageFile) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Environment variable VITE_GEMINI_API_KEY is missing. Gemini AI analysis features will fail.");
      throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your env variables.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    let prompt = `
You are an expert AI municipal inspector and civic technician.
Analyze this community hazard report and evaluate the issue to provide structured analysis details:

Report Details:
- Title: ${issueData.title}
- Description: ${issueData.description}
- Category: ${issueData.category}
- Location Address: ${issueData.location}
- Pincode: ${issueData.pincode}
- Image URL: ${issueData.imageUrl || 'No image uploaded'}
`;

    if (imageFile) {
      prompt += `
Since an image is attached, please perform a detailed Vision analysis of the image to identify the civic issue.
Evaluate whether the image matches the selected category "${issueData.category}". If not, suggest the correct category from standard civic departments.
Identify specific objects in the image, estimate the damage level, and calculate a confidence score.
`;
    }

    prompt += `
Please review all details and respond strictly in JSON matching the requested responseSchema.
`;

    // Define parts for multimodal vs text-only
    const parts = [{ text: prompt }];
    if (imageFile) {
      const imagePart = await fileToGenerativePart(imageFile);
      parts.push(imagePart);
    }

    // Set schema dynamically based on whether there is an image
    const properties = {
      professionalTitle: { type: "STRING" },
      professionalDescription: { type: "STRING" },
      suggestedCategory: { type: "STRING" },
      priority: { type: "STRING", enum: ["Low", "Medium", "High", "Critical"] },
      severityScore: { type: "INTEGER" },
      responsibleDepartment: { type: "STRING" },
      estimatedResolutionTime: { type: "STRING" },
      possibleCauses: { type: "ARRAY", items: { type: "STRING" } },
      recommendedActions: { type: "ARRAY", items: { type: "STRING" } },
      safetyAdvice: { type: "ARRAY", items: { type: "STRING" } },
      aiSummary: { type: "STRING" }
    };

    const required = [
      "professionalTitle",
      "professionalDescription",
      "suggestedCategory",
      "priority",
      "severityScore",
      "responsibleDepartment",
      "estimatedResolutionTime",
      "possibleCauses",
      "recommendedActions",
      "safetyAdvice",
      "aiSummary"
    ];

    if (imageFile) {
      properties.visionAnalysis = {
        type: "OBJECT",
        properties: {
          issueType: { type: "STRING" },
          objectsPresent: { type: "ARRAY", items: { type: "STRING" } },
          damageLevel: { type: "STRING", enum: ["Low", "Medium", "High", "Severe"] },
          estimatedSeverity: { type: "INTEGER" },
          confidenceScore: { type: "NUMBER" },
          isCategoryMatch: { type: "BOOLEAN" },
          recommendedCategory: { type: "STRING" },
          aiRemarks: { type: "STRING" }
        },
        required: [
          "issueType",
          "objectsPresent",
          "damageLevel",
          "estimatedSeverity",
          "confidenceScore",
          "isCategoryMatch",
          "recommendedCategory",
          "aiRemarks"
        ]
      };
      required.push("visionAnalysis");
    }

    const requestBody = {
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties,
          required
        }
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errBody = await response.json();
      throw new Error(errBody.error?.message || "Failed to analyze with Gemini.");
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error("Empty analysis payload from Gemini.");
    }

    return JSON.parse(resultText);
  },

  parseNaturalLanguageSearch: async (queryText) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Environment variable VITE_GEMINI_API_KEY is missing. Gemini AI Search features will fail.");
      throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your env variables.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
You are an expert AI search triager for a civic issue reporting application "Community Hero".
Convert the following natural language search query into a structured set of filters.

Search Query: "${queryText}"

Available Categories:
- Roads & Potholes
- Street Lights
- Water Supply
- Drainage & Sewage
- Garbage & Waste Management
- Electricity
- Traffic & Parking
- Public Transport
- Parks & Playgrounds
- Environment & Pollution
- Safety & Crime
- Health & Sanitation
- Government Facilities
- Animal Issues
- Encroachment
- Construction Issues
- Internet & Telecom
- Public Property Damage
- Flooding
- Other

Available Statuses:
- Reported
- Investigating
- In Progress
- Resolved

Available Priorities:
- Low
- Medium
- High
- Critical

Analyze the query:
1. Extract any text search terms (e.g. "potholes", "leaks") into "textQuery".
2. Match any implied Category, Priority, or Status from the lists above.
3. Identify if the query specifies a time range (today, week, month, year).
4. Detect if the user specified a location filter near themselves (e.g. "near me", "around here") and set "nearMe" to true.
5. Estimate if a minimum AI severity score is implied (e.g. "severe potholes" implies a high minimum severity score, e.g. 7 or 8).

Respond strictly in JSON matching the requested responseSchema.
`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            textQuery: { type: "STRING" },
            category: { type: "STRING" },
            priority: { type: "STRING", enum: ["Low", "Medium", "High", "Critical"] },
            status: { type: "STRING", enum: ["Reported", "Investigating", "In Progress", "Resolved"] },
            timeRange: { type: "STRING", enum: ["today", "week", "month", "year"] },
            nearMe: { type: "BOOLEAN" },
            minSeverityScore: { type: "INTEGER" }
          },
          required: ["textQuery", "category", "priority", "status", "timeRange", "nearMe", "minSeverityScore"]
        }
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errBody = await response.json();
      throw new Error(errBody.error?.message || "Failed to parse query with Gemini.");
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini AI.");
    }

    return JSON.parse(resultText);
  }
};
