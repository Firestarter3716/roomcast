interface SSEClient {
  id: string;
  displayId: string;
  calendarIds: string[];
  controller: ReadableStreamDefaultController;
  connectedAt: Date;
  lastHeartbeat: Date;
}

class SSERegistry {
  private clients = new Map<string, SSEClient>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof setInterval !== "undefined") {
      this.heartbeatInterval = setInterval(() => this.sendHeartbeats(), 30000);
    }
  }

  register(client: SSEClient): void {
    this.clients.set(client.id, client);
  }

  unregister(clientId: string): void {
    this.clients.delete(clientId);
  }

  getActiveCount(): number {
    return this.clients.size;
  }

  getClientsByCalendarId(calendarId: string): SSEClient[] {
    return Array.from(this.clients.values()).filter((c) => c.calendarIds.includes(calendarId));
  }

  getClientsByDisplayId(displayId: string): SSEClient[] {
    return Array.from(this.clients.values()).filter((c) => c.displayId === displayId);
  }

  notifyCalendarUpdate(calendarId: string, events: unknown[]): void {
    const clients = this.getClientsByCalendarId(calendarId);
    const payload = JSON.stringify({ type: "calendar_update", calendarId, events });
    for (const client of clients) this.sendToClient(client, payload);
  }

  notifyDisplayConfigUpdate(displayId: string, config: unknown): void {
    const clients = this.getClientsByDisplayId(displayId);
    const payload = JSON.stringify({ type: "config_update", config });
    for (const client of clients) this.sendToClient(client, payload);
  }

  private sendToClient(client: SSEClient, data: string): void {
    try {
      const encoder = new TextEncoder();
      client.controller.enqueue(encoder.encode(`data: ${data}\n\n`));
    } catch {
      this.unregister(client.id);
    }
  }

  private sendHeartbeats(): void {
    const encoder = new TextEncoder();
    const now = new Date();
    for (const [id, client] of this.clients) {
      try {
        client.controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        client.lastHeartbeat = now;
      } catch {
        this.clients.delete(id);
      }
    }
  }

  getStatus() {
    const clients = Array.from(this.clients.values());
    return {
      activeConnections: clients.length,
      displays: [...new Set(clients.map((c) => c.displayId))].length,
      clients: clients.map((c) => ({
        id: c.id,
        displayId: c.displayId,
        connectedAt: c.connectedAt,
        lastHeartbeat: c.lastHeartbeat,
      })),
    };
  }
}

const globalForSSE = globalThis as unknown as { sseRegistry: SSERegistry };
export const sseRegistry = globalForSSE.sseRegistry ?? new SSERegistry();
if (process.env.NODE_ENV !== "production") globalForSSE.sseRegistry = sseRegistry;
