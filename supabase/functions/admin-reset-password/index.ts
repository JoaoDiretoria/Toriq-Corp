import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// URLs permitidos para redirect (produção e desenvolvimento)
const ALLOWED_REDIRECT_URLS = [
  'https://toriq.com.br',
  'https://www.toriq.com.br',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
];

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
        JSON.stringify({ error: 'Sem permissão para enviar email de redefinição de senha' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { email, redirectTo } = await req.json();

    // Validate required fields
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar e normalizar redirectTo
    let finalRedirectUrl = Deno.env.get('SITE_URL') || 'https://toriq.com.br';
    
    if (redirectTo) {
      // Extrair a origem (protocolo + host + porta) do redirectTo
      try {
        const redirectUrl = new URL(redirectTo);
        const redirectOrigin = redirectUrl.origin;
        
        // Verificar se a origem está na lista de permitidos
        // Também aceitar qualquer URL que comece com uma origem permitida
        const isAllowed = ALLOWED_REDIRECT_URLS.some(allowed => {
          const allowedUrl = new URL(allowed);
          return redirectOrigin === allowedUrl.origin;
        });
        
        if (isAllowed) {
          // Usar o redirectTo completo se a origem for permitida
          finalRedirectUrl = redirectTo;
        } else {
          console.log('Redirect URL not in allowed list:', redirectOrigin);
          // Usar URL de produção como fallback
          finalRedirectUrl = 'https://toriq.com.br/reset-password';
        }
      } catch (e) {
        console.log('Invalid redirect URL:', redirectTo, e);
        finalRedirectUrl = 'https://toriq.com.br/reset-password';
      }
    }

    console.log('Sending password reset email to:', email, 'with redirect to:', finalRedirectUrl);

    // Verificar se o usuário existe no sistema
    const { data: userList, error: listError } = await adminClient.auth.admin.listUsers();
    const targetUser = userList?.users?.find(u => u.email === email);
    
    if (!targetUser) {
      console.log('User not found with email:', email);
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado com este email' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found user:', targetUser.id, targetUser.email);

    // Usar resetPasswordForEmail que ENVIA o email automaticamente
    // Este método dispara o envio do email pelo Supabase Auth
    const { error: resetError } = await adminClient.auth.resetPasswordForEmail(email, {
      redirectTo: finalRedirectUrl,
    });

    if (resetError) {
      console.error('Error sending reset email:', resetError);
      
      // Fallback: tentar gerar link e enviar manualmente via admin API
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: finalRedirectUrl,
        },
      });
      
      if (linkError) {
        console.error('Generate link also failed:', linkError);
        return new Response(
          JSON.stringify({ error: resetError.message || linkError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Se generateLink funcionou, o link foi gerado mas email não foi enviado
      // Isso pode acontecer se SMTP não estiver configurado
      console.log('Link generated but email may not have been sent. Link data:', linkData?.properties?.action_link ? 'Link exists' : 'No link');
      
      // Retornar sucesso parcial - link foi gerado
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Link de redefinição gerado para ${email}. Verifique se o SMTP está configurado no Supabase.`,
          warning: 'O email pode não ter sido enviado se o SMTP não estiver configurado.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Password reset email sent successfully to:', email);
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email de redefinição de senha enviado para ${email}` 
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
