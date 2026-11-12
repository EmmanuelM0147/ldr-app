import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProfilePhotoForm } from "./ProfilePhotoForm"
import type { User } from "../types"

const user: User = {
  id: "ada",
  email: "ada@example.com",
  display_name: "Ada",
  timezone: "UTC",
  created_at: "2026-11-01T00:00:00.000Z",
  avatar_url: null,
}

describe("ProfilePhotoForm", () => {
  it("uploads a JPEG profile photo", async () => {
    const events = userEvent.setup()
    const onUpload = vi.fn().mockResolvedValue(undefined)
    const onRemove = vi.fn()
    const loadBlob = vi.fn()
    const createObjectURL = vi.fn(() => "blob:ada")
    const revokeObjectURL = vi.fn()
    vi.stubGlobal(
      "URL",
      Object.assign(class extends URL {}, {
        createObjectURL,
        revokeObjectURL,
      }),
    )
    const { container } = render(
      <ProfilePhotoForm user={user} loadBlob={loadBlob} onUpload={onUpload} onRemove={onRemove} />,
    )
    const file = new File([new Uint8Array([1, 2, 3])], "ada.jpg", { type: "image/jpeg" })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await events.upload(input, file)
    expect(onUpload).toHaveBeenCalledWith(file)
    expect(screen.queryByText(/JPEG, PNG, or WebP up to 5 MiB/i)).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})
