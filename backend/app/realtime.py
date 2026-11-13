import uuid
from typing import Any

from fastapi import WebSocket


class Hub:
    """In-memory fan-out. One process, one couple room per id."""

    def __init__(self) -> None:
        self._rooms: dict[uuid.UUID, set[WebSocket]] = {}
        self._socket_user: dict[WebSocket, uuid.UUID] = {}
        self._user_sockets: dict[uuid.UUID, set[WebSocket]] = {}

    def join(self, couple_id: uuid.UUID, user_id: uuid.UUID, socket: WebSocket) -> None:
        self._rooms.setdefault(couple_id, set()).add(socket)
        self._socket_user[socket] = user_id
        self._user_sockets.setdefault(user_id, set()).add(socket)

    def leave(self, couple_id: uuid.UUID, socket: WebSocket) -> uuid.UUID | None:
        """Remove the socket. Return user_id when that user has no sockets left."""
        room = self._rooms.get(couple_id)
        if room is not None:
            room.discard(socket)
            if not room:
                del self._rooms[couple_id]

        user_id = self._socket_user.pop(socket, None)
        if user_id is None:
            return None
        sockets = self._user_sockets.get(user_id)
        if sockets is None:
            return user_id
        sockets.discard(socket)
        if sockets:
            return None
        del self._user_sockets[user_id]
        return user_id

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
