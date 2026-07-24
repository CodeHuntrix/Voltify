// src/services/llmService.js
const http = require('https');

/**
 * Helper to call Groq Chat Completion API using raw HTTP request
 */
async function callGroqAPI(messages, jsonMode = false) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set in environment variables');
  }

  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const isPromptGuard = model.includes('prompt-guard');
  const payload = JSON.stringify({
    model: model,
    messages: messages,
    temperature: jsonMode ? 0.0 : 0.7,
    max_tokens: isPromptGuard ? 256 : 1024,
    ...(jsonMode && !isPromptGuard ? { response_format: { type: 'json_object' } } : {})
  });

  const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    },
    timeout: 10000 // 10 second timeout
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode !== 200) {
            return reject(new Error(parsed.error?.message || `Groq API returned status ${res.statusCode}`));
          }
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse Groq response: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Groq API request timed out'));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Fallback Regex bill text parser if Groq is down or fails
 */
function parseBillTextFallback(text) {
  console.log('[llmService] Executing high-fidelity regex bill parser fallback...');
  console.log('[llmService] Text to parse:', JSON.stringify(text));
  let billAmount = 3200; // Sensible defaults
  let units = 400;

  // Regex to match bill amounts (e.g. ₹ 4,500.00, Rs. 3200, Total: 1500)
  const amountRegexes = [
    /(?:net\s+)?(?:payable|amount|bill|total)(?:\s+amount)?\s*(?:rs\.?|inr|₹)?\s*[:=-]?\s*([0-9,]+(?:\.[0-9]{2})?)/i,
    /₹\s*([0-9,]+(?:\.[0-9]{2})?)/,
    /rs\.?\s*([0-9,]+(?:\.[0-9]{2})?)/i,
    /([0-9,]+(?:\.[0-9]{2})?)\s*(?:rupees|\/-)/i
  ];

  for (const regex of amountRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const cleanVal = parseFloat(match[1].replace(/,/g, ''));
      if (cleanVal > 100 && cleanVal < 100000) {
        billAmount = Math.round(cleanVal);
        break;
      }
    }
  }

  // Regex to match energy units (e.g. 450 units, 450 kWh, consumption: 320)
  const unitsRegexes = [
    /([0-9,]+)\s*(?:kwh|units|consumption)/i,
    /(?:total\s+)?units\s*(?:consumed)?\s*[:=-]?\s*([0-9,]+)/i,
    /consumption\s*[:=-]?\s*([0-9,]+)/i
  ];

  for (const regex of unitsRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const cleanVal = parseInt(match[1].replace(/,/g, ''), 10);
      if (cleanVal > 10 && cleanVal < 15000) {
        units = cleanVal;
        break;
      }
    }
  }

  // Detect billing month from common Indian utility bill date patterns
  let billingMonth = null;
  const MONTH_NAMES = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    january: '01', february: '02', march: '03', april: '04',
    june: '06', july: '07', august: '08', september: '09',
    october: '10', november: '11', december: '12'
  };

  const monthRegexes = [
    // "Billing Period: 01/06/2026 to 30/06/2026" or "Bill Period: June 2026"
    /(?:bill(?:ing)?\s*(?:period|month|date|for))\s*[:\-]?\s*(\w+)\s+(20\d{2})/i,
    // "For the month of June 2026"
    /for\s+(?:the\s+)?month\s+of\s+(\w+)\s+(20\d{2})/i,
    // "June 2026" standalone
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(20\d{2})/i,
    // "06/2026" or "06-2026"
    /(0[1-9]|1[0-2])[/\-](20\d{2})/,
    // "2026-06"
    /(20\d{2})-(0[1-9]|1[0-2])/,
  ];

  for (const regex of monthRegexes) {
    const match = text.match(regex);
    if (match) {
      // Named month + year
      if (match[1] && isNaN(Number(match[1]))) {
        const mon = MONTH_NAMES[match[1].toLowerCase().substring(0, 3)];
        if (mon && match[2]) {
          billingMonth = `${match[2]}-${mon}`;
          break;
        }
      }
      // MM/YYYY
      if (match[1] && match[2] && match[1].length <= 2) {
        billingMonth = `${match[2]}-${match[1].padStart(2, '0')}`;
        break;
      }
      // YYYY-MM
      if (match[1] && match[1].length === 4) {
        billingMonth = `${match[1]}-${match[2]}`;
        break;
      }
    }
  }

  return { bill_amount: billAmount, units, billing_month: billingMonth };
}

/**
 * Local Rule-based NLP chatbot coach fallback
 */
