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

    // Check if user has permission (admin_vertical or empresa_sst can delete users)
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role, empresa_id')
      .eq('id', currentUser.id)
      .single();

    if (profileError || !['admin_vertical', 'empresa_sst'].includes(profile?.role)) {
      console.log('User does not have permission:', profileError, profile);
      return new Response(
        JSON.stringify({ error: 'Sem permissão para excluir usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId } = await req.json();

    // Validate required fields
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Campo obrigatório: userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (userId === currentUser.id) {
      return new Response(
        JSON.stringify({ error: 'Você não pode excluir seu próprio usuário' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First delete from profiles table
    const { error: profileDeleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) {
      console.log('Error deleting profile:', profileDeleteError);
      // Continue anyway to try to delete from auth
    }

    // Delete user from auth.users via admin API
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.log('Error deleting user from auth:', deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User deleted successfully:', userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuário excluído com sucesso'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-delete-user:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
