
import { GoogleGenAI } from "@google/genai";
import { Settings, Summary, ProcessedLogEntry } from '../types';

function formatHours(hours: number): string {
    if (!isFinite(hours) || hours < 0) return "--:--:--";
    const totalSeconds = Math.floor(hours * 3600);
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

export async function getGeminiSummary(
    processedLog: ProcessedLogEntry[], 
    summary: Summary, 
    settings: Settings
): Promise<string> {
    
    if (!process.env.API_KEY) {
        return "API Key is not configured. Please set the API_KEY environment variable.";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemPrompt = `Act as a power systems technician. Analyze the following UPS battery log data and forecast.
Provide a concise, professional summary (3-4 sentences) of the event.
Mention the key event (e.g., discharge, charge cycle), the approximate load, the voltage range observed, and the final estimated runtime (if discharging).
Keep it brief and to the point.`;

    const userQuery = `
Data Analysis Request:
- Battery Settings: ${settings.batteryCapacityAh}Ah, ${settings.nominalVoltage}V
- UPS Rated: ${settings.upsRatedW}W
- Minimum Discharge Voltage: ${settings.minVoltage}V

Live Status Summary:
- Last State of Charge (SoC): ${summary.soc.toFixed(1)}%
- Amp-hours Remaining: ${summary.ahRemaining.toFixed(2)} Ah
- Last Current Draw: ${summary.currentDraw.toFixed(2)} A
- Last Recorded Voltage: ${summary.lastVoltage.toFixed(2)} V
- Estimated Runtime Remaining: ${formatHours(summary.runtime)}

Event Log Data (chronological):
${processedLog.map(p => `  - Time: ${p.dt.toLocaleTimeString()}, Voltage: ${p.voltage.toFixed(2)}V, Load: ${p.watts.toFixed(1)}W, Charging: ${p.charging}, Ah Remaining: ${p.ahRem.toFixed(2)}Ah`).join('\n')}

Please generate the summary.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: userQuery }] }],
            config: {
                systemInstruction: systemPrompt
            }
        });

        const text = response.text;
        if (text) {
            return text;
        } else {
            throw new Error("No content found in API response.");
        }
    } catch (error) {
        console.error("Gemini API call failed:", error);
        if (error instanceof Error) {
            return `Error generating summary: ${error.message}`;
        }
        return "An unknown error occurred while generating the summary.";
    }
}
