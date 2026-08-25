"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { AttributePreview } from "@/components/onboarding/attribute-preview";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NATIONALITIES } from "@/data/nationalities";
import {
  POSITION_GROUPS,
  getPositionGroup,
  newGameFormSchema,
  rollStartingAttributes,
  type NewGameFormValues,
} from "@/lib/game/player-creation";
import { useGameStore } from "@/store/game-store";

const NATIONALITY_ITEMS = NATIONALITIES.map(({ code, label, flag }) => ({
  value: code,
  label: `${flag} ${label}`,
}));

const POSITION_ITEMS = POSITION_GROUPS.map(({ id, label }) => ({
  value: id,
  label,
}));

export function NewGameForm() {
  const router = useRouter();
  const createCareer = useGameStore((state) => state.createCareer);

  const form = useForm<NewGameFormValues>({
    resolver: zodResolver(newGameFormSchema),
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      nationality: "NL",
      position: "midfielder",
    },
  });

  const [firstName, lastName, position] = useWatch({
    control: form.control,
    name: ["firstName", "lastName", "position"],
  });

  const selectedGroup = getPositionGroup(position);
  const previewAttributes = rollStartingAttributes(
    `${firstName} ${lastName}`.trim(),
    position
  );

  const onSubmit = (values: NewGameFormValues) => {
    createCareer(values);
    router.push("/dashboard");
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Voornaam</FormLabel>
                <FormControl>
                  <Input placeholder="Sem" autoComplete="given-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Achternaam</FormLabel>
                <FormControl>
                  <Input
                    placeholder="de Vries"
                    autoComplete="family-name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="nationality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nationaliteit</FormLabel>
              <Select
                items={NATIONALITY_ITEMS}
                value={field.value || null}
                onValueChange={(value) => field.onChange(value ?? "")}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Kies een land" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {NATIONALITIES.map((nationality) => (
                    <SelectItem key={nationality.code} value={nationality.code}>
                      <span aria-hidden>{nationality.flag}</span>
                      {nationality.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Positie op het veld</FormLabel>
              <Select
                items={POSITION_ITEMS}
                value={field.value || null}
                onValueChange={(value) => field.onChange(value ?? "")}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Kies een positie" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {POSITION_GROUPS.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>{selectedGroup.description}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium">Startattributen</p>
            <p className="text-xs text-muted-foreground">
              {selectedGroup.label} · {selectedGroup.position}
            </p>
          </div>
          <AttributePreview attributes={previewAttributes} />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          Start je carrière
        </Button>
      </form>
    </Form>
  );
}
