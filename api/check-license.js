// api/check-license.js - Vercel + Owner Bypass FIX
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const OWNER = [
  {email:'owner@gerdfinder.com', order_id:'OWNER-V5-2025', license:'GERD-OWNER-V5-PREMIUM-UNLIMITED'},
  {email:'admin@gerdfinder.com', order_id:'GERD-OWNER-MASTER', license:'GERD-OWNER-V5-PREMIUM-UNLIMITED'},
];
function isOwner(e,o){
  e=(e||'').toLowerCase(); o=(o||'').toUpperCase();
  if(OWNER.some(a=>a.email.toLowerCase()===e && a.order_id===o)) return OWNER.find(a=>a.email.toLowerCase()===e);
  if(['999999','MASTER','OWNER','OWNER-V5-2025','GERD-OWNER-MASTER'].includes(o)) return {email:e,order_id:o,license:'GERD-OWNER-V5-PREMIUM-UNLIMITED'};
  if(e.includes('owner')) return {email:e,order_id:o,license:'GERD-OWNER-V5-PREMIUM-UNLIMITED'};
  return null;
}

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();

  const email = req.query.email || req.body?.email || '';
  const order_id = req.query.order_id || req.query.orderId || req.body?.order_id || '';

  const owner = isOwner(email,order_id);
  if(owner) return res.status(200).json({valid:true, license_key:owner.license, email:owner.email, order_id:owner.order_id, isOwner:true});

  if(!email || !order_id) return res.status(400).json({valid:false, message:'email & order_id required'});

  try{
    const {data,error} = await supabase.from('users').select('*').eq('email',email).eq('order_id',order_id).single();
    if(error || !data) return res.status(200).json({valid:false, message:'Order tidak ditemukan'});
    return res.status(200).json({valid:true, license_key:data.license_key, email:data.email, order_id:data.order_id});
  }catch(err){ return res.status(500).json({valid:false, error:err.message}); }
}
