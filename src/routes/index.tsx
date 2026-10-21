import { createFileRoute } from "@tanstack/react-router";
import { AssistantApp } from "@/components/assistant/assistant-app";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <AssistantApp />;
}
