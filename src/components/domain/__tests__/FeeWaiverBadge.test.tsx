import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeeWaiverBadge } from "@/components/domain/FeeWaiverBadge";

describe("FeeWaiverBadge", () => {
  it("renders nothing when no thresholds are provided", () => {
    const { container } = render(<FeeWaiverBadge />);
    expect(container.firstChild).toBeNull();
  });

  it("renders monthly spend chip", () => {
    render(<FeeWaiverBadge annualFeeWaiverThresholdBrl={5000} />);
    expect(screen.getByText(/5\.000/)).toBeInTheDocument();
    expect(screen.getByText(/mês/i)).toBeInTheDocument();
  });

  it("renders investment chip", () => {
    render(<FeeWaiverBadge investmentFeeWaiverBrl={50000} />);
    expect(screen.getByText(/50\.000/)).toBeInTheDocument();
    expect(screen.getByText(/investido/i)).toBeInTheDocument();
  });

  it("renders both chips with OR separator", () => {
    render(<FeeWaiverBadge annualFeeWaiverThresholdBrl={5000} investmentFeeWaiverBrl={50000} />);
    expect(screen.getByText(/OU/i)).toBeInTheDocument();
  });
});
