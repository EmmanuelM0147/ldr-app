import uuid
from typing import Any

from fastapi import WebSocket


class Hub:
    """In-memory fan-out. One process, one couple room per id."""

    def __init__(self) -> None:
        self._rooms: dict[uuid.UUID, set[WebSocket]] = {}

    def join(self, couple_id: uuid.UUID, socket: WebSocket) -> None:
        self._rooms.setdefault(couple_id, set()).add(socket)

    def leave(self, couple_id: uuid.UUID, socket: WebSocket) -> None:
        room = self._rooms.get(couple_id)
        if room is None:
            return
        room.discard(socket)
        if not room:
            del self._rooms[couple_id]

    async def publish(self, couple_id: uuid.UUID, message: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        for socket in list(self._rooms.get(couple_id, ())):
            try:
                await socket.send_json(message)
            except RuntimeError:
                dead.append(socket)
        for socket in dead:
            self.leave(couple_id, socket)


hub = Hub()
