import { render, screen } from "@testing-library/react"
import { MemoryMediaView } from "./MemoryMedia"

describe("MemoryMediaView", () => {
  it("renders an image from a data URL", () => {
    render(
      <MemoryMediaView
        memoryId="m1"
        media={{
          kind: "image",
          content_type: "image/png",
          filename: "gate.png",
          url: "data:image/png;base64,abc",
        }}
      />,
    )
    expect(screen.getByRole("img", { name: "gate.png" })).toBeInTheDocument()
  })
})
