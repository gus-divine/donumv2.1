/**
 * Reset the super admin password in Supabase Auth
 * Run: npx tsx reset-super-admin-password.ts [new-password]
 *
 * If no password is provided, uses: ChangeMe123!
 * Loads .env.local from frontend/ or project root
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPER_ADMIN_EMAIL = 'superadmin@donumplan.com';

function loadEnvLocal() {
  const paths = [
    join(process.cwd(), '.env.local'),
    join(process.cwd(), '..', '.env.local'),
    join(__dirname, '.env.local'),
    join(__dirname, '..', '.env.local'),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      const content = readFileSync(p, 'utf-8');
      for (const line of content.split('\n')) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) {
          const key = m[1].trim();
          const val = m[2].trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) process.env[key] = val;
        }
      }
      return;
    }
  }
}

loadEnvLocal();

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const newPassword = process.argv[2] || 'ChangeMe123!';

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('Ensure .env.local exists in frontend/ or project root with those vars.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Find super admin user
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list users:', listError.message);
    process.exit(1);
  }

  let superAdmin = users?.find((u) => u.email === SUPER_ADMIN_EMAIL);

  // Fallback: listUsers may not return all users; look up by email in donum_accounts
  if (!superAdmin) {
    const { data: account, error: acctErr } = await supabase
      .from('donum_accounts')
      .select('id')
      .eq('email', SUPER_ADMIN_EMAIL)
      .single();
    if (acctErr) {
      console.warn('donum_accounts lookup:', acctErr.message);
    }
    const userId = account?.id;
    if (userId) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
      if (!updateError) {
        console.log('Password updated successfully (found via donum_accounts).');
        console.log(`  Email: ${SUPER_ADMIN_EMAIL}`);
        console.log(`  Password: ${newPassword}`);
        return;
      }
      console.error('Update by ID failed:', updateError.message);
    }
  }

  if (!superAdmin) {
    console.log(`User ${SUPER_ADMIN_EMAIL} not found. Creating...`);
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: SUPER_ADMIN_EMAIL,
      password: newPassword,
      email_confirm: true,
    });
    if (createError) {
      console.error('Failed to create user:', createError.message);
      process.exit(1);
    }
    superAdmin = newUser.user;
    if (!superAdmin) {
      console.error('No user returned from create');
      process.exit(1);
    }
    // Create donum_accounts record for super admin
    await supabase.from('donum_accounts').upsert({
      id: superAdmin.id,
      email: SUPER_ADMIN_EMAIL,
      role: 'donum_super_admin',
      status: 'active',
      first_name: 'Super',
      last_name: 'Admin',
      departments: [],
    }, { onConflict: 'id' });
    console.log('Super admin created successfully.');
  } else {
    const { error: updateError } = await supabase.auth.admin.updateUserById(superAdmin.id, {
      password: newPassword,
    });
    if (updateError) {
      console.error('Failed to update password:', updateError.message);
      process.exit(1);
    }
    console.log('Password updated successfully.');
  }

  console.log(`  Email: ${SUPER_ADMIN_EMAIL}`);
  console.log(`  Password: ${newPassword}`);
}

main();
