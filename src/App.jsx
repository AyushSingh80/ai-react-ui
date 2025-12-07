import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Analytics from "./Analytics";
import "./App.css";

function App() {
  const [interviewId, setInterviewId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [resumeFile, setResumeFile] = useState(null);

  // NEW STATES FOR RESULT
  const [view, setView] = useState("setup"); // setup | chat | result
  const [feedback, setFeedback] = useState(null);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

  // --- SPEECH SETUP (Unchanged) ---
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join("");
        updateUserPreview(transcript);
        resetSilenceTimer(transcript);
      };
    }
  }, [interviewId]);

  // --- START ---
  const startInterview = async () => {
    setStatus("Uploading & Analyzing...");
    try {
      const formData = new FormData();
      formData.append("domain", "Java Microservices");
      formData.append("difficulty", "Hard");
      if (resumeFile) formData.append("resume", resumeFile);

      const response = await axios.post(
        "http://localhost:8080/interviews/start",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const data = response.data;
      setInterviewId(data.id);

      const initialHistory = data.history
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content }));
      setMessages(initialHistory);

      const firstQuestion = initialHistory.find((m) => m.role === "assistant");
      if (firstQuestion) speak(firstQuestion.content);

      setView("chat");
      setStatus("Interview Started.");
    } catch (error) {
      setStatus("Error: " + error.message);
    }
  };

  // --- END INTERVIEW (NEW) ---
  const endInterview = async () => {
    setStatus("Generating Report Card...");
    // Stop listening immediately
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    try {
      const response = await axios.post(
        `http://localhost:8080/interviews/${interviewId}/end`
      );
      setFeedback(response.data.feedback);
      setView("result"); // Switch Screen
      setStatus("Report Ready.");
    } catch (error) {
      console.error(error);
      setStatus("Error generating report.");
    }
  };

  // --- DOWNLOAD REPORT (NEW) ---
  const downloadReport = () => {
    if (!feedback) return;
    const text = `
INTERVIEW REPORT CARD
Date: ${new Date().toLocaleDateString()}
Role: Java Microservices
--------------------------------
SCORES:
Technical: ${feedback.technicalScore}/10
Communication: ${feedback.communicationScore}/10
Overall: ${feedback.overallScore}/10
--------------------------------
SUMMARY:
${feedback.summary}
--------------------------------
STRENGTHS:
${feedback.strengths.map((s) => "- " + s).join("\n")}
--------------------------------
WEAKNESSES:
${feedback.weaknesses.map((w) => "- " + w).join("\n")}
`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Report_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
  };

  // --- EXISTING HELPERS (Unchanged) ---
  const toggleMic = () => {
    /* ... same as before ... */
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };
  const resetSilenceTimer = (text) => {
    /* ... same ... */
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      recognitionRef.current.stop();
      setIsListening(false);
      handleSendMessage(text);
    }, 2500);
  };
  const updateUserPreview = (text) => {
    setMessages((prev) => {
      const others = prev.filter((m) => m.id !== "temp-user");
      return [...others, { role: "user", content: text, id: "temp-user" }];
    });
  };
  const handleSendMessage = async (text) => {
    if (!text.trim()) return;
    setStatus("AI is thinking...");
    try {
      const response = await axios.post(
        `http://localhost:8080/interviews/${interviewId}/chat`,
        { answer: text }
      );
      const updatedHistory = response.data.history.filter(
        (msg) => msg.role !== "system"
      );
      setMessages(updatedHistory);
      const lastMessage = updatedHistory[updatedHistory.length - 1];
      if (lastMessage.role === "assistant") {
        speak(lastMessage.content);
        setStatus("Your turn.");
      }
    } catch (error) {
      setStatus("Error sending.");
    }
  };
  const speak = (text) => {
    /* ... same ... */
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(u);
  };

  // --- RENDER ---
  return (
    <div className="container">
      <h1>Mock AI Interviewer</h1>
      <p>
        Status: <strong>{status}</strong>
      </p>

      {/* VIEW 1: SETUP */}
      {view === "setup" && (
        <div className="start-section">
          <Analytics />
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setResumeFile(e.target.files[0])}
            className="file-input"
          />
          <button
            className="start-btn"
            onClick={startInterview}
            disabled={!resumeFile}
          >
            Upload & Start
          </button>
        </div>
      )}

      {/* VIEW 2: CHAT */}
      {view === "chat" && (
        <>
          <div className="chat-box">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                {msg.content}
              </div>
            ))}
          </div>
          <div className="controls">
            <button
              className={`mic-btn ${isListening ? "listening" : "idle"}`}
              onClick={toggleMic}
            >
              {isListening ? "⏹" : "🎤"}
            </button>
            {/* NEW END BUTTON */}
            <button
              className="end-btn"
              onClick={endInterview}
              style={{
                marginLeft: "20px",
                backgroundColor: "red",
                color: "white",
                border: "none",
                padding: "10px",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              End Interview
            </button>
          </div>
        </>
      )}

      {/* VIEW 3: RESULT */}
      {view === "result" && feedback && (
        <div
          className="result-box"
          style={{ textAlign: "left", padding: "20px" }}
        >
          <h2>Performance Report</h2>
          <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
            <div className="score-card">
              Technical: <strong>{feedback.technicalScore}/10</strong>
            </div>
            <div className="score-card">
              Communication: <strong>{feedback.communicationScore}/10</strong>
            </div>
          </div>

          <h3>Summary</h3>
          <p>{feedback.summary}</p>

          <h3>Mistakes to Avoid</h3>
          <ul>
            {feedback.mistakes.map((m, i) => (
              <li key={i} style={{ color: "red" }}>
                {m}
              </li>
            ))}
          </ul>

          <button
            onClick={downloadReport}
            className="start-btn"
            style={{ marginTop: "20px" }}
          >
            Download Report 📄
          </button>

          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: "20px", marginLeft: "10px", padding: "10px" }}
          >
            Start New Interview
          </button>
        </div>
      )}
    </div>
  );
  
}

export default App;
