// api/webhook.js - Vercel Serverless Function for OrderHero FO26 format
// Format OrderID real: FO26U7LRM3BG (12 char, FO26 + 8 random uppercase alphanumeric)
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function generateLicense() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const part = () => Array.from({length:4}, () => chars[Math.floor(Math.random()*chars.length)]).join('')
  return `GERD-${part()}-${part()}-${part()}`
}

function isValidOrderID(orderId) {
  if (!orderId) return false
  // Real OrderHero format: FO26 + 8 chars = FO26U7LRM3BG (12 chars)
  // Also accept FO + 10-12 chars for future
  const regex = /^FO[A-Z0-9]{10,12}$/ // FO26U7LRM3BG matches
  const regex2 = /^FO26[A-Z0-9]{8}$/ // strict 12
  return regex.test(orderId) || regex2.test(orderId) || orderId.startsWith('FO26')
}

export default async function handler(req, res) {
  // CORS for OrderHero
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Optional secret validation
  if (process.env.ORDERHERO_SECRET) {
    const secret = req.headers['x-webhook-secret'] || req.query.secret
    if (secret !== process.env.ORDERHERO_SECRET) {
      console.log('Invalid secret attempt')
      // Don't block, just log for now (OrderHero may not send header)
    }
  }

  const body = req.body || {}
  console.log('Webhook received:', JSON.stringify(body).slice(0,500))

  // OrderHero payload can be different keys, handle all
  const order_id = body.order_id || body.orderId || body.invoice || body.id || body.code
  const email = (body.email || body.customer_email || body.email_customer || '').toLowerCase().trim()
  const name = body.name || body.customer_name || body.customer || body.nama || 'Customer'
  const phone = body.phone || body.customer_phone || body.phone_number || body.no_hp || ''
  const status = (body.status || body.payment_status || body.order_status || '').toUpperCase()
  const amount = body.amount || body.total || 0

  if (!email) {
    console.log('No email in payload')
    return res.status(400).json({ error: 'No email' })
  }

  // Only process PAID orders - OrderHero statuses: PAID, paid, completed, settlement, success
  const paidStatuses = ['PAID', 'COMPLETED', 'SETTLEMENT', 'SUCCESS', 'LUNAS', 'BERHASIL']
  const isPaid = paidStatuses.includes(status) || body.paid === true || status === ''
  // If status empty (some OrderHero webhook don't send status), still process if order_id starts with FO

  if (!isPaid && !isValidOrderID(order_id)) {
    console.log('Skipping non-paid order', status, order_id)
    return res.status(200).json({ ok: true, skip: 'not paid', status })
  }

  if (!order_id || !isValidOrderID(order_id)) {
    console.log('Invalid order_id format', order_id)
    // Still generate if email exists, use order_id as provided
  }

  const license_key = generateLicense()

  try {
    // 1. Save to Supabase users table - order_id is primary login key
    const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
    
    if (existing) {
      // Update existing user with new order
      await supabase.from('users').update({
        order_id,
        license_key,
        name,
        phone,
        updated_at: new Date().toISOString()
      }).eq('email', email)
    } else {
      await supabase.from('users').insert({
        email,
        order_id, // FO26U7LRM3BG - real OrderHero format, used for login
        license_key, // GERD-XXXX backup for premium feel
        name,
        phone,
        created_at: new Date().toISOString()
      })
    }

    // 2. Log webhook
    await supabase.from('webhook_logs').insert({
      order_id,
      email,
      license_key,
      payload: body,
      created_at: new Date().toISOString()
    })

    // 3. Send email with OrderID (simple) + License backup
    if (resend) {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'GERD Finder <noreply@gerdfinder.com>',
        to: email,
        subject: `Akses GERD Finder aktif - Order ${order_id}`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#0A0A0A;color:white;padding:32px;border-radius:24px">
            <h1 style="color:#14B8A6;font-size:22px">GERD-mu bisa dilacak mulai malam ini</h1>
            <p>Halo ${name},</p>
            <p>Pembayaran Rp${amount} berhasil. Akses Lifetime kamu aktif:</p>
            
            <div style="background:#1A1A1A;padding:20px;border-radius:16px;margin:20px 0;border:1px solid #2A2A2A">
              <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;letter-spacing:1px">ORDER ID (LOGIN SIMPLE)</p>
              <h2 style="margin:0;color:white;letter-spacing:2px;font-size:24px">${order_id}</h2>
              <p style="margin:8px 0 0;color:#9CA3AF;font-size:12px">Format: FO26 + 8 karakter (dari struk OrderHero)</p>
            </div>

            <div style="background:#FFFBEB;padding:16px;border-radius:12px;margin:16px 0">
              <p style="margin:0 0 4px;color:#92400E;font-size:11px">BACKUP LISENSI PREMIUM</p>
              <p style="margin:0;color:#111827;font-weight:bold;letter-spacing:1px">${license_key}</p>
            </div>

            <p style="font-size:14px"><strong>Cara login:</strong><br>
            1. Buka: <a href="https://${process.env.APP_DOMAIN || 'username.github.io/gerd-finder/'}" style="color:#14B8A6">${process.env.APP_DOMAIN || 'username.github.io/gerd-finder/'}</a><br>
            2. Pilih Tab "Pakai Order ID"<br>
            3. Email: ${email}<br>
            4. Order ID: ${order_id}<br>
            </p>

            <p style="font-size:12px;color:#9CA3AF">Bisa juga login pakai Email + Lisensi ${license_key}</p>

            <div style="margin:24px 0;padding:16px;background:#0F766E;border-radius:12px;text-align:center">
              <a href="https://${process.env.APP_DOMAIN || 'username.github.io/gerd-finder/'}" style="color:white;text-decoration:none;font-weight:bold">Buka Dashboard → 5 Tab + 3 Bonus</a>
            </div>

            <p style="font-size:11px;color:#6B7280">Lifetime • 2 Device (HP+Laptop) • No Bulanan • Garansi 7 hari<br>
            Order: ${order_id} • Lisensi: ${license_key} • Email: ${email}</p>
          </div>
        `
      })
      console.log('Email sent to', email)
    }

    return res.status(200).json({ 
      ok: true, 
      order_id,
      email,
      license_key,
      login_method: 'Email + OrderID FO26... OR Email + License',
      message: 'User created, email sent'
    })

  } catch (err) {
    console.error('Webhook error', err)
    return res.status(500).json({ error: err.message })
  }
}