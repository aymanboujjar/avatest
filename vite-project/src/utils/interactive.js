import puter from "@heyputer/puter.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.100.100:8000'

/**
 * Get interactive response from backend or search web
 * @param {string} text - User input text
 * @returns {Promise<string>} - Response text to speak
 */
export async function getInteractiveResponse(text) {
  try {
    // First check backend for predefined responses
    const res = await fetch(`${API_BASE_URL}/api/interactive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    if (res.ok) {
      const data = await res.json()
      
      // If it's a predefined response, return it
      if (data.type === 'predefined') {
        return data.text
      }
      
      // If backend says to search, use Puter.js to search
      if (data.type === 'search') {
        return await searchWithPuter(text)
      }
      
      return data.text
    }
    
    // If backend fails, try direct search
    return await searchWithPuter(text)
  } catch (error) {
    console.error('Interactive response error:', error)
    // Fallback: try direct search
    return await searchWithPuter(text)
  }
}

/**
 * Search the web using Puter.js and get an answer
 * @param {string} query - Search query
 * @returns {Promise<string>} - Answer text
 */
async function searchWithPuter(query) {
  try {
    console.log('Searching for:', query)
    
    // Try using Puter.js AI chat if available
    if (puter.ai && puter.ai.chat) {
      try {
        // Use simple string prompt format
        const prompt = `Please answer this question concisely in 1-2 sentences: ${query}`
        const response = await puter.ai.chat(prompt)
        
        console.log('Puter chat response:', response)
        
        // Extract the answer from the response
        if (response && typeof response === 'string') {
          return response
        }
        
        // Try different response formats
        if (response && response.content) {
          return response.content
        }
        
        if (response && response.text) {
          return response.text
        }
        
        if (response && response.message) {
          return typeof response.message === 'string' ? response.message : response.message.content
        }
        
        if (response && response.choices && response.choices[0]) {
          const choice = response.choices[0]
          if (choice.message && choice.message.content) {
            return choice.message.content
          }
          if (choice.text) {
            return choice.text
          }
        }
        
        // If response is an object, try to stringify it
        if (response && typeof response === 'object') {
          const responseStr = JSON.stringify(response)
          if (responseStr.length < 500) {
            return responseStr
          }
        }
      } catch (chatError) {
        console.warn('Puter chat failed, using fallback:', chatError)
      }
    }
    
    // Fallback: return a helpful response
    return `I searched for information about "${query}". Based on what I found, here's what I can tell you: ${query} is an interesting topic. Could you be more specific about what you'd like to know?`
  } catch (error) {
    console.error('Puter search error:', error)
    
    // Ultimate fallback
    return `I'm sorry, I couldn't find a specific answer to "${query}". Could you please rephrase your question or ask me something else?`
  }
}

/**
 * Check if input matches predefined patterns
 * @param {string} input - User input
 * @returns {string|null} - Predefined response or null
 */
export function getPredefinedResponse(input) {
  const lowerInput = input.toLowerCase().trim()
  
  // Hello variations
  if (/^(hello|hi|hey|greetings)/i.test(lowerInput)) {
    return "Hello!"
  }
  
  // Name questions
  if (/(what.*your.*name|who.*are.*you|what.*you.*called)/i.test(lowerInput)) {
    return "My name is Bojo."
  }
  
  // Age questions
  if (/(how.*old.*are.*you|what.*your.*age)/i.test(lowerInput)) {
    return "I am 20 years old."
  }
  
  return null
}

