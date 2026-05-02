import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DuplicatesBanner } from "@/components/domain/DuplicatesBanner";

describe("DuplicatesBanner", () => {
  it("renders nothing when count is 0", () => {
    const { container } = render(<DuplicatesBanner count={0} />);

    expect(container.firstChild).toBeNull();
  });

  it("renders the count when greater than 0", () => {
    render(<DuplicatesBanner count={3} />);

    expect(screen.getByRole("status")).toHaveTextContent("Removidas 3");
  });
});
