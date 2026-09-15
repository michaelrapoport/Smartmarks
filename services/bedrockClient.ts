// Small wrapper around the bedrockService that matches the shape of the Gemini API minimally
// so we don't have to rewrite the entire geminiService parsing logic right now.
import { generateContentWithBedrock } from './bedrockService';

export const getBedrockClient = () => {
    return {
        models: {
            generateContent: async ({ model, contents, responseMimeType, systemInstruction }: any) => {
                let prompt = "";

                // Extremely basic translation of Gemini payload to string prompt
                if (systemInstruction) {
                   prompt += `System: ${typeof systemInstruction === 'string' ? systemInstruction : JSON.stringify(systemInstruction)}\n\n`;
                }

                if (Array.isArray(contents)) {
                   for (const c of contents) {
                       if (c.role) prompt += `${c.role}: `;
                       if (c.parts) {
                           for (const p of c.parts) {
                               if (p.text) prompt += p.text + "\n";
                           }
                       }
                   }
                } else if (typeof contents === 'string') {
                   prompt += contents;
                } else {
                   prompt += JSON.stringify(contents);
                }

                const responseText = await generateContentWithBedrock(prompt);

                return {
                    text: responseText
                };
            }
        }
    }
};
