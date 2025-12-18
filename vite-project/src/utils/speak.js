// Use direct URL - set VITE_API_URL in .env to override
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.100.100:8000'

export async function speak(text) {
  const url = `${API_BASE_URL}/api/tts`
  
  console.log('Calling TTS API:', url)
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      let errorMessage = errorData.error || errorData.message || `Failed to generate speech: ${res.status} ${res.statusText}`
      
      // Handle specific error codes
      if (res.status === 429) {
        if (errorMessage.includes('quota') || errorMessage.includes('exceeded')) {
          errorMessage = 'API quota exceeded. Please check your OpenAI account billing and usage limits.'
        } else {
          errorMessage = 'Too many requests. Please try again later.'
        }
      } else if (res.status === 401) {
        errorMessage = 'Authentication failed. Please check your API key configuration.'
      } else if (res.status === 500 && errorMessage.includes('API key')) {
        errorMessage = 'OpenAI API key not configured or invalid.'
      }
      
      console.error('TTS API Error:', errorMessage, errorData)
      throw new Error(errorMessage)
    }

    const data = await res.json()
    
    if (!data.url) {
      throw new Error('No audio URL returned from server')
    }

    return data.url
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      throw new Error('Cannot connect to backend server. Make sure Laravel backend is running on http://192.168.100.100:8000')
    }
    throw error
  }
}
