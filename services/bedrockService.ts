export const generateContentWithBedrock = async (prompt: string): Promise<string> => {
    const modelId = localStorage.getItem('smartmark_bedrock_model') || 'anthropic.claude-3-sonnet-20240229-v1:0';

    console.log(`Sending prompt to Bedrock model ${modelId}:`, prompt);

    try {
        const response = await fetch('/api/bedrock-invoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelId, prompt })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to invoke Bedrock');
        }

        return data.result;
    } catch (e: any) {
        console.error("Bedrock invocation error:", e);
        throw e;
    }
};
