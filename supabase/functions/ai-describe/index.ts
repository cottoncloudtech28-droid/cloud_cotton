import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { name, category, colors } = await req.json();
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) return new Response(JSON.stringify({ error: 'Missing LOVABLE_API_KEY' }), { status: 500, headers: corsHeaders });

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You write short, cute, aesthetic product descriptions (max 2 sentences, ~25 words) for a kawaii lifestyle shop. No emojis overload, just 1 at most. Plain text only.' },
          { role: 'user', content: `Product: ${name}\nCategory: ${category || 'general'}\nColors: ${(colors || []).join(', ') || 'n/a'}\nWrite the description.` },
        ],
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: txt }), { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const data = await res.json();
    const description = data?.choices?.[0]?.message?.content?.trim() ?? '';
    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});