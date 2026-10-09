import { Injectable, Logger } from '@nestjs/common';
import WebSocket from 'ws';
import { WhitelistStoreService } from './whitelist-store.service';

@Injectable()
export class WhitelistSyncService {
    private readonly logger = new Logger(WhitelistSyncService.name);

    constructor(private readonly store: WhitelistStoreService) { }

    async syncAll() {
        const usernames = this.store.listUsers().map((row) => row.minecraftUser);
        const serverIds = this.getServerIds();
        if (serverIds.length === 0) {
            throw new Error('PTERODACTYL_SERVER_IDS is not configured.');
        }

        let synced = 0;
        let failed = 0;
        for (const serverId of serverIds) {
            for (const minecraftUser of usernames) {
                try {
                    await this.applyWhitelistToServer(serverId, minecraftUser);
                    synced++;
                } catch {
                    failed++;
                }
            }
        }

        return { usernameCount: usernames.length, serverCount: serverIds.length, synced, failed };
    }

    async syncUser(minecraftUser: string) {
        const serverIds = this.getServerIds();
        if (serverIds.length === 0) {
            throw new Error('PTERODACTYL_SERVER_IDS is not configured.');
        }

        for (const serverId of serverIds) {
            await this.applyWhitelistToServer(serverId, minecraftUser);
        }
    }

    private getPanelUrl() {
        return (process.env.PTERODACTYL_PANEL_URL ?? '').replace(/\/+$/, '');
    }

    private getApiKey() {
        return process.env.PTERODACTYL_CLIENT_API_KEY ?? '';
    }

    private getServerIds() {
        return (process.env.PTERODACTYL_SERVER_IDS ?? '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
    }

    private async getWebSocketUrl(serverId: string) {
        const panelUrl = this.getPanelUrl();
        const apiKey = this.getApiKey();

        if (!panelUrl || !apiKey) {
            throw new Error(
                'PTERODACTYL_PANEL_URL and PTERODACTYL_CLIENT_API_KEY must be set.',
            );
        }

        const response = await fetch(
            `${panelUrl}/api/client/servers/${serverId}/websocket`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    Accept: 'Application/vnd.pterodactyl.v1+json',
                },
            },
        );

        if (!response.ok) {
            const text = await response.text();
            throw new Error(
                `Failed to fetch websocket token for server ${serverId}: ${response.status} ${text}`,
            );
        }

        const data = (await response.json()) as {
            data?: {
                token?: string;
                socket?: string;
            };
        };

        if (!data.data?.token || !data.data?.socket) {
            throw new Error(
                `Pterodactyl websocket token payload for server ${serverId} is missing the token or socket URL.`,
            );
        }

        return {
            token: data.data.token,
            socketUrl: data.data.socket,
        };
    }

    private async waitForOpen(socket: WebSocket) {
        if (socket.readyState === WebSocket.OPEN) {
            return;
        }

        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                socket.off('open', onOpen);
                socket.off('error', onError);
                reject(new Error('Timed out while opening the Pterodactyl websocket.'));
            }, 10000);

            const onOpen = () => {
                clearTimeout(timer);
                socket.off('error', onError);
                resolve();
            };

            const onError = (error: Error) => {
                clearTimeout(timer);
                socket.off('open', onOpen);
                reject(error);
            };

            socket.once('open', onOpen);
            socket.once('error', onError);
        });
    }

    private async applyWhitelistToServer(serverId: string, minecraftUser: string) {
        let socket: WebSocket | undefined;
        try {
            const { socketUrl, token } = await this.getWebSocketUrl(serverId);
            socket = new WebSocket(socketUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Origin: this.getPanelUrl(),
                },
            });

            await this.waitForOpen(socket);

            socket.send(
                JSON.stringify({
                    event: 'auth',
                    args: [token],
                }),
            );

            await new Promise((resolve) => setTimeout(resolve, 250));

            socket.send(
                JSON.stringify({
                    event: 'send command',
                    args: [`whitelist add ${minecraftUser}`],
                }),
            );

            this.logger.log(
                `Whitelist command sent to server ${serverId} for username ${minecraftUser}.`,
            );

            await new Promise((resolve) => setTimeout(resolve, 1500));
        } catch (error) {
            this.logger.error(
                `Failed to sync ${minecraftUser} to server ${serverId}.`,
                error,
            );
            throw error;
        } finally {
            socket?.close();
        }
    }
}
