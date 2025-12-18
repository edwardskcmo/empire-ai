// Empire AI - ElevenLabs Text-to-Speech API
// Version 2.0 - With voice settings (speed, stability)

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, voice_settings } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  // Check for API key
  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(401).json({ error: 'ElevenLabs API key not configured' });
  }

  if (!process.env.ELEVENLABS_VOICE_ID) {
    return res.status(401).json({ error: 'ElevenLabs Voice ID not configured' });
  }

  try {
    // Default voice settings - slower and more stable for natural speech
    const defaultSettings = {
      stability: 0.75,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
    };

    // Merge with any provided settings
    const finalSettings = {
      ...defaultSettings,
      ...(voice_settings || {}),
    };

    // Build request body
    const requestBody = {
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: finalSettings.stability,
        similarity_boost: finalSettings.similarity_boost,
        style: finalSettings.style || 0,
        use_speaker_boost: finalSettings.use_speaker_boost !== false,
      },
    };

    // ElevenLabs API URL - using stream endpoint with output_format for better quality
    const voiceId = process.env.ELEVENLABS_VOICE_ID;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'ElevenLabs API error',
        details: errorText 
      });
    }

    // Get audio as buffer
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    return res.status(200).json({
      audio: base64Audio,
      contentType: 'audio/mpeg',
    });

  } catch (error) {
    console.error('Text-to-speech error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate speech',
      details: error.message 
    });
  }
}
