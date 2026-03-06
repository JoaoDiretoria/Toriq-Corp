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
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin_vertical
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (profileError || profile?.role !== 'admin_vertical') {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem excluir empresas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { empresa_id } = await req.json();

    if (!empresa_id) {
      return new Response(
        JSON.stringify({ error: 'ID da empresa é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get empresa info
    const { data: empresa, error: empresaError } = await adminClient
      .from('empresas')
      .select('id, nome, tipo')
      .eq('id', empresa_id)
      .single();

    if (empresaError || !empresa) {
      return new Response(
        JSON.stringify({ error: 'Empresa não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent deleting vertical_on company
    if (empresa.tipo === 'vertical_on') {
      return new Response(
        JSON.stringify({ error: 'Não é possível excluir a empresa Vertical On' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Iniciando exclusão da empresa: ${empresa.nome} (${empresa_id})`);

    // 1. Get all users from this empresa
    const { data: users, error: usersError } = await adminClient
      .from('profiles')
      .select('id, email, nome')
      .eq('empresa_id', empresa_id);

    if (usersError) {
      console.error('Erro ao buscar usuários:', usersError);
    }

    const deletedUsers: string[] = [];
    const failedUsers: string[] = [];

    // 2. Delete users from auth.users (this will cascade to profiles)
    if (users && users.length > 0) {
      console.log(`Deletando ${users.length} usuários da empresa...`);
      
      for (const user of users) {
        try {
          const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);
          if (deleteUserError) {
            console.error(`Erro ao deletar usuário ${user.email}:`, deleteUserError);
            failedUsers.push(user.email);
          } else {
            console.log(`Usuário deletado: ${user.email}`);
            deletedUsers.push(user.email);
          }
        } catch (e) {
          console.error(`Erro ao deletar usuário ${user.email}:`, e);
          failedUsers.push(user.email);
        }
      }
    }

    // 3. Delete empresa (cascade will handle most relations)
    const { error: deleteError } = await adminClient
      .from('empresas')
      .delete()
      .eq('id', empresa_id);

    if (deleteError) {
      console.error('Erro ao deletar empresa:', deleteError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao excluir empresa: ' + deleteError.message,
          deletedUsers,
          failedUsers
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Empresa ${empresa.nome} excluída com sucesso!`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Empresa "${empresa.nome}" excluída com sucesso`,
        deletedUsers,
        failedUsers,
        totalUsersDeleted: deletedUsers.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
