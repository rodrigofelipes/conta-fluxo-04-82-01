import React, { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAdmins } from '@/hooks/useAdmins';

interface AdminSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function AdminSelect({ value, onValueChange, placeholder = "Selecionar admin...", className }: AdminSelectProps) {
  const [open, setOpen] = useState(false);
  const { admins, loading } = useAdmins();

  const selectedAdmin = admins.find((admin) => admin.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          {selectedAdmin
            ? `${selectedAdmin.full_name} (${selectedAdmin.username})`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar admin..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "Carregando..." : "Nenhum admin encontrado."}
            </CommandEmpty>
            <CommandGroup>
              {admins.map((admin) => (
                <CommandItem
                  key={admin.id}
                  value={`${admin.full_name} ${admin.username}`}
                  onSelect={() => {
                    onValueChange(admin.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === admin.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{admin.full_name}</span>
                    <span className="text-sm text-muted-foreground">@{admin.username}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}