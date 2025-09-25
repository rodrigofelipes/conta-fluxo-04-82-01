import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  username: string;
  fullName?: string;  
  telefone?: string;
  role?: string;
}

// Helper function to ensure user profile and role data are synchronized
async function ensureUserDataSync(supabaseAdmin: any, user: any, username: string, fullName?: string, telefone?: string, role?: string) {
  console.log('🔄 Synchronizing user data for:', user.id);
  
  // Ensure profile exists
  const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profileCheckError && !existingProfile) {
    console.log('📝 Creating missing profile...');
    const { error: createProfileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: user.id,
        username: username,
        full_name: fullName || username,
        email: user.email,
        telefone: telefone || null
      });
    
    if (createProfileError) {
      console.error('❌ Error creating profile:', createProfileError);
    } else {
      console.log('✅ Profile created successfully');
    }
  } else if (existingProfile) {
    console.log('✅ Profile already exists, updating if needed...');
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        username: username,
        full_name: fullName || username,
        telefone: telefone || existingProfile.telefone
      })
      .eq('user_id', user.id);
    
    if (updateProfileError) {
      console.error('❌ Error updating profile:', updateProfileError);
    } else {
      console.log('✅ Profile updated successfully');
    }
  }

  // Ensure user role exists
  const { data: existingRole, error: roleCheckError } = await supabaseAdmin
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!roleCheckError && !existingRole) {
    console.log('👤 Creating missing user role...');
    const { error: createRoleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: role || 'user',
        username: username,
        telefone: telefone || null
      });
    
    if (createRoleError) {
      console.error('❌ Error creating user role:', createRoleError);
    } else {
      console.log('✅ User role created successfully');
    }
  } else if (existingRole) {
    console.log('✅ User role already exists, updating if needed...');
    const { error: updateRoleError } = await supabaseAdmin
      .from('user_roles')
      .update({
        username: username,
        telefone: telefone || existingRole.telefone
      })
      .eq('user_id', user.id);
    
    if (updateRoleError) {
      console.error('❌ Error updating user role:', updateRoleError);
    } else {
      console.log('✅ User role updated successfully');
    }
  }
}


// Helper to find user by email using pagination (admin API doesn't provide direct lookup)
async function findUserByEmail(supabaseAdmin: any, email: string) {
  let page = 1;
  const perPage = 100;
  const maxPages = 1000; // safety cap
  const target = email.toLowerCase().trim();

  while (page <= maxPages) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('❌ Error listing users (page:', page, '):', error);
      return { error };
    }

    const user = data?.users?.find((u: any) => (u.email || '').toLowerCase() === target);
    if (user) return { user };

    if (!data || !data.users || data.users.length < perPage) break; // no more pages
    page += 1;
  }

  return { user: null };
}

Deno.serve(async (req) => {
    console.log('🚀 create-user-admin function started');
    console.log('🔧 Request method:', req.method);
    console.log('🌐 Request URL:', req.url);
    console.log('📋 Request headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log('✅ Returning CORS preflight response');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('🔧 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      supabaseUrlLength: supabaseUrl?.length || 0,
      serviceRoleKeyLength: serviceRoleKey?.length || 0
    });

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error', 
          missing: !supabaseUrl ? 'SUPABASE_URL' : 'SERVICE_ROLE_KEY' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Parse request body
    console.log('📥 Parsing request body...');
    const requestBody: CreateUserRequest = await req.json();
    
    console.log('📋 Raw request body received:', JSON.stringify(requestBody, null, 2));
    console.log('📋 Request data received:', {
      email: requestBody.email,
      username: requestBody.username,
      fullName: requestBody.fullName,
      hasPassword: !!requestBody.password,
      hasTelefone: !!requestBody.telefone,
      role: requestBody.role || 'user',
      roleType: typeof requestBody.role,
      roleIsUndefined: requestBody.role === undefined,
      roleIsNull: requestBody.role === null
    });

    const { email, password, username, fullName, telefone, role } = requestBody;
    
    console.log('🔍 Extracted variables:', {
      email,
      username,
      fullName,
      telefone,
      role,
      finalRole: role || 'user'
    });

    if (!email || !password || !username) {
      console.error('❌ Missing required fields:', { 
        hasEmail: !!email, 
        hasPassword: !!password, 
        hasUsername: !!username 
      });
      return new Response(
        JSON.stringify({ error: 'Email, password, and username are required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Create admin client
    console.log('🔗 Creating Supabase admin client...');
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Check if user already exists using paginated search
    console.log('🔍 Checking if user exists by email (paginated):', email);
    const { user: existingUser, error: findErr } = await findUserByEmail(supabaseAdmin, email);
    
    if (findErr) {
      console.error('❌ Error checking existing user (paginated):', findErr);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing user', details: findErr.message || String(findErr) }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    if (existingUser) {
      console.log('👤 User already exists:', email);
      
      // Ensure profile and role exist for existing user
      await ensureUserDataSync(supabaseAdmin, existingUser, username, fullName, telefone, role);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          user: existingUser,
          message: 'User already exists and data synced',
          userExists: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }
    
    console.log('✅ User does not exist, proceeding with creation');

    // Create new user
    console.log('✨ Creating new user with metadata:', {
      username,
      full_name: fullName || username,
      telefone: telefone || null,
      created_by_admin: true,
      intended_role: role || 'user'
    });
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        username,
        full_name: fullName || username,
        telefone: telefone || null,
        created_by_admin: true,
      },
      email_confirm: true,
    });

    if (userError) {
      console.error('❌ Error creating user:', userError);
      console.error('❌ Full error details:', JSON.stringify(userError, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create user', 
          details: userError.message,
          code: userError.code || 'unknown',
          fullError: userError
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log('✅ User created successfully:', userData.user?.id);
    console.log('👤 User metadata stored:', userData.user?.user_metadata);

    // Wait for triggers to execute
    console.log('⏳ Waiting for database triggers to execute...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Ensure profile and role are properly created using our sync function
    await ensureUserDataSync(supabaseAdmin, userData.user, username, fullName, telefone, role);

    console.log('✅ Function completed successfully');
    console.log('📊 Final user summary:', {
      user_id: userData.user?.id,
      email: userData.user?.email,
      username: userData.user?.user_metadata?.username,
      created_by_admin: userData.user?.user_metadata?.created_by_admin
    });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        user: userData.user,
        message: 'User created successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('💥 Fatal error in create-user-admin function:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        type: error.name || 'UnknownError'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});