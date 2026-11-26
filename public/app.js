const $ = (id) => document.getElementById(id);
const messagesEl = $("messages");
const input = $("userInput");
const history = [];
let busy = false;
let recognition = null;
let listening = false;

function setStatus(text) { $("assistantState").textContent = text; }
function addMessage(role, text) {
  const wrap = document.createElement("div");
  wrap.className = `message ${role}`;
  const who = document.createElement("span");
  who.className = "speaker";
  who.textContent = role === "assistant" ? "JARVIS" : "YOU";
  const p = document.createElement("p");
  p.textContent = text;
  wrap.append(who, p);
  messagesEl.append(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
async function checkHealth() {
  try {
    const r = await fetch("/api/health");
    const d = await r.json();
    $("connectionState").textContent = d.groqConfigured ? "AI LINK READY" : "API KEY REQUIRED";
    $("systemStatus").textContent = d.groqConfigured ? "SYSTEM ONLINE" : "SETUP REQUIRED";
  } catch {
    $("connectionState").textContent = "SERVER OFFLINE";
    $("systemStatus").textContent = "DISCONNECTED";
  }
}
async function speak(text) {
  if (!$("voiceToggle").checked) return;
  try {
    const r = await fetch("/api/speak", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({text})
    });
    if (!r.ok) {
      const d = await r.json();
      throw new Error(d.error || "Voice service unavailable");
    }
    const blob = await r.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.onended = () => URL.revokeObjectURL(audioUrl);
    await audio.play();
  } catch (e) {
    addMessage("assistant", `Voice unavailable: ${e.message}`);
  }
}
async function send(text) {
  const prompt = text.trim();
  if (!prompt || busy) return;
  busy = true;
  input.value = "";
  addMessage("user", prompt);
  history.push({role:"user",content:prompt});
  setStatus("PROCESSING YOUR REQUEST");
  $("systemStatus").textContent = "PROCESSING";
  try {
    const r = await fetch("/api/chat", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({messages:history})
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "AI request failed");
    history.push({role:"assistant",content:data.reply});
    addMessage("assistant", data.reply);
    setStatus("AWAITING YOUR COMMAND");
    $("systemStatus").textContent = "SYSTEM ONLINE";
    await speak(data.reply);
  } catch (e) {
    addMessage("assistant", `I encountered a problem: ${e.message}`);
    setStatus("CHECK SYSTEM CONNECTION");
  } finally { busy = false; }
}
$("chatForm").addEventListener("submit", e => { e.preventDefault(); send(input.value); });
$("clearButton").addEventListener("click", () => { history.length = 0; messagesEl.replaceChildren(); addMessage("assistant","Conversation cleared. Ready for your next command."); });
$("micButton").addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    addMessage("assistant","Voice recognition is not available in this browser. Please use the text command box, or try the latest Chrome on Android.");
    return;
  }
  if (listening) { recognition?.stop(); return; }
  recognition = new SpeechRecognition();
  recognition.lang = "en-ZA";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => { listening = true; $("micButton").classList.add("listening"); setStatus("LISTENING"); };
  recognition.onresult = event => { const words = event.results[0][0].transcript; input.value = words; send(words); };
  recognition.onerror = event => { addMessage("assistant",`Microphone: ${event.error}. You can also type your command.`); };
  recognition.onend = () => { listening = false; $("micButton").classList.remove("listening"); if (!busy) setStatus("AWAITING YOUR COMMAND"); };
  try { recognition.start(); } catch { addMessage("assistant","Please wait a moment and try the microphone again."); }
});
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(()=>{}));
checkHealth();
