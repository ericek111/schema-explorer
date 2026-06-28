export type ListenConfig =
  | {
      kind: 'tcp';
      port: number;
      hostname?: string;
    }
  | {
      kind: 'socket';
      path: string;
      mode?: number;
    };

export class ServerRuntimeConfig {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  basePath(): string {
    const value = this.env.SCHEMA_BASE_PATH || this.env.BASE_PATH || '/schema';
    if (!value.startsWith('/')) {
      throw new Error(`Base path must start with "/": ${value}`);
    }
    return value === '/' ? '/' : value.replace(/\/+$/, '');
  }

  listenConfig(): ListenConfig {
    const socketPath = this.env.SCHEMA_SOCKET || this.env.SOCKET_PATH;
    if (socketPath) {
      return {
        kind: 'socket',
        path: socketPath,
        mode: this.parseSocketMode(this.env.SCHEMA_SOCKET_MODE || this.env.SOCKET_MODE)
      };
    }

    return {
      kind: 'tcp',
      port: this.parsePort(this.env.PORT),
      hostname: this.env.HOST || undefined
    };
  }

  private parsePort(value: string | undefined): number {
    const port = Number(value ?? 8787);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid PORT value: ${value}`);
    }
    return port;
  }

  private parseSocketMode(value: string | undefined): number | undefined {
    if (!value) {
      return undefined;
    }
    if (!/^[0-7]{3,4}$/.test(value)) {
      throw new Error(`Invalid socket mode: ${value}`);
    }
    return Number.parseInt(value, 8);
  }
}
