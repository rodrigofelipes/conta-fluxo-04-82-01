import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/auth";

export const gradientOptions = [
  {
    name: "Dourado Atual",
    gradient: "linear-gradient(135deg, hsl(223 71% 45%) 0%, hsl(198 93% 60%) 40%, hsl(223 71% 45%) 80%, hsl(262 83% 58%) 100%)",
    colors: {
      primary: "223 71% 45%",
      brand: "223 71% 45%",
      brand2: "198 93% 60%",
      brand3: "262 83% 58%",
      ring: "223 71% 45%"
    }
  },
  {
    name: "Azul Oceano",
    gradient: "linear-gradient(135deg, hsl(210 100% 56%) 0%, hsl(220 90% 70%) 50%, hsl(200 85% 45%) 100%)",
    colors: {
      primary: "210 100% 56%",
      brand: "210 100% 56%",
      brand2: "220 90% 70%",
      brand3: "200 85% 45%",
      ring: "210 100% 56%"
    }
  },
  {
    name: "Verde Esmeralda",
    gradient: "linear-gradient(135deg, hsl(160 84% 39%) 0%, hsl(170 90% 50%) 50%, hsl(150 75% 35%) 100%)",
    colors: {
      primary: "160 84% 39%",
      brand: "160 84% 39%",
      brand2: "170 90% 50%",
      brand3: "150 75% 35%",
      ring: "160 84% 39%"
    }
  },
  {
    name: "Roxo Místico",
    gradient: "linear-gradient(135deg, hsl(280 70% 55%) 0%, hsl(290 85% 70%) 50%, hsl(270 60% 45%) 100%)",
    colors: {
      primary: "280 70% 55%",
      brand: "280 70% 55%",
      brand2: "290 85% 70%",
      brand3: "270 60% 45%",
      ring: "280 70% 55%"
    }
  },
  {
    name: "Laranja Sunset",
    gradient: "linear-gradient(135deg, hsl(25 95% 60%) 0%, hsl(35 100% 70%) 50%, hsl(15 85% 50%) 100%)",
    colors: {
      primary: "25 95% 60%",
      brand: "25 95% 60%",
      brand2: "35 100% 70%",
      brand3: "15 85% 50%",
      ring: "25 95% 60%"
    }
  },
  {
    name: "Rosa Suave",
    gradient: "linear-gradient(135deg, hsl(330 70% 65%) 0%, hsl(340 85% 75%) 50%, hsl(320 60% 55%) 100%)",
    colors: {
      primary: "330 70% 65%",
      brand: "330 70% 65%",
      brand2: "340 85% 75%",
      brand3: "320 60% 55%",
      ring: "330 70% 65%"
    }
  },
  {
    name: "Ciano Tecnológico",
    gradient: "linear-gradient(135deg, hsl(180 70% 55%) 0%, hsl(190 85% 65%) 50%, hsl(170 60% 45%) 100%)",
    colors: {
      primary: "180 70% 55%",
      brand: "180 70% 55%",
      brand2: "190 85% 65%",
      brand3: "170 60% 45%",
      ring: "180 70% 55%"
    }
  },
  {
    name: "Vermelho Elegante",
    gradient: "linear-gradient(135deg, hsl(0 75% 58%) 0%, hsl(10 85% 68%) 50%, hsl(350 70% 48%) 100%)",
    colors: {
      primary: "0 75% 58%",
      brand: "0 75% 58%",
      brand2: "10 85% 68%",
      brand3: "350 70% 48%",
      ring: "0 75% 58%"
    }
  },
  {
    name: "Azul Noturno",
    gradient: "linear-gradient(135deg, hsl(240 65% 45%) 0%, hsl(250 80% 60%) 50%, hsl(230 55% 35%) 100%)",
    colors: {
      primary: "240 65% 45%",
      brand: "240 65% 45%",
      brand2: "250 80% 60%",
      brand3: "230 55% 35%",
      ring: "240 65% 45%"
    }
  },
  {
    name: "Verde Menta",
    gradient: "linear-gradient(135deg, hsl(140 60% 55%) 0%, hsl(150 75% 65%) 50%, hsl(130 50% 45%) 100%)",
    colors: {
      primary: "140 60% 55%",
      brand: "140 60% 55%",
      brand2: "150 75% 65%",
      brand3: "130 50% 45%",
      ring: "140 60% 55%"
    }
  },
  {
    name: "Dourado Luxo",
    gradient: "linear-gradient(135deg, hsl(45 100% 65%) 0%, hsl(50 95% 75%) 30%, hsl(40 90% 55%) 70%, hsl(35 85% 45%) 100%)",
    colors: {
      primary: "45 100% 65%",
      brand: "45 100% 65%",
      brand2: "50 95% 75%",
      brand3: "35 85% 45%",
      ring: "45 100% 65%"
    }
  },
  {
    name: "Prata Metálico",
    gradient: "linear-gradient(135deg, hsl(220 15% 65%) 0%, hsl(200 20% 75%) 50%, hsl(240 10% 55%) 100%)",
    colors: {
      primary: "220 15% 65%",
      brand: "220 15% 65%",
      brand2: "200 20% 75%",
      brand3: "240 10% 55%",
      ring: "220 15% 65%"
    }
  }
];

export function useGradientDatabase() {
  const { user } = useAuth();
  const [selectedGradient, setSelectedGradient] = useState("Dourado Atual");

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        applyGradient("Dourado Atual", false);
        return;
      }
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("gradient")
          .eq("user_id", user.id)
          .maybeSingle();

        const name = profile?.gradient || "Dourado Atual";
        setSelectedGradient(name);
        applyGradient(name, false);
      } catch (e) {
        console.error("Erro ao carregar gradiente:", e);
        applyGradient("Dourado Atual", false);
      }
    };
    load();
  }, [user?.id]);

  const applyGradient = async (gradientName: string, persist = true) => {
    const option = gradientOptions.find(g => g.name === gradientName);
    if (!option) return;

    const root = document.documentElement;

    root.style.setProperty("--gradient-primary", option.gradient);
    root.style.setProperty("--gradient-support", option.gradient);

    root.style.setProperty("--primary", option.colors.primary);
    root.style.setProperty("--brand", option.colors.brand);
    root.style.setProperty("--brand-2", option.colors.brand2);
    root.style.setProperty("--brand-3", option.colors.brand3);
    root.style.setProperty("--ring", option.colors.ring);

    root.style.setProperty("--sidebar-primary", option.colors.primary);
    root.style.setProperty("--sidebar-ring", option.colors.ring);

    setSelectedGradient(gradientName);

    if (persist && user?.id) {
      try {
        await supabase
          .from("profiles")
          .upsert(
            { user_id: user.id, gradient: gradientName },
            { onConflict: "user_id" }
          );
      } catch (e) {
        console.error("Erro ao salvar gradiente:", e);
      }
    }
  };

  return { selectedGradient, applyGradient, gradientOptions };
}