import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../use-auth";
import { mockSupabase } from "@/utils/test-utils";

// Mock the Supabase client
jest.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

describe("useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with loading state", () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it("should sign in a user", async () => {
    const mockUser = {
      id: "test-user-id",
      email: "test@example.com",
      name: "Test User",
      role: "user",
    };
    
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: { user: { id: "test-user-id", email: "test@example.com" } } },
      error: null,
    });
    
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { first_name: "Test", last_name: "User", role: "user" },
        error: null,
      }),
    });

    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.signIn("test@example.com", "password123");
    });

    expect(result.current.user).toEqual(expect.objectContaining({
      id: "test-user-id",
      email: "test@example.com",
      name: "Test User",
      role: "user",
    }));
  });

  it("should sign up a user", async () => {
    const mockUser = {
      id: "new-user-id",
      email: "newuser@example.com",
      name: "New User",
      role: "user",
      first_name: "New",
      last_name: "User",
    };
    
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: "new-user-id", email: "newuser@example.com" } },
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.signUp("newuser@example.com", "password123", "New User");
    });

    expect(result.current.user).toEqual(expect.objectContaining({
      id: "new-user-id",
      email: "newuser@example.com",
      name: "New User",
      role: "user",
    }));
  });

  it("should sign out a user", async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });
    
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
  });
});