import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryDropZone, validateMemoryFile } from "./MemoryDropZone"

describe("validateMemoryFile", () => {
  it("rejects unsupported types", () => {
    const file = new File(["x"], "note.gif", { type: "image/gif" })
    expect(validateMemoryFile(file)).toEqual({ ok: false, error: "Use JPEG, PNG, WebP, MP4, or WebM." })
  })

  it("rejects oversize images", () => {
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" })
    expect(validateMemoryFile(file).ok).toBe(false)
    expect(validateMemoryFile(file)).toMatchObject({ error: expect.stringMatching(/10 MiB/i) })
  })

  it("accepts a small jpeg", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "ok.jpg", { type: "image/jpeg" })
    expect(validateMemoryFile(file)).toEqual({ ok: true, file })
  })
})

describe("MemoryDropZone", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:preview"),
    })
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    })
  })

  function chooseFile(file: File) {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
  }

  it("shows a preview for a small image file", () => {
    const view = render(<MemoryDropZone />)
    chooseFile(new File([new Uint8Array([1, 2, 3])], "moment.jpg", { type: "image/jpeg" }))
    expect(screen.getByAltText("Selected photo preview")).toHaveAttribute("src", "blob:preview")
    expect(screen.getByText(/moment\.jpg/)).toBeInTheDocument()
    view.unmount()
  })

  it("shows an error for a bad type", () => {
    render(<MemoryDropZone />)
    chooseFile(new File(["x"], "note.gif", { type: "image/gif" }))
    expect(screen.getByRole("alert")).toHaveTextContent(/JPEG, PNG, WebP/i)
  })
})
