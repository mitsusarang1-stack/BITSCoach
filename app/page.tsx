"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Plus, Square } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader } from "@/app/parts/chat-header";
import { ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config";
import Image from "next/image";
import Link from "next/link";

const formSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters."),
});

const STORAGE_KEY = "chat-messages";

type StorageData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

const loadMessagesFromStorage = (): {
  messages: UIMessage[];
  durations: Record<string, number>;
} => {
  if (typeof window === "undefined") return { messages: [], durations: {} };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { messages: [], durations: {} };

    const parsed = JSON.parse(stored);
    return {
      messages: parsed.messages || [],
      durations: parsed.durations || {},
    };
  } catch (error) {
    console.error("Failed to load messages from localStorage:", error);
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (
  messages: UIMessage[],
  durations: Record<string, number>
) => {
  if (typeof window === "undefined") return;
  try {
    const data: StorageData = { messages, durations };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save messages to localStorage:", error);
  }
};

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const welcomeMessageShownRef = useRef<boolean>(false);

  const stored =
    typeof window !== "undefined"
      ? loadMessagesFromStorage()
      : { messages: [], durations: {} };
  const [initialMessages] = useState<UIMessage[]>(stored.messages);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initialMessages,
  });

  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations);
    setMessages(stored.messages);
  }, []);

  useEffect(() => {
    if (isClient) {
      saveMessagesToStorage(messages, durations);
    }
  }, [durations, messages, isClient]);

  const handleDurationChange = (key: string, duration: number) => {
    setDurations((prevDurations) => {
      const newDurations = { ...prevDurations };
      newDurations[key] = duration;
      return newDurations;
    });
  };

  useEffect(() => {
    if (
      isClient &&
      initialMessages.length === 0 &&
      !welcomeMessageShownRef.current
    ) {
      const welcomeMessage: UIMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: WELCOME_MESSAGE,
          },
        ],
      };
      setMessages([welcomeMessage]);
      saveMessagesToStorage([welcomeMessage], {});
      welcomeMessageShownRef.current = true;
    }
  }, [isClient, initialMessages.length, setMessages]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    sendMessage({ text: data.message });
    form.reset();
  }

  function clearChat() {
    const newMessages: UIMessage[] = [];
    const newDurations = {};
    setMessages(newMessages);
    setDurations(newDurations);
    saveMessagesToStorage(newMessages, newDurations);
    toast.success("Chat cleared");
  }

  return (
    <div className="flex h-screen items-center justify-center font-sans bg-slate-950 text-slate-50">
      <main className="relative h-screen w-full">
        {/* Top header */}
        <div className="fixed left-0 right-0 top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
          <div className="relative">
            <ChatHeader>
              <ChatHeaderBlock />
              <ChatHeaderBlock className="items-center justify-center gap-2">
                <Avatar className="size-8 ring-1 ring-emerald-500/70">
                  <AvatarImage src="/logo.png" />
                  <AvatarFallback>
                    <Image
                      src="/logo.png"
                      alt="Logo"
                      width={36}
                      height={36}
                    />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className="text-sm font-semibold tracking-tight">
                    Chat with {AI_NAME}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    BITSoM domain-wise interview prep
                  </p>
                </div>
              </ChatHeaderBlock>
              <ChatHeaderBlock className="justify-end gap-2">
                <span className="hidden items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200 md:inline-flex">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Live · GPT-4.1
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer border-slate-700 bg-slate-900/80 text-xs"
                  onClick={clearChat}
                >
                  <Plus className="mr-1 size-4" />
                  {CLEAR_CHAT_TEXT}
                </Button>
              </ChatHeaderBlock>
            </ChatHeader>
          </div>
        </div>

        {/* Scrollable chat area */}
        <div className="h-screen w-full overflow-y-auto px-5 pt-[88px] pb-[150px]">
          <div className="flex min-h-full flex-col items-center justify-end">
            <div className="w-full max-w-3xl space-y-3">
              {/* Small intro + domain hints */}
              <section className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-xs text-slate-300 shadow-[0_0_40px_rgba(15,23,42,0.8)]">
                <p className="mb-2">
                  Ask me about{" "}
                  <span className="font-semibold">Marketing</span>,{" "}
                  <span className="font-semibold">Consulting</span>,{" "}
                  <span className="font-semibold">Ops &amp; GenMan</span>, or{" "}
                  <span className="font-semibold">Product</span> interviews.
                  I&apos;ll help with process, likely questions, and
                  structuring your answers.
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5">
                    “What does the BigBasket marketing process look like?”
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5">
                    “Give me 5 consulting questions and how to structure them.”
                  </span>
                </div>
              </section>

              {/* Chat card */}
              <section className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-4 md:px-4">
                <div className="flex flex-col items-center justify-end">
                  {isClient ? (
                    <>
                      <MessageWall
                        messages={messages}
                        status={status}
                        durations={durations}
                        onDurationChange={handleDurationChange}
                      />
                      {status === "submitted" && (
                        <div className="mt-2 flex w-full max-w-3xl justify-start text-slate-400">
                          <Loader2 className="size-4 animate-spin" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex w-full max-w-2xl justify-center">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </section>

              <p className="text-[10px] text-slate-500">
                Note: This assistant is based on anonymised past student
                interviews and public information. Processes can change—always
                cross-check with the latest placement communication.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom input area */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pt-13">
          <div className="flex w-full items-center justify-center px-5 pt-5 pb-1">
            <div className="message-fade-overlay" />
            <div className="w-full max-w-3xl">
              <form id="chat-form" onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Controller
                    name="message"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel
                          htmlFor="chat-form-message"
                          className="sr-only"
                        >
                          Message
                        </FieldLabel>
                        <div className="relative">
                          <Input
                            {...field}
                            id="chat-form-message"
                            className="h-12 rounded-2xl border border-slate-700 bg-slate-900/90 pr-14 pl-4 text-sm placeholder:text-slate-500"
                            placeholder="Ask about your upcoming interview…"
                            disabled={status === "streaming"}
                            aria-invalid={fieldState.invalid}
                            autoComplete="off"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                form.handleSubmit(onSubmit)();
                              }
                            }}
                          />
                          {(status === "ready" || status === "error") && (
                            <Button
                              className="absolute right-2 top-1.5 rounded-full bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                              type="submit"
                              disabled={!field.value.trim()}
                              size="icon"
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                          )}
                          {(status === "streaming" ||
                            status === "submitted") && (
                            <Button
                              className="absolute right-2 top-1.5 rounded-full bg-slate-800 hover:bg-slate-700"
                              size="icon"
                              type="button"
                              onClick={() => {
                                stop();
                              }}
                            >
                              <Square className="size-4" />
                            </Button>
                          )}
                        </div>
                      </Field>
                    )}
                  />
                </FieldGroup>
              </form>
            </div>
          </div>
          <div className="flex w-full items-center justify-center px-5 py-3 text-xs text-muted-foreground">
            © {new Date().getFullYear()} {OWNER_NAME}&nbsp;
            <Link href="/terms" className="underline">
              Terms of Use
            </Link>
            &nbsp;Powered by&nbsp;
            <Link href="https://ringel.ai/" className="underline">
              Ringel.AI
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
