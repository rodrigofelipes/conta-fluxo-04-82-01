import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";

export default function TwoFA() {
  const { setTheme } = useTheme();
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  
  // Force light theme on 2FA page
  useEffect(() => {
    setTheme("light");
  }, [setTheme]);
  
  const submit = (e: React.FormEvent) => { e.preventDefault(); navigate("/dashboard"); };

  return (
    <div className="min-h-screen grid place-items-center light">
      <Card className="w-[90%] max-w-[420px] card-elevated">
        <CardHeader>
          <CardTitle className="text-center">Verificação 2FA</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código do app autenticador</Label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" pattern="[0-9]*" />
            </div>
            <Button className="w-full" variant="soft" type="submit">Verificar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
