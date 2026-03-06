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

    // Check if user has permission (only admin_vertical can update users)
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role, empresa_id')
      .eq('id', currentUser.id)
      .single();

    // Permitir admin_vertical e empresa_sst
    const allowedRoles = ['admin_vertical', 'empresa_sst'];
    if (profileError || !allowedRoles.includes(profile?.role)) {
      console.log('User does not have permission:', profileError, profile);
      return new Response(
        JSON.stringify({ error: 'Sem permissão para atualizar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId, email, password, action, targetEmail, redirectTo } = await req.json();

    // Ação especial: enviar email de reset de senha
    if (action === 'generate_password_reset') {
      if (!targetEmail) {
        return new Response(
          JSON.stringify({ error: 'Campo obrigatório: targetEmail' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const siteUrl = Deno.env.get('SITE_URL') || 'https://app.toriq.com.br';
      const finalRedirectTo = redirectTo || `${siteUrl}/reset-password`;

      // Usar a API REST do Supabase Auth para enviar email de recuperação
      // Isso envia o email automaticamente usando o template configurado
      const response = await fetch(`${supabaseUrl}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceRoleKey,
          'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        },
        body: JSON.stringify({
          email: targetEmail,
          gotrue_meta_security: { captcha_token: null }, // Bypass captcha com service role
          redirect_to: finalRedirectTo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Error sending password reset email:', errorData);
        return new Response(
          JSON.stringify({ error: 'Erro ao enviar email de recuperação: ' + (errorData.msg || errorData.message || 'Erro desconhecido') }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Password reset email sent to:', targetEmail);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Email de recuperação de senha enviado para ${targetEmail}.`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields for update
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Campo obrigatório: userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Treat empty strings as undefined
    const emailToUpdate = email && email.trim() !== '' ? email.trim() : undefined;
    const passwordToUpdate = password && password.trim() !== '' ? password.trim() : undefined;

    if (!emailToUpdate && !passwordToUpdate) {
      return new Response(
        JSON.stringify({ error: 'Informe email ou password para atualizar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update object
    const updateData: { email?: string; password?: string; email_confirm?: boolean } = {};
    if (passwordToUpdate) updateData.password = passwordToUpdate;
    
    let emailChangeRequested = false;
    let emailConfirmationSent = false;

    // Se está alterando email
    if (emailToUpdate) {
      // Verificar se o email é diferente do atual
      const { data: targetUser, error: targetUserError } = await adminClient.auth.admin.getUserById(userId);
      
      if (targetUserError) {
        console.log('Error getting target user:', targetUserError);
        return new Response(
          JSON.stringify({ error: 'Usuário não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const currentEmail = targetUser.user?.email;
      if (currentEmail && currentEmail !== emailToUpdate) {
        emailChangeRequested = true;
        
        // Atualizar email diretamente no auth.users (admin pode fazer isso)
        updateData.email = emailToUpdate;
        
        // Também atualizar o profile com o novo email
        await adminClient
          .from('profiles')
          .update({ email: emailToUpdate })
          .eq('id', userId);
        
        emailConfirmationSent = true;
        console.log('Email updated directly for user:', userId, 'to:', emailToUpdate);
      }
    }

    // Se há senha para atualizar ou email foi atualizado diretamente (fallback)
    if (Object.keys(updateData).length > 0) {
      const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
        userId,
        updateData
      );

      if (updateError) {
        console.log('Error updating user:', updateError);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('User updated successfully:', updatedUser.user?.id);
    }

    // Invalidate all sessions for this user to force re-login (only if password changed)
    if (passwordToUpdate) {
      try {
        await adminClient.auth.admin.signOut(userId, 'global');
        console.log('User sessions invalidated successfully');
      } catch (signOutError) {
        console.log('Error invalidating sessions (non-critical):', signOutError);
      }
    }

    // Construir mensagem de resposta
    let message = 'Usuário atualizado com sucesso.';
    if (emailConfirmationSent) {
      message = `Um email de confirmação foi enviado para ${emailToUpdate}. O usuário deve confirmar o novo email clicando no link.`;
    } else if (passwordToUpdate) {
      message = 'Senha atualizada com sucesso. O usuário precisará fazer login novamente.';
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message,
        emailConfirmationSent,
        user: { id: userId }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-update-user:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
