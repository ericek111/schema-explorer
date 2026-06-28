import { describe, expect, it } from 'vitest';
import { ServerRuntimeConfig } from '../src/server/ServerRuntimeConfig';

describe('ServerRuntimeConfig', () => {
  it('defaults to the /schema base path', () => {
    expect(new ServerRuntimeConfig({}).basePath()).toBe('/schema');
  });

  it('normalizes configured base paths', () => {
    expect(new ServerRuntimeConfig({ SCHEMA_BASE_PATH: '/explorer/' }).basePath()).toBe('/explorer');
    expect(new ServerRuntimeConfig({ SCHEMA_BASE_PATH: '/' }).basePath()).toBe('/');
  });

  it('defaults to TCP port 8787', () => {
    expect(new ServerRuntimeConfig({}).listenConfig()).toEqual({ kind: 'tcp', port: 8787, hostname: undefined });
  });

  it('reads TCP port and host from the environment', () => {
    expect(new ServerRuntimeConfig({ PORT: '9000', HOST: '127.0.0.1' }).listenConfig()).toEqual({
      kind: 'tcp',
      port: 9000,
      hostname: '127.0.0.1'
    });
  });

  it('prefers a Unix socket over TCP settings', () => {
    expect(new ServerRuntimeConfig({ PORT: '9000', SCHEMA_SOCKET: '/run/schema/schema.sock' }).listenConfig()).toEqual({
      kind: 'socket',
      path: '/run/schema/schema.sock',
      mode: undefined
    });
  });

  it('parses octal Unix socket modes', () => {
    expect(new ServerRuntimeConfig({ SCHEMA_SOCKET: '/run/schema/schema.sock', SCHEMA_SOCKET_MODE: '660' }).listenConfig()).toEqual({
      kind: 'socket',
      path: '/run/schema/schema.sock',
      mode: 0o660
    });
  });

  it('rejects invalid port and socket mode values', () => {
    expect(() => new ServerRuntimeConfig({ SCHEMA_BASE_PATH: 'explorer' }).basePath()).toThrow('Base path');
    expect(() => new ServerRuntimeConfig({ PORT: '0' }).listenConfig()).toThrow('Invalid PORT');
    expect(() => new ServerRuntimeConfig({ SCHEMA_SOCKET: '/tmp/schema.sock', SCHEMA_SOCKET_MODE: '999' }).listenConfig()).toThrow(
      'Invalid socket mode'
    );
  });
});
