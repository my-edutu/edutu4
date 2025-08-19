// Multi-Provider LLM Service
// Provides fallback support across multiple LLM providers for maximum reliability

interface LLMProvider {
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
  priority: number;
  enabled: boolean;
  timeout: number;
}

interface LLMRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

class MultiProviderLLMService {
  private providers: LLMProvider[] = [
    {
      name: 'OpenAI',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
      model: 'gpt-3.5-turbo',
      priority: 1,
      enabled: !!import.meta.env.VITE_OPENAI_API_KEY,
      timeout: 30000
    },
    {
      name: 'Claude',
      endpoint: 'https://api.anthropic.com/v1/messages',
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
      model: 'claude-3-haiku-20240307',
      priority: 2,
      enabled: !!import.meta.env.VITE_ANTHROPIC_API_KEY,
      timeout: 30000
    },
    {
      name: 'Groq',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
      model: 'llama3-8b-8192',
      priority: 3,
      enabled: !!import.meta.env.VITE_GROQ_API_KEY,
      timeout: 20000
    },
    {
      name: 'Together',
      endpoint: 'https://api.together.xyz/v1/chat/completions',
      apiKey: import.meta.env.VITE_TOGETHER_API_KEY || '',
      model: 'meta-llama/Llama-3-8b-chat-hf',
      priority: 4,
      enabled: !!import.meta.env.VITE_TOGETHER_API_KEY,
      timeout: 25000
    }
  ];

  private failureCount = new Map<string, number>();
  private lastFailureTime = new Map<string, number>();
  private readonly MAX_FAILURES = 3;
  private readonly FAILURE_TIMEOUT = 60000; // 1 minute

  constructor() {
    console.log('Multi-Provider LLM Service initialized');
    this.logProviderStatus();
  }

  private logProviderStatus() {
    const enabledProviders = this.providers.filter(p => p.enabled);
    console.log(`Available LLM providers: ${enabledProviders.map(p => p.name).join(', ')}`);
    
    if (enabledProviders.length === 0) {
      console.warn('⚠️ No LLM providers configured. Add API keys to environment variables.');
    }
  }

  private getAvailableProviders(): LLMProvider[] {
    const now = Date.now();
    
    return this.providers
      .filter(provider => {
        if (!provider.enabled) return false;
        
        const failures = this.failureCount.get(provider.name) || 0;
        const lastFailure = this.lastFailureTime.get(provider.name) || 0;
        
        // Reset failure count after timeout
        if (now - lastFailure > this.FAILURE_TIMEOUT) {
          this.failureCount.set(provider.name, 0);
          return true;
        }
        
        return failures < this.MAX_FAILURES;
      })
      .sort((a, b) => a.priority - b.priority);
  }

  private recordFailure(providerName: string) {
    const currentFailures = this.failureCount.get(providerName) || 0;
    this.failureCount.set(providerName, currentFailures + 1);
    this.lastFailureTime.set(providerName, Date.now());
    
    console.warn(`Provider ${providerName} failed. Failure count: ${currentFailures + 1}`);
  }

  private recordSuccess(providerName: string) {
    this.failureCount.set(providerName, 0);
    this.lastFailureTime.delete(providerName);
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    const availableProviders = this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      throw new Error('No available LLM providers. Please check your API keys and network connection.');
    }

    let lastError: Error | null = null;

    for (const provider of availableProviders) {
      try {
        console.log(`Trying provider: ${provider.name} (${provider.model})`);
        
        const response = await this.callProvider(provider, request);
        this.recordSuccess(provider.name);
        
        console.log(`✅ ${provider.name} responded successfully`);
        return response;
        
      } catch (error) {
        console.error(`❌ ${provider.name} failed:`, error);
        this.recordFailure(provider.name);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
  }

  private async callProvider(provider: LLMProvider, request: LLMRequest): Promise<LLMResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), provider.timeout);

    try {
      let response: Response;
      
      if (provider.name === 'OpenAI' || provider.name === 'Groq' || provider.name === 'Together') {
        response = await this.callOpenAICompatible(provider, request, controller.signal);
      } else if (provider.name === 'Claude') {
        response = await this.callClaude(provider, request, controller.signal);
      } else {
        throw new Error(`Unsupported provider: ${provider.name}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return this.parseResponse(data, provider);
      
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async callOpenAICompatible(
    provider: LLMProvider, 
    request: LLMRequest, 
    signal: AbortSignal
  ): Promise<Response> {
    return fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model,
        messages: request.messages,
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.7,
        stream: false // Streaming support can be added later
      }),
      signal
    });
  }

  private async callClaude(
    provider: LLMProvider, 
    request: LLMRequest, 
    signal: AbortSignal
  ): Promise<Response> {
    // Claude API has a different format
    const messages = request.messages.filter(msg => msg.role !== 'system');
    const systemMessage = request.messages.find(msg => msg.role === 'system')?.content || '';

    return fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': provider.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.7,
        system: systemMessage,
        messages: messages
      }),
      signal
    });
  }

  private parseResponse(data: any, provider: LLMProvider): LLMResponse {
    if (provider.name === 'Claude') {
      return {
        content: data.content[0]?.text || '',
        provider: provider.name,
        model: provider.model,
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        },
        finishReason: data.stop_reason
      };
    } else {
      // OpenAI-compatible format
      return {
        content: data.choices[0]?.message?.content || '',
        provider: provider.name,
        model: provider.model,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        },
        finishReason: data.choices[0]?.finish_reason
      };
    }
  }

  // Test all providers
  async testProviders(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    const testRequest: LLMRequest = {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello, I am working!" (respond with exactly this phrase)' }
      ],
      maxTokens: 50,
      temperature: 0
    };

    for (const provider of this.providers) {
      if (!provider.enabled) {
        results[provider.name] = false;
        continue;
      }

      try {
        const response = await this.callProvider(provider, testRequest);
        results[provider.name] = response.content.includes('Hello, I am working!');
        console.log(`${provider.name} test: ${results[provider.name] ? '✅' : '❌'}`);
      } catch (error) {
        results[provider.name] = false;
        console.log(`${provider.name} test: ❌ (${error})`);
      }
    }

    return results;
  }

  // Get provider status
  getProviderStatus(): Array<{
    name: string;
    enabled: boolean;
    failures: number;
    lastFailure?: Date;
    available: boolean;
  }> {
    const now = Date.now();
    
    return this.providers.map(provider => {
      const failures = this.failureCount.get(provider.name) || 0;
      const lastFailureTime = this.lastFailureTime.get(provider.name);
      const isAvailable = provider.enabled && 
        (failures < this.MAX_FAILURES || 
         (lastFailureTime && now - lastFailureTime > this.FAILURE_TIMEOUT));

      return {
        name: provider.name,
        enabled: provider.enabled,
        failures,
        lastFailure: lastFailureTime ? new Date(lastFailureTime) : undefined,
        available: isAvailable
      };
    });
  }

  // Enable/disable providers dynamically
  setProviderEnabled(name: string, enabled: boolean) {
    const provider = this.providers.find(p => p.name === name);
    if (provider) {
      provider.enabled = enabled;
      console.log(`Provider ${name} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  // Get best available provider
  getBestProvider(): string | null {
    const available = this.getAvailableProviders();
    return available.length > 0 ? available[0].name : null;
  }
}

export const multiProviderLLMService = new MultiProviderLLMService();
export type { LLMRequest, LLMResponse };