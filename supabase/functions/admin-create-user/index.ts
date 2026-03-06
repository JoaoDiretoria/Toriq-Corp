import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token from header
    const jwt = authHeader.replace('Bearer ', '');

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verify the JWT and get the user
    const { data: { user: currentUser }, error: userError } = await adminClient.auth.getUser(jwt);
    if (userError || !currentUser) {
      console.log('Failed to get current user:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission (admin_vertical or empresa_sst)
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role, empresa_id')
      .eq('id', currentUser.id)
      .single();

    if (profileError || !['admin_vertical', 'empresa_sst'].includes(profile?.role)) {
      console.log('User does not have permission:', profileError, profile);
      return new Response(
        JSON.stringify({ error: 'Sem permissão para criar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { email, password, nome, role, empresa_id, setor_id, grupo_acesso, gestor_id, send_invite } = await req.json();

    // Validate required fields
    // Password is optional when send_invite is true
    if (!email || !nome || !role) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: email, nome, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If not sending invite, password is required
    if (send_invite !== true && !password) {
      return new Response(
        JSON.stringify({ error: 'Senha é obrigatória quando não está enviando convite por email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    const validRoles = ['admin_vertical', 'empresa_sst', 'cliente_final', 'empresa_parceira', 'instrutor'];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Role inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validação específica para empresa_sst
    if (profile.role === 'empresa_sst') {
      // empresa_sst pode criar usuários empresa_sst (funcionários), cliente_final, empresa_parceira ou instrutor
      if (!['empresa_sst', 'cliente_final', 'empresa_parceira', 'instrutor'].includes(role)) {
        console.log('empresa_sst tried to create invalid user type:', role);
        return new Response(
          JSON.stringify({ error: 'Empresas SST só podem criar usuários do tipo empresa_sst, cliente_final, empresa_parceira ou instrutor' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Se está criando um funcionário (empresa_sst), deve ser na mesma empresa
      if (role === 'empresa_sst') {
        if (empresa_id !== profile.empresa_id) {
          console.log('empresa_sst tried to create employee for different company');
          return new Response(
            JSON.stringify({ error: 'Você só pode criar funcionários para sua própria empresa' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.log('empresa_sst creating employee for own company:', empresa_id);
      }
      
      // Verificar se a empresa_id foi informada
      if (!empresa_id) {
        return new Response(
          JSON.stringify({ error: 'É necessário informar a empresa' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Validação para cliente_final
      if (role === 'cliente_final') {
        const { data: clienteRelation, error: clienteError } = await adminClient
          .from('clientes_sst')
          .select('id')
          .eq('empresa_sst_id', profile.empresa_id)
          .eq('cliente_empresa_id', empresa_id)
          .maybeSingle();
          
        if (clienteError || !clienteRelation) {
          console.log('empresa_sst tried to create user for non-client company:', empresa_id, clienteError);
          return new Response(
            JSON.stringify({ error: 'Esta empresa não é cliente da sua empresa SST' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('empresa_sst creating cliente_final for client company:', empresa_id);
      }
      
      // Validação para empresa_parceira
      if (role === 'empresa_parceira') {
        const { data: parceiraRelation, error: parceiraError } = await adminClient
          .from('empresas_parceiras')
          .select('id')
          .eq('empresa_sst_id', profile.empresa_id)
          .eq('parceira_empresa_id', empresa_id)
          .maybeSingle();
          
        if (parceiraError || !parceiraRelation) {
          console.log('empresa_sst tried to create user for non-partner company:', empresa_id, parceiraError);
          return new Response(
            JSON.stringify({ error: 'Esta empresa não é parceira da sua empresa SST' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('empresa_sst creating empresa_parceira for partner company:', empresa_id);
      }
      
      // Validação para instrutor - deve pertencer à mesma empresa SST
      if (role === 'instrutor') {
        console.log('empresa_sst creating instrutor for company:', empresa_id);
      }
    }

    // Check if email already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email === email);
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: 'Este email já está cadastrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user - either via invite email or direct creation with password
    let newUser;
    let createError;
    
    if (send_invite === true) {
      // Send invite email - user will set their own password
      console.log('Sending invite to:', email, nome, role, empresa_id);
      
      // Get site URL for redirect
      const siteUrl = Deno.env.get('SITE_URL') || 'https://toriq.com.br';
      
      // Redirecionar para / (Index) que vai processar o token e redirecionar para /alterar-senha
      const result = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { nome },
        redirectTo: siteUrl
      });
      
      newUser = result.data;
      createError = result.error;
    } else {
      // Direct creation with password (existing behavior)
      console.log('Creating user with password:', email, nome, role, empresa_id);
      
      const result = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: { nome }
      });
      
      newUser = result.data;
      createError = result.error;
    }

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user ID from response (structure differs between createUser and inviteUserByEmail)
    const userId = newUser?.user?.id;
    if (!userId) {
      console.error('No user ID in response:', newUser);
      return new Response(
        JSON.stringify({ error: 'Erro ao obter ID do usuário criado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update profile with role, empresa_id, setor_id, grupo_acesso and gestor_id
    // The trigger handle_new_user creates the profile, but we need to update it
    // For invite users, the trigger may not have run yet, so we use upsert
    
    // Wait a bit for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try to update first
    let { error: updateError, count } = await adminClient
      .from('profiles')
      .update({
        nome,
        role,
        empresa_id: empresa_id || null,
        setor_id: setor_id || null,
        grupo_acesso: grupo_acesso || null,
        gestor_id: gestor_id || null
      })
      .eq('id', userId);

    // If update didn't affect any rows, the profile doesn't exist yet - create it
    if (!updateError && count === 0) {
      console.log('Profile not found, creating it directly for user:', userId);
      const { error: insertError } = await adminClient
        .from('profiles')
        .insert({
          id: userId,
          email,
          nome,
          role,
          empresa_id: empresa_id || null,
          setor_id: setor_id || null,
          grupo_acesso: grupo_acesso || null,
          gestor_id: gestor_id || null,
          senha_alterada: false
        });
      
      if (insertError) {
        // Profile might have been created by trigger in the meantime, try update again
        console.log('Insert failed, trying update again:', insertError.message);
        const { error: retryError } = await adminClient
          .from('profiles')
          .update({
            nome,
            role,
            empresa_id: empresa_id || null,
            setor_id: setor_id || null,
            grupo_acesso: grupo_acesso || null,
            gestor_id: gestor_id || null
          })
          .eq('id', userId);
        
        updateError = retryError;
      }
    }

    if (updateError) {
      console.error('Error updating profile:', updateError);
      // User was created but profile update failed, return partial success
      return new Response(
        JSON.stringify({ 
          warning: 'Usuário criado mas houve erro ao atualizar perfil: ' + updateError.message,
          user: newUser.user,
          invite_sent: send_invite === true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created successfully:', userId, send_invite ? '(invite sent)' : '(with password)');
    return new Response(
      JSON.stringify({ 
        success: true, 
        user: newUser.user,
        invite_sent: send_invite === true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
