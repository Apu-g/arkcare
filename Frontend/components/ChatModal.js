"use client";

import { formatDate } from "@/lib/formatDate";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send, User, Stethoscope,
  Image as ImageIcon, Loader2, X, Phone, Video,
  PhoneIncoming, FileText, AlertTriangle,
  Hourglass, ShieldCheck
} from "lucide-react";
import { pusherClient } from "@/lib/pusher";
import {
  createOrGetChat,
  getChatMessages,
  sendMessage,
  sendImageMessage,
} from "@/actions/chatActions";
import VideoCallComponent from "./VideoCallComponent";
import DoctorReportDialog from "@/components/carequest/DoctorReportDialog";
import { getRtcEnvironmentIssue } from "@/lib/rtcEnvironment";

export default function ChatModal({ appointment, isOpen, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatId, setChatId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [realtimeReady, setRealtimeReady] = useState(false);

  // Image upload states
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Call states
  const [callState, setCallState] = useState('idle'); // idle, initiating, calling, ringing, connected
  const [incomingCall, setIncomingCall] = useState(null);
  const [callData, setCallData] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [rtcNotice, setRtcNotice] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const callStateRef = useRef(callState);
  const activeCallChannelRef = useRef(null);

  const updateCallState = (nextState) => {
    callStateRef.current = nextState;
    setCallState(nextState);
  };

  const userRole = user?.publicMetadata?.role;
  const isDoctor = userRole === "doctor";
  const otherUser = isDoctor ? appointment.patient : appointment.doctor;

  // Initialize chat when modal opens
  useEffect(() => {
    if (isOpen && appointment) {
      initializeChat();
    }

    return () => {
      if (chatId) {
        pusherClient.unsubscribe(`private-chat-${chatId}`);
      }
    };
  }, [isOpen, appointment]);

  // Setup Pusher connection
  useEffect(() => {
    if (chatId) {
      setRealtimeReady(false);

      // pusherClient.subscribe() THROWS synchronously when the client is not
      // configured (missing NEXT_PUBLIC_PUSHER_*). Unguarded, that throw
      // escaped the effect and tore down the whole dashboard. Degrade to
      // "realtime unavailable" instead of crashing.
      let channel;
      try {
        channel = pusherClient.subscribe(`private-chat-${chatId}`);
      } catch (error) {
        console.error("Realtime is unavailable:", error);
        setRtcNotice(
          "Live updates are unavailable in this configuration. Messages and calls are disabled; reload after configuring Pusher."
        );
        setRealtimeReady(false);
        return undefined;
      }

      channel.bind("pusher:subscription_succeeded", async () => {
        setRealtimeReady(true);

        // Reconcile anything sent while private-channel authorization was still
        // completing. This also makes reconnects lossless for chat messages.
        try {
          const latest = await getChatMessages(chatId);
          setMessages((prev) => {
            const byId = new Map();
            for (const item of [...prev, ...latest]) {
              byId.set(String(item._id), item);
            }
            return Array.from(byId.values()).sort(
              (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
            );
          });
        } catch (error) {
          console.error("Could not reconcile chat after realtime connect:", error);
        }
      });

      channel.bind("pusher:subscription_error", () => {
        setRealtimeReady(false);
      });

      channel.bind("new-message", (message) => {
        setMessages((prev) => {
          if (prev.some((item) => String(item._id) === String(message._id))) {
            return prev;
          }
          return [...prev, message];
        });
        scrollToBottom();
      });

      // Call-related events
      channel.bind("call-initiated", (callInfo) => {
        if (callInfo.initiatorId !== user?.id && callStateRef.current === "idle") {
          activeCallChannelRef.current = callInfo.channelName;
          setIncomingCall(callInfo);
          updateCallState("ringing");
        }
      });

      channel.bind("call-response", (response) => {
        const activeChannel = activeCallChannelRef.current;
        if (!activeChannel || response.channelName !== activeChannel) {
          return;
        }

        if (response.accepted) {
          updateCallState("connected");
        } else {
          activeCallChannelRef.current = null;
          updateCallState("idle");
          setCallData(null);
        }
        setIncomingCall(null);
      });

      channel.bind("call-ended", (event = {}) => {
        const activeChannel = activeCallChannelRef.current;
        if (!activeChannel || event.channelName !== activeChannel) {
          return;
        }

        activeCallChannelRef.current = null;
        updateCallState("idle");
        setIncomingCall(null);
        setCallData(null);
      });

      return () => {
        setRealtimeReady(false);
        pusherClient.unsubscribe(`private-chat-${chatId}`);
      };
    }
  }, [chatId, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      setLoading(true);
      const chat = await createOrGetChat(appointment._id);
      setChatId(chat._id);
      const existingMessages = await getChatMessages(chat._id);
      setMessages(existingMessages);
    } catch (error) {
      console.error("Error initializing chat:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || sending) return;

    setSending(true);

    try {
      const sent = await sendMessage(chatId, newMessage.trim());
      setMessages((prev) => {
        if (prev.some((item) => String(item._id) === String(sent._id))) return prev;
        return [...prev, sent];
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  // Call Functions
  const fetchAgoraCredentials = async (channelName) => {
    const response = await fetch("/api/generate-agora-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelName, chatId }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Failed to generate Agora token");
    }

    return {
      ...data,
      chatId,
    };
  };

  const sendCallEvent = async (event, data = {}) => {
    const response = await fetch("/api/send-pusher-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: `private-chat-${chatId}`,
        event,
        data,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Call signaling failed");
    }
  };

  const initiateCall = async (callType) => {
    if (callState !== "idle" || !chatId || !realtimeReady) return;

    const rtcIssue = getRtcEnvironmentIssue();
    if (rtcIssue) {
      setRtcNotice(rtcIssue.message);
      return;
    }

    setRtcNotice("");

    try {
      updateCallState("initiating");
      setIsVideo(callType === "video");

      const channelName = `ark-${chatId}-${Date.now()}`;
      activeCallChannelRef.current = channelName;
      const credentials = await fetchAgoraCredentials(channelName);

      setCallData(credentials);

      await sendCallEvent("call-initiated", {
        channelName,
        callType,
        initiatorId: user?.id,
        initiatorName: isDoctor
          ? appointment.doctor?.name
          : appointment.patient?.name,
      });

      // The receiver can accept before this trigger request resolves. Never
      // overwrite an already-connected state with "calling" on fast accepts.
      if (callStateRef.current === "initiating") {
        updateCallState("calling");
      }
    } catch (error) {
      console.error("Error initiating call:", error);
      updateCallState("idle");
      setCallData(null);
      alert(error.message || "Failed to start call. Please try again.");
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !chatId) return;

    const rtcIssue = getRtcEnvironmentIssue();
    if (rtcIssue) {
      setRtcNotice(rtcIssue.message);
      try {
        await sendCallEvent("call-response", {
          accepted: false,
          channelName: incomingCall.channelName,
        });
      } catch {}
      setIncomingCall(null);
      activeCallChannelRef.current = null;
      setCallData(null);
      updateCallState("idle");
      return;
    }

    setRtcNotice("");

    try {
      updateCallState("initiating");
      const credentials = await fetchAgoraCredentials(incomingCall.channelName);

      setCallData(credentials);
      setIsVideo(incomingCall.callType === "video");

      await sendCallEvent("call-response", {
        accepted: true,
        channelName: incomingCall.channelName,
      });
      setIncomingCall(null);
      updateCallState("connected");
    } catch (error) {
      console.error("Error accepting call:", error);
      try {
        await sendCallEvent("call-response", {
          accepted: false,
          channelName: incomingCall?.channelName,
        });
      } catch {}
      setIncomingCall(null);
      setCallData(null);
      updateCallState("idle");
      alert(error.message || "Could not join the call.");
    }
  };

  const declineCall = async () => {
    if (!incomingCall) return;

    try {
      await sendCallEvent("call-response", {
        accepted: false,
        channelName: incomingCall.channelName,
      });
    } catch (error) {
      console.error("Error declining call:", error);
    }

    setIncomingCall(null);
    activeCallChannelRef.current = null;
    setCallData(null);
    updateCallState("idle");
  };

  const cancelOutgoingCall = async () => {
    try {
      await sendCallEvent("call-ended", {
        channelName: activeCallChannelRef.current,
      });
    } catch (error) {
      console.error("Error cancelling call:", error);
    }

    setCallData(null);
    updateCallState("idle");
  };

  const endCall = async (duration) => {
    const endingChannel = callData?.channelName || activeCallChannelRef.current;
    try {
      await sendCallEvent("call-ended", { channelName: endingChannel });

      if (duration) {
        const callMessage = `📞 ${isVideo ? "Video" : "Voice"} call ended • Duration: ${duration}`;
        await sendMessage(chatId, callMessage);
      }
    } catch (error) {
      console.error("Error ending call:", error);
    } finally {
      activeCallChannelRef.current = null;
      updateCallState("idle");
      setCallData(null);
      setIncomingCall(null);
    }
  };

  // Image upload functions (keep existing ones)
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please select a valid image file (JPEG, PNG, WebP, or GIF)");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File size must be less than 5MB");
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async () => {
    if (!selectedImage || !chatId || uploading) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedImage);
      formData.append('chatId', chatId);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const { imageUrl, publicId } = await response.json();

      const sent = await sendImageMessage(chatId, imageUrl, publicId);
      setMessages((prev) => {
        if (prev.some((item) => String(item._id) === String(sent._id))) return prev;
        return [...prev, sent];
      });

      setSelectedImage(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleCancelImageUpload = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleClose = (nextOpen) => {
    if (nextOpen === true) return;

    const state = callStateRef.current;
    if (chatId && state === "ringing" && incomingCall) {
      void sendCallEvent("call-response", { accepted: false }).catch(() => {});
    } else if (
      chatId &&
      ["initiating", "calling", "connected"].includes(state)
    ) {
      void sendCallEvent("call-ended").catch(() => {});
    }

    if (chatId) {
      pusherClient.unsubscribe(`private-chat-${chatId}`);
    }
    setChatId(null);
    setMessages([]);
    setLoading(true);
    setSending(false);
    setRealtimeReady(false);
    setSelectedImage(null);
    setPreviewUrl(null);
    setUploading(false);
    setRtcNotice("");
    updateCallState('idle');
    setCallData(null);
    setIncomingCall(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const renderMessage = (message, index) => {
    const isOwnMessage = message.senderId === user?.id;

    return (
      <div
        key={message._id || index}
        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
      >
        <div
          /* Own messages are solid celadon (CARE); peer messages sit on the
             near-opaque data surface so a clinician never has to read a
             patient's message through a blur. */
          className={`max-w-[76%] rounded-[18px] px-3.5 py-2.5 ${
            isOwnMessage
              ? "rounded-br-[6px] bg-[var(--primary)] text-[#fff] shadow-[var(--shadow-cta)]"
              : "glass-data rounded-bl-[6px] text-[var(--text)]"
          }`}
        >
          <div
            className={`mb-1 flex items-center gap-1.5 text-[10px] ${
              isOwnMessage
                ? "text-[rgba(255,255,255,0.72)]"
                : "text-[var(--text-muted)]"
            }`}
          >
            {message.senderType === "doctor" ? (
              <Stethoscope className="h-3 w-3" strokeWidth={1.75} />
            ) : (
              <User className="h-3 w-3" strokeWidth={1.75} />
            )}
            <span className="font-semibold">{message.senderName}</span>
            <span>·</span>
            <span>{formatTime(message.createdAt)}</span>
          </div>

          {message.imageUrl ? (
            <div className="space-y-2">
              <img
                src={message.imageUrl}
                alt="Uploaded image"
                className="max-w-full h-auto rounded-[12px] cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(message.imageUrl, '_blank')}
                loading="lazy"
              />
            </div>
          ) : (
            <p className="text-[13px] leading-relaxed">{message.message}</p>
          )}
        </div>
      </div>
    );
  };

  // If in call, show call component
  if (callState === 'connected' && callData) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl h-[80vh] overflow-hidden border-0 bg-[var(--surface-shell)] p-0">
          <VideoCallComponent
            callData={callData}
            isVideo={isVideo}
            onCallEnd={endCall}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="flex h-[620px] max-w-2xl flex-col overflow-hidden border-0 bg-[var(--surface-shell)] p-0">
          <DialogHeader className="shrink-0 gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-shell)] px-5 py-4 pr-16">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="min-w-0">
                  <DialogTitle className="truncate text-[14px]">
                    Chat with{" "}
                    {isDoctor
                      ? otherUser?.name || "Patient"
                      : otherUser?.name || "Doctor"}
                  </DialogTitle>
                  {/* Appointment date is scheduling data, so it sits on a
                      near-opaque well rather than floating on glass. */}
                  <DialogDescription className="truncate">
                    <span className="glass-data inline-flex items-center gap-1.5 rounded-[10px] px-2 py-0.5">
                      Appointment on{" "}
                      {formatDate(appointment.appointmentDate)}
                    </span>
                  </DialogDescription>
                </div>
              </div>

              {/* Call Controls */}
              <div className="flex shrink-0 items-center gap-2">
                {isDoctor ? (
                  /* The Report action is the clinical commitment in this
                     conversation, so it wears the reserved proof colour. */
                  <Button
                    size="sm"
                    variant="copper"
                    onClick={() => setReportOpen(true)}
                    aria-label="Open consultation report"
                    title="File the consultation report (AI parses it into a care plan)"
                  >
                    <FileText className="h-4 w-4" strokeWidth={1.75} />
                    <span>Report</span>
                  </Button>
                ) : null}
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => initiateCall('audio')}
                  aria-label="Start audio call"
                  disabled={callState !== 'idle' || !realtimeReady}
                >
                  <Phone className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => initiateCall('video')}
                  aria-label="Start video call"
                  disabled={callState !== 'idle' || !realtimeReady}
                >
                  <Video className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </Button>
              </div>
            </div>
            {/* Connection state is a verification signal, so it is always
                word + icon, never a colour alone. */}
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
              {realtimeReady ? (
                <>
                  <ShieldCheck
                    className="h-3.5 w-3.5 text-[var(--success)]"
                    strokeWidth={1.75}
                  />
                  <span>Secure realtime connected</span>
                </>
              ) : (
                <>
                  <Hourglass
                    className="h-3.5 w-3.5 text-[var(--warning)]"
                    strokeWidth={1.75}
                  />
                  <span>Connecting secure realtime...</span>
                </>
              )}
            </div>
          </DialogHeader>

          {rtcNotice ? (
            <div className="flex shrink-0 items-start gap-2 border-b border-[var(--border-subtle)] bg-[var(--warning-soft)] px-5 py-3 text-[12px] leading-relaxed text-[var(--warning)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>
                <strong className="font-semibold">Calls unavailable in this browser context.</strong>
                <span className="ml-1">{rtcNotice}</span>
              </span>
            </div>
          ) : null}

          {/* Call Status */}
          {(callState === "initiating" || callState === "calling") && (
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3 text-[12px] font-medium text-[var(--text)]">
              <span className="inline-flex items-center gap-1.5">
                <PhoneIncoming className="h-3.5 w-3.5" strokeWidth={1.75} />
                {callState === "initiating" ? "Preparing secure call..." : "Calling — waiting for answer..."}
              </span>
              {callState === "calling" && (
                <Button size="sm" variant="secondary" onClick={cancelOutgoingCall}>
                  Cancel
                </Button>
              )}
            </div>
          )}

          {/* Messages Area */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full w-full">
                <div className="p-5">
                  {loading ? (
                    <div className="flex items-center justify-center h-full min-h-[300px]">
                      <div className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                        Loading chat...
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full min-h-[300px] text-center">
                      <div>
                        <div className="section-rule m-0! mb-2! justify-center">
                          <span>Transcript</span>
                        </div>
                        <p className="text-[13px] font-semibold text-[var(--text-strong)]">
                          No messages yet
                        </p>
                        <p className="mt-1 text-[12px] text-muted-foreground">
                          Start the conversation!
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Messages are never animated as they stream in — a
                       clinical transcript must stay scannable. */
                    <div className="space-y-3">
                      {messages.map((message, index) => renderMessage(message, index))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Image Preview Area */}
            {previewUrl && (
              <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--glass-2)] p-4 backdrop-blur-[12px]">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-20 w-20 rounded-[14px] object-cover shadow-[var(--shadow-card)]"
                    />
                    <button
                      type="button"
                      onClick={handleCancelImageUpload}
                      aria-label="Remove attached image"
                      className="absolute -right-3 -top-3 grid size-10 place-items-center rounded-full bg-[var(--primary)] text-[#fff] shadow-[var(--shadow-cta)]"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-[13px] font-semibold text-[var(--text-strong)]">
                      Ready to send image
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleImageUpload}
                        disabled={uploading}
                        size="sm"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          'Send Image'
                        )}
                      </Button>
                      <Button
                        onClick={handleCancelImageUpload}
                        variant="secondary"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--glass-2)] p-4 backdrop-blur-[12px]">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach an image"
                  disabled={loading || uploading || !!selectedImage || callState !== 'idle'}
                >
                  <ImageIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </Button>

                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 text-[13px]"
                  disabled={loading || sending || !!selectedImage || callState !== 'idle'}
                />

                <Button
                  type="submit"
                  size="icon"
                  aria-label="Send message"
                  disabled={!newMessage.trim() || loading || sending || !!selectedImage || callState !== 'idle'}
                >
                  <Send className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </Button>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Incoming Call Modal */}
      {incomingCall && (
        <Dialog open={true}>
          <DialogContent className="max-w-md">
            <DialogHeader className="items-center text-center">
              <div className="flex items-center gap-1.5 text-[var(--copper)]">
                <PhoneIncoming className="h-4 w-4" strokeWidth={1.75} />
                <span className="cq-kicker">Incoming</span>
              </div>
              <DialogTitle className="mt-1 text-[15px]">
                {incomingCall.callType === "video" ? "Video" : "Voice"} call
              </DialogTitle>
              <DialogDescription className="text-center">
                From {incomingCall.initiatorName}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex justify-center gap-3">
              <Button onClick={acceptCall}>
                <Phone className="h-4 w-4" strokeWidth={1.75} />
                Accept
              </Button>
              <Button
                onClick={declineCall}
                variant="outline"
              >
                Decline
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isDoctor ? (
        <DoctorReportDialog
          appointment={appointment}
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
        />
      ) : null}
    </>
  );
}
