

// NOTE: This is Deno code for Supabase Edge Functions
// Deployment: supabase functions deploy verify-pin

// Added global declaration for Deno to resolve "Cannot find name 'Deno'" errors in the TypeScript environment.
declare const Deno: any;

import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { email, pin } = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 1. Fetch Profile
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single()

  if (fetchError || !profile) {
    return new Response(JSON.stringify({ success: false, error: 'Registry error' }), { status: 400 })
  }

  // 2. Check Lockout
  if (profile.pin_lock_until && new Date(profile.pin_lock_until) > new Date()) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Too many attempts. Locked until ' + profile.pin_lock_until 
    }), { status: 403 })
  }

  // 3. Verify PIN (In real app, we use crypto.subtle to hash pin + salt)
  // Simplified for prototype logic:
  const isValid = profile.pin_hash === pin // Ideally hash(pin + profile.pin_salt)

  if (isValid) {
    await supabase
      .from('profiles')
      .update({ failed_pin_count: 0, pin_lock_until: null })
      .eq('email', email)

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } else {
    const newCount = (profile.failed_pin_count || 0) + 1
    const lockUntil = newCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null
    
    await supabase
      .from('profiles')
      .update({ failed_pin_count: newCount, pin_lock_until: lockUntil })
      .eq('email', email)

    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Invalid credential',
      attempts_remaining: 5 - newCount
    }), { status: 401 })
  }
})