import { budgetFromForm } from "./widgets"

const members: [string, string] = ["ada", "grace"]

function form(entries: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) data.set(key, value)
  return data
}

describe("budgetFromForm", () => {
  it("treats empty amount fields as no budget even when currency defaults", () => {
    expect(budgetFromForm(form({ currency: "NGN" }), members)).toEqual({ budget: null, error: null })
  })

  it("rejects a partial split", () => {
    expect(budgetFromForm(form({ currency: "NGN", total: "100", first: "40" }), members).error).toMatch(
      /total and both shares/i,
    )
  })

  it("rejects shares that do not sum to the total", () => {
    expect(
      budgetFromForm(form({ currency: "NGN", total: "100", first: "40", second: "50" }), members).error,
    ).toMatch(/equal the total/i)
  })

  it("accepts a balanced split", () => {
    expect(
      budgetFromForm(form({ currency: "NGN", total: "100", first: "40", second: "60" }), members),
    ).toEqual({
      budget: {
        currency: "NGN",
        total_minor: 10000,
        shares: [
          { user_id: "ada", amount_minor: 4000 },
          { user_id: "grace", amount_minor: 6000 },
        ],
      },
      error: null,
    })
  })
})
