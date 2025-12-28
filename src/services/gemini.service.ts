import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from "@google/genai";

interface AiLocationResponse {
  name: string;
  lat: number;
  lng: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async getLocationFromImage(base64Image: string): Promise<AiLocationResponse | null> {
    const prompt = `Analyze the image and identify the primary location depicted. Provide the common name for the location (e.g., "Eiffel Tower", "Yosemite National Park") and its estimated geographic coordinates in decimal degrees. If a precise location cannot be determined, provide the city or region and its approximate coordinates. If no location can be identified at all, set all fields to null.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'The common name of the location.' },
              lat: { type: Type.NUMBER, description: 'The estimated latitude in decimal degrees.' },
              lng: { type: Type.NUMBER, description: 'The estimated longitude in decimal degrees.' },
            },
            required: ['name', 'lat', 'lng'],
          },
        },
      });

      const jsonString = response.text.trim();
      const result = JSON.parse(jsonString);

      // Basic validation
      if (result && typeof result.name === 'string' && typeof result.lat === 'number' && typeof result.lng === 'number') {
        return result as AiLocationResponse;
      }
      return null;
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return null;
    }
  }

  blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(blob);
    });
  }
}
