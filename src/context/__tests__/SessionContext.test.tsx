import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { SessionProvider, useSession } from "@/context/SessionContext";
import type { UploadFileState } from "@/types";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
);

const makeFile = (id: string): UploadFileState => ({
  id,
  fileName: `${id}.pdf`,
  sizeBytes: 1024,
  status: { kind: "pending" },
});

describe("SessionContext", () => {
  it("starts with empty files and null ptaxOverride", () => {
    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current.files).toEqual([]);
    expect(result.current.ptaxOverride).toBeNull();
  });

  it("appends files via setFiles updater", () => {
    const { result } = renderHook(() => useSession(), { wrapper });

    act(() => {
      result.current.setFiles([makeFile("a")]);
    });
    act(() => {
      result.current.setFiles((prev) => [...prev, makeFile("b")]);
    });

    expect(result.current.files).toHaveLength(2);
    expect(result.current.files.map((f) => f.id)).toEqual(["a", "b"]);
  });

  it("stores a ptax override", () => {
    const { result } = renderHook(() => useSession(), { wrapper });

    act(() => {
      result.current.setPtaxOverride(5.42);
    });

    expect(result.current.ptaxOverride).toBe(5.42);
  });

  it("reset clears files and ptaxOverride", () => {
    const { result } = renderHook(() => useSession(), { wrapper });

    act(() => {
      result.current.setFiles([makeFile("a")]);
      result.current.setPtaxOverride(5.42);
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.files).toEqual([]);
    expect(result.current.ptaxOverride).toBeNull();
  });

  it("throws when useSession is called outside the provider", () => {
    expect(() => renderHook(() => useSession())).toThrow("SessionProvider");
  });
});
