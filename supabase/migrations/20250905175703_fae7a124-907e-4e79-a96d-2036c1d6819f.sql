-- Adicionar colunas theme e gradient à tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gradient text;

-- As políticas já existem para profiles (users can view/update own profile)
-- Não precisamos criar novas políticas pois as existentes já cobrem essas colunas