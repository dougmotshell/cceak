/* * cceak — variáveis públicas de ambiente * * Única alteração de código necessária na implantação: informe a URL do projeto * Supabase e a chave pública (anon). A chave anon é pública por desenho; a segurança * dos dados fica no RLS (supabase/migrations/0001_site_settings.sql), nunca nesta chave. * NUNCA coloque a service_role aqui. * Deixando em branco, o site usa os valores padrão de config-schema.js e a administração fica desativada. */
window.CCEAK_ENV = {
  supabaseUrl: "https://xpxeygspemsfcdrvaxzy.supabase.co",
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweGV5Z3NwZW1zZmNkcnZheHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2NTI4MzksImV4cCI6MjEwOTIyODgzOX0.rNdy6gnajtP7LJyz__Btyg5x3H5J2cTsjqjR7lSKTCg"
};
