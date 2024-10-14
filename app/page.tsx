"use client";

import { useEffect, useRef, useState } from "react";

export enum ChatWebSocketEvents {
  CONNECT = "onConnect",
  JOIN_CHAT = "join",
  SEND_MESSAGE = "sendMessage", // send message from frontend to backend
  SEND_ACTION = "sendActions",
  UPDATE_MESSAGE = "updateMessage",
  UPDATE_MESSAGE_STATUSES = "updateMessageStatus", // mark message as read
}

export type ChatType = {
  id: string;
  patient: string; // id
  patientName: string;
  patientAvatar?: number[] | null;
  patientAvatarBlob?: string;
  doctor: string; // id
  createdAt: string;
  pinned?: boolean | null;
  pinnedDate?: string | null; // date
  // when getting chat list last message and last action is the only element in the array
  messages: MessageType[]; // can be an empty array
  actions: ChatActionType[]; // can be an empty array
};

export type MessageType = {
  id: string;
  chatId: string;
  sender: string; // id
  content: string; // can be an empty string
  status: MessageStatusType;
  sentAt: string; // date
  files: {
    name: string;
    data: string; // base64 or File
    file?: File;
    preview?: string;
  }[]; // can be an empty array
  replyTo?: string | null;
  urgent?: boolean | null;
};

export enum MessageStatusType {
  READ = "READ",
  UNREAD = "UNREAD",
}

export type ChatActionType = {
  chatId: string;
  type: ChatActionName;
  sentAt: string; // date
};

export enum ChatActionName {
  HEALTH_VITALS_REQUEST = "HEALTH_VITALS_REQUEST",
  HEALTH_VITALS_RESPONSE = "HEALTH_VITALS_RESPONSE",
  DOCTOR_REASSIGN = "DOCTOR_REASSIGN",
}

const token = `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3YjlmMGM0NS02YTdjLTQxZTMtYjI1My0wYWExMTZjNmM3ODciLCJlbWFpbCI6bnVsbCwiY3JlYXRlZEF0IjoxNzI4ODkxNzYwNzY2LCJpYXQiOjE3Mjg4OTE3NjAsImV4cCI6MTgxNDg5MTc2MH0.9hWu3EfYE3O1L2vbcKUZVrZ2H0xT_fjSwqONVcEChNM`;

export default function Home() {
  const [unreadMsgs, setUnreadMsgs] = useState<string[]>([]);

  const socketConnectionRef = useRef<
    { isLoading: false; socket: WebSocket } | { isLoading: true } | null
  >(null);

  useEffect(() => {
    if (
      socketConnectionRef.current !== null &&
      (socketConnectionRef.current.isLoading ||
        socketConnectionRef.current.socket)
    )
      return;

    console.log("connect");
    const socket = new WebSocket("http://localhost:3018/chat");

    socketConnectionRef.current = { isLoading: true };

    socket.onopen = function () {
      console.log("Соединение установлено");
      socketConnectionRef.current = { isLoading: false, socket };

      socket.send(
        JSON.stringify({
          Authorization: token,
          "User-Type": "b2c",
          "Message-Type": ChatWebSocketEvents.CONNECT,
        })
      );

      socketConnectionRef.current.socket.send(
        JSON.stringify({
          Authorization: token,
          chatId: "cc1a8862-142c-4dc8-8bfd-7ae702de4517",
          "User-Type": "b2c",
          "Message-Type": ChatWebSocketEvents.JOIN_CHAT,
        })
      );
    };

    socket.onmessage = function (event) {
      const message = JSON.parse(event.data);

      console.log(message);

      if (typeof message !== "object") return;

      if (
        message.type === ChatWebSocketEvents.SEND_MESSAGE &&
        message.content
      ) {
        setUnreadMsgs((prevState) => [...prevState, message.content.id]);
      }
    };

    socket.onclose = function (event) {
      console.log("Соединение закрыто", event);
      socketConnectionRef.current = null;
    };

    socket.onerror = function (error) {
      console.log(`Ошибка:`, error);
    };

    // Clean up the connection when the component unmounts
    return () => {
      if (!socketConnectionRef.current?.isLoading)
        socketConnectionRef.current?.socket.close();
    };
  }, []);

  const handleSendMsg = async () => {
    if (!socketConnectionRef.current || socketConnectionRef.current.isLoading)
      return console.error("Could not connect to the chat");

    const message = {
      chatId: "cc1a8862-142c-4dc8-8bfd-7ae702de4517",
      content: "Hello, World!",
      sentAt: new Date().toISOString(),
      files: [],
    };

    socketConnectionRef.current.socket.send(
      JSON.stringify({
        ...message,
        Authorization: token,
        "Message-Type": ChatWebSocketEvents.SEND_MESSAGE,
        "User-Type": "b2c",
      })
    );
  };

  const handleReadMsg = () => {
    console.log(unreadMsgs);

    if (
      unreadMsgs.length > 0 &&
      socketConnectionRef.current &&
      !socketConnectionRef.current.isLoading
    ) {
      socketConnectionRef.current.socket.send(
        JSON.stringify({
          Authorization: token,
          "Message-Type": ChatWebSocketEvents.UPDATE_MESSAGE_STATUSES,
          "User-Type": "b2c",
          ids: unreadMsgs,
        })
      );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button onClick={handleSendMsg}>Send message</button>
      <button onClick={handleReadMsg}>Read messages</button>
    </div>
  );
}
