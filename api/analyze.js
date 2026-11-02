// api/analyze.js - AI analysis for GERD Finder (optional, can use local logic too)
// If you use OpenRouter for AI, set OPENROUTER_API_KEY in Vercel env
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { profile, symptoms, foods, order_id, email } = req.body || {}

  // Simple quota check: 5/day per order_id
  // (Implement via Supabase if needed, for now fair use)

  // If no API key, use local rule-based logic (free, no cost)
  if (!process.env.OPENROUTER_API_KEY) {
    // Local logic fallback - same as frontend
    const triggers = []
    if ((foods||[]).some(f => f.toLowerCase().includes('kopi'))) triggers.push({ name: 'Kopi hitam', reason: 'Kafein → LES rileks, asam naik jam 2 pagi', score: 95 })
    if ((foods||[]).some(f => f.toLowerCase().includes('goreng'))) triggers.push({ name: 'Gorengan', reason: 'Lemak tinggi → lambat cerna', score: 90 })
    if ((foods||[]).some(f => f.toLowerCase().includes('sambal') || f.toLowerCase().includes('pedas'))) triggers.push({ name: 'Sambal extra pedas', reason: 'Capsaicin → iritasi', score: 88 })
    
    const score = Math.max(30, 100 - triggers.length * 12 - (symptoms?.length||0)*3)
    
    return res.status(200).json({
      score,
      triggers: triggers.slice(0,3),
      recommendation: 'Hindari 3 pemicu utama 7 hari, makan terakhir max 19:00, porsi kecil 100g',
      local: true
    })
  }

  // AI mode with OpenRouter (cost $0.002/req)
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{
          role: 'system',
          content: 'Kamu ahli GERD Indonesia. Analisis pola dari data user: frekuensi, jam kambuh, durasi GERD, makanan Indonesia, gejala. Output JSON: {score:0-100, triggers:[{name,reason,score}], jadwal: [...], swap: [...]}. Bahasa Indonesia santai.'
        }, {
          role: 'user',
          content: JSON.stringify({ profile, symptoms, foods })
        }],
        max_tokens: 800
      })
    })
    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(text.match(/\{.*\}/s)?.[0] || '{}')
    return res.status(200).json({ ...parsed, ai: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}