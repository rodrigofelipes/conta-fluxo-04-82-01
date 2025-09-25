import { useEffect } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/auth";

export function useThemeWithDatabase() {
  const { setTheme: setThemeInternal, resolvedTheme } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    const loadUserTheme = async () => {
      if (!user?.id) return;
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("theme")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile?.theme && profile.theme !== resolvedTheme) {
          setThemeInternal(profile.theme);
        }
      } catch (e) {
        console.error("Erro ao carregar tema:", e);
      }
    };
    loadUserTheme();
  }, [user?.id, resolvedTheme, setThemeInternal]);

  const setTheme = async (newTheme: "light" | "dark") => {
    setThemeInternal(newTheme);
    if (!user?.id) return;
    try {
      await supabase
        .from("profiles")
        .upsert(
          { user_id: user.id, theme: newTheme },
          { onConflict: "user_id" }
        );
    } catch (e) {
      console.error("Erro ao salvar tema:", e);
    }
  };

  return { theme: resolvedTheme, setTheme };
}