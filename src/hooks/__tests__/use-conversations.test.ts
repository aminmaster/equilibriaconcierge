import { renderHook, act } from "@testing-library/react";
import { useConversations } from "../use-conversations";
import { mockSupabase } from "@/utils/test-utils";

// Mock the Supabase client
jest.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

// Mock useAuth hook
jest.mock("../use-auth", () => ({
  useAuth: () => ({
    user: { id: "test-user-id" },
  }),
}));

// Mock useAnonymousSession hook
jest.mock("../use-anonymous-session", () => ({
  useAnonymousSession: () => ({
    sessionId: "test-session-id",
    isAnonymous: false,
  }),
}));

describe("useConversations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with loading state", () => {
    const { result } = renderHook(() => useConversations());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.conversations).toEqual([]);
    expect(result.current.currentConversation).toBeNull();
  });

  it("should create a new conversation", async () => {
    const mockConversation = {
      id: "test-conversation-id",
      title: "Test Conversation",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [],
    };
    
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockConversation,
        error: null,
      }),
    });

    const { result } = renderHook(() => useConversations());
    
    let newConversation;
    await act(async () => {
      newConversation = await result.current.createConversation("Test Conversation");
    });

    expect(newConversation).toEqual(mockConversation);
    expect(result.current.conversations).toContainEqual(mockConversation);
  });

  it("should add a message to a conversation", async () => {
    const mockMessage = {
      id: "test-message-id",
      role: "user",
      content: "Test message",
      created_at: new Date().toISOString(),
    };
    
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockMessage,
        error: null,
      }),
    });

    const { result } = renderHook(() => useConversations());
    
    let newMessage;
    await act(async () => {
      newMessage = await result.current.addMessage("test-conversation-id", "user", "Test message");
    });

    expect(newMessage).toEqual(mockMessage);
  });

  it("should delete a conversation", async () => {
    mockSupabase.from.mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        error: null,
      }),
    });

    const { result } = renderHook(() => useConversations());
    
    await act(async () => {
      await result.current.deleteConversation("test-conversation-id");
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('conversations');
    expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'test-conversation-id');
  });
});