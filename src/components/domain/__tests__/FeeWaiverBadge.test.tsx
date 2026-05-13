import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeeWaiverBadge } from "@/components/domain/FeeWaiverBadge";

describe("FeeWaiverBadge", () => {
  it("renders nothing when no thresholds are provided", () => {
    const { container } = render(<FeeWaiverBadge />);
    expect(container.firstChild).toBeNull();
  });

  it("renders spend threshold text", () => {
    render(<FeeWaiverBadge annualFeeWaiverThresholdBrl={5000} />);
    expect(screen.getByText(/isenta/i)).toBeInTheDocument();
    expect(screen.getByText(/5\.000/)).toBeInTheDocument();
    expect(screen.getByText(/mês/)).toBeInTheDocument();
  });

  it("renders investment threshold text", () => {
    render(<FeeWaiverBadge investmentFeeWaiverBrl={50000} />);
    expect(screen.getByText(/isenta/i)).toBeInTheDocument();
    expect(screen.getByText(/50\.000/)).toBeInTheDocument();
    expect(screen.getByText(/investido/)).toBeInTheDocument();
  });

  it("renders both conditions with ou separator", () => {
    render(<FeeWaiverBadge annualFeeWaiverThresholdBrl={5000} investmentFeeWaiverBrl={50000} />);
    expect(screen.getByText(/ou/)).toBeInTheDocument();
    expect(screen.getByText(/5\.000/)).toBeInTheDocument();
    expect(screen.getByText(/50\.000/)).toBeInTheDocument();
  });
});
