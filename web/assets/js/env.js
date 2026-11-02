/*
 * cceak — variáveis públicas de ambiente
 * Classificação da informação (ISO/IEC 27001): Uso Interno
 *
 * Única alteração de código necessária na implantação: informe a URL do projeto
 * Supabase e a chave pública (anon). A chave anon é pública por desenho; a segurança
 * dos dados fica no RLS (supabase/migrations/0001_site_settings.sql), nunca nesta chave.
 * NUNCA coloque a service_role aqui.
 * Deixando em branco, o site usa os valores padrão de config-schema.js e a administração fica desativada.
 */
window.CCEAK_ENV = {
  // TODO: https://<projeto>.supabase.co
  supabaseUrl: "",
  // TODO: chave pública anon do projeto (Project Settings > API)
  supabaseAnonKey: ""
};
