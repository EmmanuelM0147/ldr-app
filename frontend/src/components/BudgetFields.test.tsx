import { render, screen } from "@testing-library/react"
import { BudgetFields } from "./widgets"

describe("BudgetFields", () => {
  it("offers common currencies in a select", () => {
    render(<BudgetFields />)
    const currency = screen.getByLabelText("Currency")
    expect(currency.tagName).toBe("SELECT")
    expect(screen.getByRole("option", { name: /NGN/ })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: /USD/ })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: /GBP/ })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: /EUR/ })).toBeInTheDocument()
  })
})
