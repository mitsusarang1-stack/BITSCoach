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
  message: z.string().min(1, "Message cannot be empty.").max(2000),
});

const STORAGE_KEY = "chat-messages";

type StorageData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

const loadMessagesFromStorage = () => {
  if (typeof window === "undefined") return { messages: [], durations: {} };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { messages: [], durations: {} };
    const parsed = JSON.parse(stored);
    return {
      messages: parsed.messages || [],
      durations: parsed.durations || {},
    };
  } catch (e) {
    console.error("Failed to load from storage:", e);
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (messages: UIMessage[], durations: Record<string, number>) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, durations }));
};

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const welcomeShownRef = useRef(false);
  const stored = typeof window !== "undefined" ? loadMessagesFromStorage() : { messages: [], durations: {} };

  const [initialMessages] = useState(stored.messages);
  const [durations, setDurations] = useState<Record<string, number>>(stored.durations);

  const { messages, sendMessage, status, stop, setMessages } = useChat({ messages: initialMessages });

  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations);
    setMessages(stored.messages);
  }, []);

  useEffect(() => {
    if (isClient) saveMessagesToStorage(messages, durations);
  }, [messages, durations, isClient]);

  useEffect(() => {
    if (isClient && initialMessages.length === 0 && !welcomeShownRef.current) {
      const welcomeMsg: UIMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        parts: [{ type: "text", text: WELCOME_MESSAGE }],
      };
      setMessages([welcomeMsg]);
      saveMessagesToStorage([welcomeMsg], {});
      welcomeShownRef.current = true;
    }
  }, [isClient, initialMessages.length, setMessages]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  function onSubmit(data) {
    sendMessage({ text: data.message });
    form.reset();
  }

  function clearChat() {
    setMessages([]);
    setDurations({});
    saveMessagesToStorage([], {});
    toast.success("Chat cleared");
  }

  return (
    <div className="flex h-screen items-center justify-center font-sans bg-[#0D0A07] text-slate-50">
      <style jsx global>{`
        /* GLOBAL FIX → beautifully styled user bubble */
        .user-message-bubble,
        .message-user,
        .user-bubble,
        .chat-message-user {
          background: #2A1E18 !important;
          border: 1px solid #3A2A22 !important;
          color: #F5E1C8 !important;
          border-radius: 14px !important;
          padding: 10px 14px !important;
        }

        /* Assistant bubble if needed */
        .assistant-message-bubble,
        .message-assistant {
          background: #1A1410 !important;
          border: 1px solid #31261B !important;
          color: #F5E1C8 !important;
        }

        /* Remove the white bubble glitch */
        .bg-white {
          background: #2A1E18 !important;
          color: #F5E1C8 !important;
        }
      `}</style>

      <main className="relative h-screen w-full">

        {/* Header */}
        <div className="fixed left-0 right-0 top-0 z-50 border-b border-[#31261B] bg-[#0D0A07]/90 backdrop-blur">
          <ChatHeader>
            <ChatHeaderBlock />
            <ChatHeaderBlock className="items-center justify-center gap-2">
              <Avatar className="size-8 ring-1 ring-[#FF6A2D]/80">
                <AvatarImage src="/logo.png" />
                <AvatarFallback>
                  <Image src="/logo.png" alt="Logo" width={36} height={36} />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold tracking-tight">
                  Chat with {AI_NAME}
                </p>
                <p className="text-[11px] text-[#D8C2A8]">BITSoM domain-wise interview prep</p>
              </div>
            </ChatHeaderBlock>

            <ChatHeaderBlock className="justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer border-[#31261B] bg-[#1A1410]/80 text-xs text-[#D8C2A8]"
                onClick={clearChat}
              >
                <Plus className="mr-1 size-4" />
                {CLEAR_CHAT_TEXT}
              </Button>
            </ChatHeaderBlock>
          </ChatHeader>
        </div>

        {/* Chat Area */}
        <div className="h-screen w-full overflow-y-auto px-5 pt-[88px] pb-[150px]">
          <div className="flex min-h-full flex-col items-center justify-end">
            <div className="w-full max-w-3xl space-y-3">
              <section className="rounded-2xl border border-[#31261B] bg-[#0D0A07]/80 px-4 py-3 text-xs text-[#F5E1C8]">
                Ask me about <b>Marketing</b>, <b>Consulting</b>, <b>Ops & GenMan</b>, or <b>Product</b> interviews.
              </section>

              <section className="rounded-2xl border border-[#31261B] bg-[#1A1410]/90 px-3 py-4 md:px-4">
                {isClient ? (
                  <MessageWall
                    messages={messages}
                    status={status}
                    durations={durations}
                    onDurationChange={(k, d) =>
                      setDurations((prev) => ({ ...prev, [k]: d }))
                    }
                  />
                ) : (
                  <Loader2 className="size-4 animate-spin text-[#D8C2A8]" />
                )}
              </section>

              <p className="text-[10px] text-[#D8C2A8]">
                Note: Assistant uses anonymised student interview notes. Always cross-check with placement updates.
              </p>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#0D0A07] via-[#0D0A07]/80 to-transparent pt-13">
          <div className="flex w-full items-center justify-center px-5 pt-5 pb-1">
            <div className="w-full max-w-3xl">
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Controller
                    name="message"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="sr-only">Message</FieldLabel>
                        <div className="relative">
                          <Input
                            {...field}
                            className="h-12 rounded-2xl border border-[#31261B] bg-[#1A1410]/90 pr-14 pl-4 text-sm text-slate-50 placeholder:text-[#D8C2A8]/70"
                            placeholder="Ask about your upcoming interview…"
                            disabled={status === "streaming"}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                form.handleSubmit(onSubmit)();
                              }
                            }}
                          />
                          {(status === "ready" || status === "error") && (
                            <Button
                              type="submit"
                              className="absolute right-2 top-1.5 rounded-full bg-[#FF6A2D] text-black hover:bg-[#FFB08A]"
                              disabled={!field.value.trim()}
                              size="icon"
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                          )}
                          {(status === "streaming" || status === "submitted") && (
                            <Button
                              className="absolute right-2 top-1.5 rounded-full bg-[#31261B]"
                              size="icon"
                              type="button"
                              onClick={stop}
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

          <div className="flex w-full items-center justify-center px-5 py-3 text-xs text-[#D8C2A8]">
            © {new Date().getFullYear()} {OWNER_NAME}&nbsp;
            <Link href="/terms" className="underline">Terms of Use</Link>
            &nbsp;Powered by <Link className="underline" href="https://ringel.ai/">Ringel.AI</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
