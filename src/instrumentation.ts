// Hook de boot do servidor (Next 15). Registra os inscritos do event bus (0D §5)
// uma vez, no runtime Node. Não roda no Edge.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerSubscribers } = await import("@/server/events/subscribers");
    registerSubscribers();
  }
}
