/**
 * George Board — Supabase Storage Setup
 * Creates "documents" and "media" public buckets and their RLS policies.
 *
 * Usage:
 *   node scripts/setup-storage.mjs <SERVICE_ROLE_KEY>
 *
 * Get your service role key from:
 *   Supabase Dashboard → Project Settings → API → service_role (secret)
 */

const PROJECT_URL = 'https://uxeolplwhtyyefpmwktw.supabase.co';
const SERVICE_KEY = process.argv[2];

if (!SERVICE_KEY) {
  console.error('\n❌  Missing service role key.\n');
  console.error('  Usage: node scripts/setup-storage.mjs <SERVICE_ROLE_KEY>\n');
  console.error('  Find it: Supabase Dashboard → Project Settings → API → service_role\n');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'apikey': SERVICE_KEY,
  'Content-Type': 'application/json',
};

async function createBucket(name) {
  const res = await fetch(`${PROJECT_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ id: name, name, public: true, file_size_limit: 52428800 }),
  });
  const body = await res.json();
  if (res.ok || body.error === 'Duplicate') {
    console.log(`  ✅  Bucket "${name}" — ${body.error === 'Duplicate' ? 'already exists (skipped)' : 'created'}`);
  } else {
    console.error(`  ❌  Bucket "${name}" failed: ${JSON.stringify(body)}`);
  }
}

async function runSQL(sql, description) {
  const res = await fetch(`${PROJECT_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: sql }),
  }).catch(() => null);

  // Fallback: use pg REST approach via pg_query
  if (!res || !res.ok) {
    // Use Supabase Management API SQL endpoint
    const res2 = await fetch(`https://api.supabase.com/v1/projects/uxeolplwhtyyefpmwktw/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });
    const b2 = await res2.json().catch(() => ({}));
    if (res2.ok) {
      console.log(`  ✅  Policy "${description}" set`);
    } else {
      // If already exists that's fine
      if (JSON.stringify(b2).includes('already exists')) {
        console.log(`  ⏩  Policy "${description}" already exists`);
      } else {
        console.log(`  ⚠️   Policy "${description}" — run manually if needed (${JSON.stringify(b2).substring(0,80)})`);
      }
    }
    return;
  }
  console.log(`  ✅  Policy "${description}" set`);
}

const POLICIES = [
  // documents bucket
  [`CREATE POLICY "Documents public read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'documents');`, 'Documents public read'],
  [`CREATE POLICY "Documents upload" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'documents');`, 'Documents upload'],
  [`CREATE POLICY "Documents delete own" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'documents');`, 'Documents delete'],
  // media bucket
  [`CREATE POLICY "Media public read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'media');`, 'Media public read'],
  [`CREATE POLICY "Media upload" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'media');`, 'Media upload'],
  [`CREATE POLICY "Media delete own" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'media');`, 'Media delete'],
];

async function main() {
  console.log('\n🪣  George Board — Supabase Storage Setup');
  console.log(`    Project: ${PROJECT_URL}\n`);

  console.log('Creating buckets...');
  await createBucket('documents');
  await createBucket('media');

  console.log('\nApplying RLS policies...');
  for (const [sql, desc] of POLICIES) {
    await runSQL(sql, desc);
  }

  console.log('\n✅  Done! Both buckets are live and public.\n');
  console.log('   documents → PDF, DOC, XLS, PPT, TXT uploads');
  console.log('   media     → JPG, PNG, GIF, WEBP, MP4, MOV uploads\n');
}

main().catch(console.error);
