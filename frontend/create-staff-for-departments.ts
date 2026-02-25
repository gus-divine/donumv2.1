/**
 * Script to create staff users and assign them to departments
 * Run this with: npx tsx create-staff-for-departments.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const departments = [
  { name: 'Sales', staff: ['sales1', 'sales2', 'sales3'] },
  { name: 'Support', staff: ['support1', 'support2', 'support3'] },
  { name: 'Operations', staff: ['ops1', 'ops2'] },
  { name: 'Finance', staff: ['finance1', 'finance2'] },
  { name: 'Admin', staff: ['admin1'] },
  { name: 'Advisor', staff: ['advisor1', 'advisor2'] },
];

async function createStaffUser(email: string, firstName: string, lastName: string, departmentName: string) {
  try {
    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: 'TempPassword123!', // User should change this on first login
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`  ⚠️  User ${email} already exists, updating...`);
        // Get existing user
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);
        if (!existingUser) {
          throw new Error(`Could not find existing user ${email}`);
        }
        return await updateStaffUser(existingUser.id, firstName, lastName, departmentName);
      }
      throw authError;
    }

    if (!authUser.user) {
      throw new Error('No user returned from auth creation');
    }

    // Create donum_accounts record
    const { data: account, error: accountError } = await supabase
      .from('donum_accounts')
      .insert({
        id: authUser.user.id,
        email,
        role: 'donum_staff',
        status: 'active',
        first_name: firstName,
        last_name: lastName,
        departments: [departmentName],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (accountError) {
      // If account creation fails, try to delete the auth user
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw accountError;
    }

    console.log(`  ✅ Created ${email} in ${departmentName}`);
    return account;
  } catch (error: any) {
    console.error(`  ❌ Error creating ${email}:`, error.message);
    throw error;
  }
}

async function updateStaffUser(userId: string, firstName: string, lastName: string, departmentName: string) {
  // Check current departments
  const { data: currentUser } = await supabase
    .from('donum_accounts')
    .select('departments')
    .eq('id', userId)
    .single();

  const currentDepartments = currentUser?.departments || [];
  const updatedDepartments = currentDepartments.includes(departmentName)
    ? currentDepartments
    : [...currentDepartments, departmentName];

  const { data: account, error } = await supabase
    .from('donum_accounts')
    .update({
      first_name: firstName,
      last_name: lastName,
      departments: updatedDepartments,
      role: 'donum_staff',
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  console.log(`  ✅ Updated ${account.email} - added to ${departmentName}`);
  return account;
}

async function main() {
  console.log('🚀 Creating staff users for departments...\n');

  for (const dept of departments) {
    console.log(`📁 Department: ${dept.name}`);
    
    for (const staffName of dept.staff) {
      const email = `${staffName}@donumplan.com`;
      const firstName = staffName.charAt(0).toUpperCase() + staffName.slice(1).replace(/\d+/g, '');
      const lastName = 'Staff';
      
      try {
        await createStaffUser(email, firstName, lastName, dept.name);
      } catch (error: any) {
        console.error(`Failed to create ${email}:`, error.message);
      }
    }
    
    console.log('');
  }

  console.log('✨ Done! Staff users created.');
  console.log('\n📝 Note: All users have temporary password: TempPassword123!');
  console.log('   Users should change their password on first login.');
}

main().catch(console.error);
