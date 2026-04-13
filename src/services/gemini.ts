import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini AI client
// In AI Studio Build, GEMINI_API_KEY is automatically injected into the environment.
// We use process.env.GEMINI_API_KEY which is defined in vite.config.ts
const apiKey = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export interface ResumeAnalysis {
  summary: string;
  matchPercentage: number;
  shortlistingChances: string;
  keySkillsToWorkOn: {
    skill: string;
    youtubeLink: string;
    reason: string;
  }[];
  missingKeywords: string[];
  pointsToAdd: string[];
  pointsToRemove: string[];
  interviewQuestions: {
    question: string;
    category: "personal" | "qualification" | "experience" | "career_pivot";
    reason: string;
  }[];
}

export async function analyzeResume(
  resumeText: string, 
  jobDescription: string, 
  model: string = "gemini-flash-latest"
): Promise<ResumeAnalysis> {
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    throw new Error("Gemini API key is missing. Please set GEMINI_API_KEY in the Secrets panel (Settings > Secrets) and restart the app.");
  }
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `
        You are a hiring manager with 20+ years of experience in the field described in the Job Description.
        Analyze the provided Resume against the Job Description.
        
        Job Description:
        ${jobDescription}
        
        Resume:
        ${resumeText}
        
        Instructions:
        1. Adopt the persona of a highly experienced hiring manager for this specific role.
        2. Provide a concise summary of the job description at the top.
        3. Calculate a matching percentage (0-100) and explain the chances of shortlisting.
        4. Identify key skills the candidate must work on or add. For each skill, use your search tool to find a high-quality, currently active YouTube tutorial link. 
           - CRITICAL: The link MUST be accessible in India (prioritize YouTube India results).
           - CRITICAL: Verify the link is a direct, public video URL (e.g., https://www.youtube.com/watch?v=...). 
           - DO NOT provide links to deleted, private, or region-restricted videos. 
           - If a specific video link cannot be verified as active, provide a link to a highly relevant and active YouTube search result for that skill in India.
        5. List missing keywords essential for ATS/shortlisting.
        6. Suggest key points to add and remove to improve the match score.
        7. Generate at least 10 interview questions across categories: personal, qualifications, previous work experience, and career pivot (if applicable).
        
        Return the response in JSON format.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "A summary of the job description." },
            matchPercentage: { type: Type.NUMBER, description: "Percentage match (0-100)." },
            shortlistingChances: { type: Type.STRING, description: "Explanation of shortlisting chances." },
            keySkillsToWorkOn: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  skill: { type: Type.STRING },
                  youtubeLink: { type: Type.STRING, description: "A direct YouTube video link for learning this skill." },
                  reason: { type: Type.STRING }
                },
                required: ["skill", "youtubeLink", "reason"]
              }
            },
            missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            pointsToAdd: { type: Type.ARRAY, items: { type: Type.STRING } },
            pointsToRemove: { type: Type.ARRAY, items: { type: Type.STRING } },
            interviewQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  category: { type: Type.STRING, enum: ["personal", "qualification", "experience", "career_pivot"] },
                  reason: { type: Type.STRING }
                },
                required: ["question", "category", "reason"]
              }
            }
          },
          required: ["summary", "matchPercentage", "shortlistingChances", "keySkillsToWorkOn", "missingKeywords", "pointsToAdd", "pointsToRemove", "interviewQuestions"]
        },
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    if (error.message?.includes("API key not valid")) {
      throw new Error("Gemini API key is invalid or missing. If you are using a shared link, please ensure the app owner has configured the API key correctly in the Secrets panel.");
    }
    throw error;
  }
}

export async function generateFeedbackMail(
  analysis: ResumeAnalysis,
  model: string = "gemini-flash-latest"
): Promise<string> {
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    throw new Error("Gemini API key is missing. Please set GEMINI_API_KEY in the Secrets panel.");
  }
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `
        You are a professional and empathetic recruiter. 
        Based on the following resume analysis, write a motivating feedback email to the candidate.
        
        Analysis Summary: ${analysis.summary}
        Match Percentage: ${analysis.matchPercentage}%
        Shortlisting Chances: ${analysis.shortlistingChances}
        Missing Keywords: ${analysis.missingKeywords.join(", ")}
        Skills to work on: ${analysis.keySkillsToWorkOn.map(s => s.skill).join(", ")}
        
        Tone: 
        - Professional yet very motivating.
        - Acknowledge their strengths.
        - Provide constructive feedback on what's missing.
        - Encourage them to prepare, improve their resume based on the suggestions, and apply again.
        - Make them feel valued and capable of reaching their career goals.
        
        Format:
        - Subject line included.
        - Professional greeting and closing.
        - Clear paragraphs.
      `,
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return text;
  } catch (error: any) {
    console.error("Gemini Mail Error:", error);
    throw error;
  }
}

export async function regenerateResume(
  resumeText: string, 
  jobDescription: string, 
  analysis: ResumeAnalysis,
  model: string = "gemini-flash-latest"
): Promise<string> {
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    throw new Error("Gemini API key is missing. Please set GEMINI_API_KEY in the Secrets panel.");
  }
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `
        You are a world-class resume architect and ATS optimization expert. 
        Your task is to REWRITE the provided Resume to maximize its impact for the specific Job Description, using the latest ATS-friendly terminology and insights from the analysis.
        
        CRITICAL REQUIREMENT: 
        - DO NOT OMIT ANY ORIGINAL DETAILS. 
        - Keep all contact information, education history, company names, job titles, dates, and project names EXACTLY as they are in the original resume.
        - Your goal is to OPTIMIZE THE WORDING of the bullet points and summary, not to delete content.
        - If the original resume has a section, the rewritten resume MUST have that section with all its original data points.
        
        Original Resume:
        ${resumeText}
        
        Job Description:
        ${jobDescription}
        
        Analysis Suggestions to Integrate:
        - Missing Keywords: ${analysis.missingKeywords.join(", ")}
        - Skills to emphasize: ${analysis.keySkillsToWorkOn.map(s => s.skill).join(", ")}
        - Points to add/strengthen: ${analysis.pointsToAdd.join("; ")}
        - Points to rephrase/refine: ${analysis.pointsToRemove.join("; ")}
        
        Instructions:
        1. Rewrite the resume in a professional, high-impact, and modern tone.
        2. Seamlessly integrate the missing keywords into the summary, experience descriptions, and skills sections without sounding forced.
        3. Use the "Points to add" to expand on existing experiences or the summary.
        4. Use the "Points to rephrase" to improve weak or passive language into strong, result-oriented bullet points.
        5. Maintain the EXACT same structure and flow as the original resume, but with "polished" content.
        6. Use powerful action verbs (e.g., "Spearheaded", "Orchestrated", "Optimized") and ensure achievements are quantifiable where possible.
        7. The final output MUST be in clear, well-formatted Markdown.
        
        Output ONLY the rewritten resume in Markdown.
      `,
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return text;
  } catch (error: any) {
    console.error("Gemini Regeneration Error:", error);
    throw error;
  }
}
