import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { SessionProvider, useSession } from "@/context/SessionContext";
import type { SpendingProfile } from "@/types";

const STORAGE_KEY = "vertice.profile.v1";

const baseProfile: SpendingProfile = {
  monthlyDomesticBrl: 5000,
  monthlyInternationalUsd: 200,
  redemption: { kind: "any" },
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
);

describe("SessionContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with no profile when storage is empty", () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    expect(result.current.profile).toBeNull();
    expect(result.current.profileSavedAt).toBeNull();
    expect(result.current.ptaxOverride).toBeNull();
  });

  it("hydrates profile from localStorage on mount", () => {
    const savedAt = "2026-05-15T12:00:00.000Z";
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: baseProfile, savedAt }));

    const { result } = renderHook(() => useSession(), { wrapper });
    expect(result.current.profile).toEqual(baseProfile);
    expect(result.current.profileSavedAt).toBe(savedAt);
  });

  it("ignores corrupted storage without crashing", () => {
    localStorage.setItem(STORAGE_KEY, "{ not json");
    const { result } = renderHook(() => useSession(), { wrapper });
    expect(result.current.profile).toBeNull();
  });

  it("ignores storage that fails schema validation", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ profile: { monthlyDomesticBrl: "not-a-number" }, savedAt: "x" }),
    );
    const { result } = renderHook(() => useSession(), { wrapper });
    expect(result.current.profile).toBeNull();
  });

  it("setProfile persists to storage and updates savedAt", () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => {
      result.current.setProfile(baseProfile);
    });
    expect(result.current.profile).toEqual(baseProfile);
    expect(result.current.profileSavedAt).toBeTypeOf("string");
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? "{}") as { profile: SpendingProfile };
    expect(parsed.profile).toEqual(baseProfile);
  });

  it("setProfile(null) clears storage", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ profile: baseProfile, savedAt: "2026-01-01T00:00:00.000Z" }),
    );
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => {
      result.current.setProfile(null);
    });
    expect(result.current.profile).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("reset clears profile, savedAt and ptaxOverride", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ profile: baseProfile, savedAt: "2026-01-01T00:00:00.000Z" }),
    );
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => {
      result.current.setPtaxOverride(5.1);
    });
    expect(result.current.ptaxOverride).toBe(5.1);
    act(() => {
      result.current.reset();
    });
    expect(result.current.profile).toBeNull();
    expect(result.current.profileSavedAt).toBeNull();
    expect(result.current.ptaxOverride).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("setProfile accepts an updater function", () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => {
      result.current.setProfile(baseProfile);
    });
    act(() => {
      result.current.setProfile((prev) =>
        prev === null ? null : { ...prev, monthlyDomesticBrl: 9000 },
      );
    });
    expect(result.current.profile?.monthlyDomesticBrl).toBe(9000);
  });

  it("throws when used outside SessionProvider", () => {
    const { result } = renderHook(() => {
      try {
        return useSession();
      } catch (error) {
        return error;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
  });
});
