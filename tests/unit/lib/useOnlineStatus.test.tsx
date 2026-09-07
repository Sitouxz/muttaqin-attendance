import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

function setOnLine(value: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useOnlineStatus", () => {
  it("reports the browser's connectivity on the first render", () => {
    setOnLine(true);
    expect(renderHook(() => useOnlineStatus()).result.current).toBe(true);
  });

  // Regression: the hook used to seed state as `true` and correct it in an
  // effect, so a client that was already offline painted "online" first and
  // re-rendered to "offline". Asserting on the settled value alone does not
  // catch that — testing-library flushes the effect before you can read it —
  // so assert on the *first* value the hook ever returned.
  it("reports offline on the very first render, with no corrective re-render", () => {
    setOnLine(false);
    const rendered: boolean[] = [];

    renderHook(() => {
      const value = useOnlineStatus();
      rendered.push(value);
      return value;
    });

    expect(rendered[0]).toBe(false);
    expect(rendered).toEqual([false]);
  });

  it("follows offline and online events", () => {
    setOnLine(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      setOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);

    act(() => {
      setOnLine(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });

  it("detaches its listeners on unmount", () => {
    setOnLine(true);
    const remove = vi.spyOn(window, "removeEventListener");
    renderHook(() => useOnlineStatus()).unmount();

    const events = remove.mock.calls.map(([event]) => event);
    expect(events).toContain("online");
    expect(events).toContain("offline");
  });
});
