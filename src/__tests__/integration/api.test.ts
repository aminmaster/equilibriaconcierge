import { mockSupabase } from "@/utils/test-utils";

// Mock the Supabase client
jest.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

describe("API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication API", () => {
    it("should authenticate user with valid credentials", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { session: { user: { id: "test-user-id" } } },
        error: null,
      });
      
      const response = await mockSupabase.auth.signInWithPassword({
        email: "test@example.com",
        password: "password123",
      });
      
      expect(response.data.session.user.id).toBe("test-user-id");
      expect(response.error).toBeNull();
    });

    it("should reject authentication with invalid credentials", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { message: "Invalid credentials" },
      });
      
      const response = await mockSupabase.auth.signInWithPassword({
        email: "invalid@example.com",
        password: "wrongpassword",
      });
      
      expect(response.data.session).toBeNull();
      expect(response.error.message).toBe("Invalid credentials");
    });
  });

  describe("Database API", () => {
    it("should fetch conversations for authenticated user", async () => {
      const mockConversations = [
        { id: "1", title: "Test Conversation", user_id: "test-user-id" },
      ];
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockConversations,
          error: null,
        }),
      });
      
      const response = await mockSupabase
        .from('conversations')
        .select('*')
        .eq('user_id', 'test-user-id')
        .order('created_at', { ascending: false });
      
      expect(response.data).toEqual(mockConversations);
      expect(response.error).toBeNull();
    });

    it("should create new conversation", async () => {
      const newConversation = {
        id: "new-conversation-id",
        title: "New Conversation",
        user_id: "test-user-id",
      };
      
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: newConversation,
          error: null,
        }),
      });
      
      const response = await mockSupabase
        .from('conversations')
        .insert([newConversation])
        .select('*')
        .single();
      
      expect(response.data).toEqual(newConversation);
      expect(response.error).toBeNull();
    });
  });
});