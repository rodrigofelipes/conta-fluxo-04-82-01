import { useGradientDatabase } from "@/hooks/useGradientDatabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function GradientPicker() {
  const { selectedGradient, gradientOptions, applyGradient } = useGradientDatabase();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Esquema de Cores</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Escolha um esquema de cores para personalizar a aparência do sistema.
        </p>
      </div>
      
      <div className="grid gap-3">
        {gradientOptions.map(option => (
          <Card
            key={option.name}
            className={`p-4 cursor-pointer transition-all hover:border-primary ${
              selectedGradient === option.name ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => applyGradient(option.name)}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-lg border shadow-sm" 
                style={{ background: option.gradient }}
              />
              <div className="font-medium">{option.name}</div>
              {selectedGradient === option.name && (
                <div className="ml-auto text-primary text-sm font-medium">Ativo</div>
              )}
            </div>
            <div 
              className="mt-3 h-3 rounded-full" 
              style={{ background: option.gradient }} 
            />
          </Card>
        ))}
      </div>
    </div>
  );
}