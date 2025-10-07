import { renderHook, act } from "@testing-library/react";
import { useChat } from "../use-chat";
import { mockSupabase } from "@/utils/test-utils";

// Mock the Supabase client
jest.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

// Mock useConversations hook
jest.mock("../use-conversations", () => ({
  useConversations: () => ({
    currentConversation: { id: "test-conversation-id" },
    addMessage: jest.fn().mockResolvedValue({}),
    createConversation: jest.fn().mockResolvedValue({ id: "test-conversation-id" }),
  }),
}));

// Mock useModelConfig hook
jest.mock("../use-model-config", () => ({
  useModelConfig: () => ({
    config: {
      generation: {
        provider: "openrouter",
        model: "openai/gpt-4o",
        temperature: 0.7,
        maxTokens: 2048,
      },
      embedding: {
        provider: "openai",
        model: "text-embedding-3-large",
        dimensions: 3072,
      },
    },
    loading: false,
  }),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe("useChat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it("should initialize with correct state", () => {
    const { result } = renderHook(() => useChat());
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.configLoading).toBe(false);
  });

  it("should stream a message", async () => {
    // Mock fetch response
    const mockResponse = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n'));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n'));
        controller.close();
      }
    });
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: mockResponse,
      getReader: () => ({
        read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
      }),
    });
    
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    });

    const { result } = renderHook(() => useChat());
    
    const onChunk = jest.fn();
    await act(async () => {
      await result.current.streamMessage("Hello", onChunk);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(onChunk).toHaveBeenCalledWith("Hello");
  });

  it("should handle streaming errors", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue("Internal Server Error"),
    });
    
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    });

    const { result } = renderHook(() => useChat());
    
    await act(async () => {
      await result.current.streamMessage("Hello", jest.fn());
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toContain("HTTP error! status: 500");
  });

  it("should cancel streaming", async () => {
    const mockAbortController = {
      abort: jest.fn(),
    };
    
    global.AbortController = jest.fn(() => mockAbortController) as any;
    
    const { result } = renderHook(() => useChat());
    
    act(() => {
      result.current.cancelStream();
    });

    expect(mockAbortController.abort).toHaveBeenCalled();
  });
});