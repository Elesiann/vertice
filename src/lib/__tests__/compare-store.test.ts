import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCompareStore } from "@/lib/compare-store";

describe("useCompareStore", () => {
  beforeEach(() => {
    useCompareStore.setState({ ids: [] });
  });

  it("starts empty", () => {
    const { result } = renderHook(() => useCompareStore());
    expect(result.current.ids).toEqual([]);
  });

  it("adds an id", () => {
    const { result } = renderHook(() => useCompareStore());
    act(() => {
      result.current.add("card-a");
    });
    expect(result.current.ids).toContain("card-a");
  });

  it("does not add duplicates", () => {
    const { result } = renderHook(() => useCompareStore());
    act(() => {
      result.current.add("card-a");
      result.current.add("card-a");
    });
    expect(result.current.ids.filter((id) => id === "card-a")).toHaveLength(1);
  });

  it("caps at 4 cards", () => {
    const { result } = renderHook(() => useCompareStore());
    act(() => {
      result.current.add("a");
      result.current.add("b");
      result.current.add("c");
      result.current.add("d");
      result.current.add("e");
    });
    expect(result.current.ids).toHaveLength(4);
    expect(result.current.ids).not.toContain("e");
  });

  it("removes an id", () => {
    const { result } = renderHook(() => useCompareStore());
    act(() => {
      result.current.add("card-a");
      result.current.remove("card-a");
    });
    expect(result.current.ids).not.toContain("card-a");
  });

  it("clears all ids", () => {
    const { result } = renderHook(() => useCompareStore());
    act(() => {
      result.current.add("a");
      result.current.add("b");
      result.current.clear();
    });
    expect(result.current.ids).toHaveLength(0);
  });

  it("has() returns true for present id", () => {
    const { result } = renderHook(() => useCompareStore());
    act(() => {
      result.current.add("card-a");
    });
    expect(result.current.has("card-a")).toBe(true);
  });

  it("has() returns false for absent id", () => {
    const { result } = renderHook(() => useCompareStore());
    expect(result.current.has("card-x")).toBe(false);
  });
});
