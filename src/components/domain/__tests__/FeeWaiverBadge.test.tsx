import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeeWaiverBadge } from "@/components/domain/FeeWaiverBadge";

describe("FeeWaiverBadge", () => {
  it("renders nothing when no thresholds are provided", () => {
    const { container } = render(<FeeWaiverBadge />);
    expect(container.firstChild).toBeNull();
  });

  it("renders monthly spend chip with wallet icon", () => {
    const { container } = render(<FeeWaiverBadge annualFeeWaiverThresholdBrl={5000} />);
    expect(screen.getByText(/5\.000/)).toBeInTheDocument();
    expect(screen.getByText(/mês/i)).toBeInTheDocument();
    expect(container.querySelector(".lucide-wallet")).not.toBeNull();
  });

  it("renders investment chip with piggy-bank icon", () => {
    const { container } = render(<FeeWaiverBadge investmentFeeWaiverBrl={50000} />);
    expect(screen.getByText(/50\.000/)).toBeInTheDocument();
    expect(screen.getByText(/investido/i)).toBeInTheDocument();
    expect(container.querySelector(".lucide-piggy-bank")).not.toBeNull();
  });

  it("renders both chips with OR separator and both icons", () => {
    const { container } = render(
      <FeeWaiverBadge annualFeeWaiverThresholdBrl={5000} investmentFeeWaiverBrl={50000} />,
    );
    expect(screen.getByText(/OU/i)).toBeInTheDocument();
    expect(container.querySelector(".lucide-wallet")).not.toBeNull();
    expect(container.querySelector(".lucide-piggy-bank")).not.toBeNull();
  });
});