function chatWithVoltFallback(userMessage) {
  console.log('[llmService] Executing Volt chatbot local NLP fallback...');
  const msg = userMessage.toLowerCase();

  const replies = [
    {
      keys: ['hi', 'hello', 'hey', 'greetings', 'who are you', 'what is your name'],
      reply: "Hey! I'm Volt, your energy conservation coach. ⚡ Ask me anything about electricity rates, reducing consumption, BEE standard settings, or optimizing your bills!"
    },
    {
      keys: ['ac', 'air conditioner', 'cooling', 'temp', 'temperature'],
      reply: "Adjusting your AC is the single easiest way to save money! ❄️ BEE (Bureau of Energy Efficiency) recommends keeping it at 24°C. Every 1°C increase saves roughly 6% on your compressor load!"
    },
    {
      keys: ['geyser', 'water heater', 'shower', 'hot water'],
      reply: "Water heaters consume massive power (around 3kW). 🚿 Save by shifting run-times from peak hours (6–9 PM) to off-peak early mornings (6–9 AM). Also, lowering the thermostat to 50°C cuts standby heat loss by 3%!"
    },
    {
      keys: ['fridge', 'refrigerator', 'cold'],
      reply: "Keep your refrigerator at WHO food safety standards (4°C) instead of 2°C. 🧊 This keeps food fully fresh but cuts baseline compressor draw by ~8%!"
    },
    {
      keys: ['led', 'lights', 'bulb'],
      reply: "Switching old incandescent bulbs to LED lights is a no-brainer. 💡 LEDs use 80% less energy and last 10 times longer. Turn them off when leaving a room!"
    },
    {
      keys: ['solar', 'panel', 'renewable'],
      reply: "Solar panel setups are a great long-term investment! ☀️ On average, a 1kW rooftop solar system saves ~120 units/month, paying for itself in under 4–5 years while earning green credits."
    },
    {
      keys: ['how to save', 'saving tips', 'reduce bill', 'lower cost', 'optimize'],
      reply: "To cut your bill by 10% immediately: 1. Set AC to 24°C. 2. Shift geyser running hours to early mornings. 3. Turn off TVs and laptops at the wall socket to avoid standby power leaks (vampire loads)!"
    }
  ];

  for (const r of replies) {
    if (r.keys.some(k => msg.includes(k))) {
      return r.reply;
    }
  }

  return "That's an interesting question! Keeping active loads under control and turning off idle appliances is always key. Try simulating this change in our What-If simulator on the Coach page to see exactly how much you'll save! ⚡";
}

/**
 * SERVICE EXPORTS
 */
module.exports = {
  /**
   * Parse bill raw statement text via LLM
   */
  async parseBillText(text) {
    if (Array.isArray(text)) {
      text = text.join('\n');
    }
    if (typeof text !== 'string') {
      console.warn('[llmService] Received non-string PDF text, coercing to string');
      text = String(text);
    }
    // Return defaults for empty or whitespace‑only input
    if (!text || text.trim().length === 0) {
      return { bill_amount: 3200, units: 400 };
    }

    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a precise data extraction agent. Analyze the following raw OCR text extracted from an electricity utility bill statement. Extract exactly three details: 1) The Net Payable Bill Amount (in Rupees), 2) The Total Energy Units Consumed (in kWh), and 3) The Billing Period Month and Year. Return ONLY a valid JSON object containing "bill_amount" (integer), "units" (integer), and "billing_month" (string in YYYY-MM format, e.g. "2026-06"). If the billing period cannot be determined, set "billing_month" to null.'
        },
        {
          role: 'user',
          content: `Bill Statement Text:\n\n${text.substring(0, 4000)}`
        }
      ];

      const res = await callGroqAPI(messages, true);
      const content = res.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Groq returned empty response content');
      }

      const extracted = JSON.parse(content);
      if (typeof extracted.bill_amount !== 'number' || typeof extracted.units !== 'number') {
        throw new Error('Groq returned invalid JSON structure');
      }

      // Normalize billing_month to YYYY-MM or null
      if (extracted.billing_month && typeof extracted.billing_month === 'string') {
        const cleaned = extracted.billing_month.trim();
        extracted.billing_month = /^\d{4}-\d{2}$/.test(cleaned) ? cleaned : null;
      } else {
        extracted.billing_month = null;
      }

      console.log('[llmService] Successfully parsed bill text via Groq:', extracted);
      return extracted;
    } catch (e) {
      console.warn(`[llmService] Groq statement parsing failed: ${e.message}. Using regex fallback.`);
      return parseBillTextFallback(text);
    }
  },

  /**
   * Chat with energy coach chatbot "Volt"
   */
  async chatWithVolt(conversationHistory) {
    if (!conversationHistory || conversationHistory.length === 0) {
      return "Hello! I'm Volt, your smart energy coach. How can I help you save power today? ⚡";
    }

    try {
      const systemPrompt = {
        role: 'system',
        content: `You are "Volt", an expert home energy conservation coach. Your tone is extremely helpful, human-like, sharp, and concise. You answer questions directly in 2-3 sentences max.
Rules:
1. Provide actionable advice about household energy saving, BEE standard temperatures (AC 24°C, Fridge 4°C), and power utility disaggregation.
2. Be brief, professional, and friendly. Do not output walls of text. Keep responses punchy and human-like.`
      };

      const messages = [systemPrompt, ...conversationHistory];
      const res = await callGroqAPI(messages, false);
      const reply = res.choices?.[0]?.message?.content;
      if (!reply) {
        throw new Error('Groq returned empty chat reply');
      }

      return reply;
    } catch (e) {
      console.warn(`[llmService] Groq chat completed with error: ${e.message}. Using NLP rule fallback.`);
      const lastUserMsg = conversationHistory[conversationHistory.length - 1]?.content || '';
      return chatWithVoltFallback(lastUserMsg);
    }
  }
};
