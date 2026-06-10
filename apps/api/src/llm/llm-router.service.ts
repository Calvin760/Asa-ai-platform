import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type LLMProvider = 'claude' | 'openai';
export type LLMRoutingMode = 'auto' | LLMProvider;

export interface LLMResponse {
    content: LLMContentBlock[];
    stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
    };
    provider: LLMProvider;
}

export interface LLMContentBlock {
    type: 'text' | 'tool_use';
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, any>;
}

export interface LLMToolDefinition {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: Record<string, any>;
        required: string[];
    };
}

export interface LLMMessage {
    role: 'user' | 'assistant';
    content: string | LLMContentBlock[];
}

@Injectable()
export class LLMRouterService {
    private readonly logger = new Logger(LLMRouterService.name);

    private anthropic: Anthropic;
    private openai: OpenAI;

    private primaryProvider: LLMProvider;
    private fallbackProvider: LLMProvider;

    constructor(private configService: ConfigService) {
        this.anthropic = new Anthropic({
            apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
        });

        this.openai = new OpenAI({
            apiKey: this.configService.get<string>('OPENAI_API_KEY'),
        });

        // =========================
        // ✅ OPENAI IS NOW PRIMARY
        // =========================
        this.primaryProvider =
            (this.configService.get<LLMProvider>('LLM_PRIMARY_PROVIDER') ??
                'openai');

        this.fallbackProvider =
            (this.configService.get<LLMProvider>('LLM_FALLBACK_PROVIDER') ??
                'claude');

        this.logger.log(
            `LLM Router ready: primary=${this.primaryProvider}, fallback=${this.fallbackProvider}`,
        );
    }

    // =========================================================
    // PUBLIC ENTRY
    // =========================================================
    async call(options: {
        model?: string;
        messages: LLMMessage[];
        systemPrompt?: string;
        tools?: LLMToolDefinition[];
        maxTokens?: number;
        temperature?: number;
        provider?: LLMRoutingMode;
    }): Promise<LLMResponse> {
        const provider = options.provider ?? 'auto';

        if (provider === 'auto') {
            return this.callWithFallback(options);
        }

        return this.callSingleProvider(provider, options);
    }

    // =========================================================
    // ROUTING
    // =========================================================
    private async callWithFallback(options: any): Promise<LLMResponse> {
        try {
            return await this.callSingleProvider(this.primaryProvider, options);
        } catch (err: any) {
            this.logger.warn(
                `[LLMRouter] Primary (${this.primaryProvider}) failed: ${err.message}`,
            );

            return await this.callSingleProvider(this.fallbackProvider, options);
        }
    }

    private async callSingleProvider(
        provider: LLMProvider,
        options: any,
    ): Promise<LLMResponse> {
        return provider === 'claude'
            ? this.callClaude(options)
            : this.callOpenAI(options);
    }

    // =========================================================
    // SAFE MESSAGE NORMALIZER (IMPORTANT FIX)
    // =========================================================
    private normalizeMessages(messages: LLMMessage[]) {
        return messages.map((msg) => ({
            role: msg.role,
            content:
                typeof msg.content === 'string'
                    ? msg.content
                    : JSON.stringify(
                        msg.content.filter((b) => b.type === 'text' || b.type === 'tool_use'),
                    ),
        }));
    }

    // =========================================================
    // OPENAI (PRIMARY)
    // =========================================================
    private async callOpenAI(options: any): Promise<LLMResponse> {
        const model = options.model ?? 'gpt-4o-mini';

        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

        if (options.systemPrompt) {
            messages.push({
                role: 'system',
                content: options.systemPrompt,
            });
        }

        messages.push(
            ...options.messages.map((msg: LLMMessage) => ({
                role: msg.role,
                content:
                    typeof msg.content === 'string'
                        ? msg.content
                        : JSON.stringify(msg.content),
            })),
        );

        const response = await this.openai.chat.completions.create({
            model,
            max_tokens: options.maxTokens ?? 2048,
            temperature: options.temperature ?? 0.7,
            messages,

            // ✅ ADD THIS BLOCK
            tools: options.tools?.map((tool: any) => ({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.input_schema,
                },
            })),

            tool_choice: 'auto',
        });

        const content: LLMContentBlock[] = [];

        const choice = response.choices[0];

        if (choice?.message?.content) {
            content.push({
                type: 'text',
                text: choice.message.content,
            });
        }

        // ✅ FIX TOOL PARSING
        const toolCalls = choice?.message?.tool_calls ?? [];

        for (const toolCall of toolCalls) {
            if (toolCall.type === 'function') {
                content.push({
                    type: 'tool_use',
                    id: toolCall.id,
                    name: toolCall.function.name,
                    input: JSON.parse(toolCall.function.arguments || '{}'),
                });
            }
        }

        return {
            content,
            stopReason: response.choices[0]?.finish_reason ?? 'end_turn',
            usage: {
                inputTokens: response.usage?.prompt_tokens ?? 0,
                outputTokens: response.usage?.completion_tokens ?? 0,
            },
            provider: 'openai',
        };
    }
    // =========================================================
    // CLAUDE (FALLBACK)
    // =========================================================
    private async callClaude(options: any): Promise<LLMResponse> {
        const model = options.model ?? 'claude-3-5-sonnet-latest';

        const messages: Anthropic.MessageParam[] = options.messages.map(
            (msg: LLMMessage) => ({
                role: msg.role,
                content:
                    typeof msg.content === 'string'
                        ? msg.content
                        : JSON.stringify(msg.content),
            }),
        );

        const response = await this.anthropic.messages.create({
            model,
            max_tokens: options.maxTokens ?? 2048,
            system: options.systemPrompt,
            messages,
            tools: options.tools?.map((tool: LLMToolDefinition) => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.input_schema as any,
            })),
        });

        const content: LLMContentBlock[] = [];

        for (const block of response.content) {
            if (block.type === 'text') {
                content.push({ type: 'text', text: block.text });
            }

            if (block.type === 'tool_use') {
                content.push({
                    type: 'tool_use',
                    id: block.id,
                    name: block.name,
                    input: (block.input ?? {}) as Record<string, any>,
                });
            }
        }

        return {
            content,
            stopReason: response.stop_reason ?? 'end_turn',
            usage: {
                inputTokens: response.usage?.input_tokens ?? 0,
                outputTokens: response.usage?.output_tokens ?? 0,
            },
            provider: 'claude',
        };
    }

    // =========================================================
    // HEALTH CHECK
    // =========================================================
    async healthCheck() {
        const result = {
            primary: { available: false, error: undefined as string | undefined },
            fallback: { available: false, error: undefined as string | undefined },
        };

        try {
            await this.callSingleProvider(this.primaryProvider, {
                messages: [{ role: 'user', content: 'ping' }],
            });
            result.primary.available = true;
        } catch (err: any) {
            result.primary.error = err.message;
        }

        try {
            await this.callSingleProvider(this.fallbackProvider, {
                messages: [{ role: 'user', content: 'ping' }],
            });
            result.fallback.available = true;
        } catch (err: any) {
            result.fallback.error = err.message;
        }

        return result;
    }

    // =========================================================
    // CONFIG
    // =========================================================
    getConfig() {
        return {
            primary: this.primaryProvider,
            fallback: this.fallbackProvider,
            claudeConfigured: !!this.configService.get('ANTHROPIC_API_KEY'),
            openaiConfigured: !!this.configService.get('OPENAI_API_KEY'),
        };
    }
}