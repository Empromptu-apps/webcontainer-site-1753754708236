import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const MentalHealthApp = () => {
  const [currentScreen, setCurrentScreen] = useState('mood-checkin');
  const [userState, setUserState] = useState({
    Physical: 0, Etheric: 0, Astral: 0, Mental: 0, 
    Causal: 0, Buddhic: 0, Atmic: 0
  });
  const [chatHistory, setChatHistory] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [exchangeCount, setExchangeCount] = useState(0);
  const [agentId, setAgentId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [journalEntries, setJournalEntries] = useState([]);
  const [researchResults, setResearchResults] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [apiLogs, setApiLogs] = useState([]);
  const [showApiLogs, setShowApiLogs] = useState(false);
  const [createdObjects, setCreatedObjects] = useState(new Set());
  const [exportData, setExportData] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const recognitionRef = useRef(null);

  const stateData = [
    { name: 'Physical', color: '#FF0000', note: 'C', chord: 'C Major', icon: '⚫', value: userState.Physical },
    { name: 'Etheric', color: '#FF7F00', note: 'D', chord: 'Dm7', icon: '🌀', value: userState.Etheric },
    { name: 'Astral', color: '#FFFF00', note: 'E', chord: 'E7', icon: '⭐', value: userState.Astral },
    { name: 'Mental', color: '#00FF00', note: 'F', chord: 'Fmaj7', icon: '▲', value: userState.Mental },
    { name: 'Causal', color: '#0000FF', note: 'G', chord: 'G7', icon: '🪐', value: userState.Causal },
    { name: 'Buddhic', color: '#4B0082', note: 'A', chord: 'Am', icon: '👁️', value: userState.Buddhic },
    { name: 'Atmic', color: '#9400D3', note: 'B', chord: 'Bdim', icon: '∞', value: userState.Atmic }
  ];

  const dominantState = stateData.reduce((prev, current) => 
    (prev.value > current.value) ? prev : current
  );

  const logApiCall = (endpoint, method, payload, response) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      payload: JSON.stringify(payload, null, 2),
      response: JSON.stringify(response, null, 2)
    };
    setApiLogs(prev => [logEntry, ...prev.slice(0, 49)]); // Keep last 50 logs
  };

  const apiCall = async (endpoint, method, payload) => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer 22c3d153c7f536d80c3c384fb6ddc93c',
      'X-Generated-App-ID': 'd196c01c-8832-47b8-ba99-fa17a245fd75',
      'X-Usage-Key': '369397c6ffb66469db3dc7796c8f70f9'
    };

    try {
      const response = await fetch(`https://builder.empromptu.ai/api_tools${endpoint}`, {
        method,
        headers,
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      logApiCall(endpoint, method, payload, data);
      return data;
    } catch (error) {
      logApiCall(endpoint, method, payload, { error: error.message });
      throw error;
    }
  };

  // Load state from cookie on mount
  useEffect(() => {
    const savedState = document.cookie
      .split('; ')
      .find(row => row.startsWith('userState='));
    
    if (savedState) {
      try {
        const state = JSON.parse(decodeURIComponent(savedState.split('=')[1]));
        setUserState(state);
      } catch (e) {
        console.log('Could not parse saved state');
      }
    }
    
    initializeAgent();
  }, []);

  // Save state to cookie whenever it changes
  useEffect(() => {
    document.cookie = `userState=${encodeURIComponent(JSON.stringify(userState))}; max-age=2592000; path=/`;
  }, [userState]);

  const initializeAgent = async () => {
    try {
      const data = await apiCall('/create-agent', 'POST', {
        instructions: `You are a compassionate AI therapist specializing in the MaiiaM Method. You help users understand their emotional states through gentle conversation. Be warm, empathetic, and ask thoughtful questions to understand how the user is feeling. Keep responses conversational and supportive. You will receive periodic state analysis updates to inform your responses.`,
        agent_name: "MaiiaM Wellness Guide"
      });
      setAgentId(data.agent_id);
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  };

  const analyzeUserState = async (text) => {
    try {
      const objectName = `state_analysis_${Date.now()}`;
      setCreatedObjects(prev => new Set([...prev, objectName, 'user_input']));

      // First store the user input
      await apiCall('/input_data', 'POST', {
        created_object_name: "user_input",
        data_type: "strings",
        input_data: [text]
      });

      // Apply the analysis prompt
      await apiCall('/apply_prompt', 'POST', {
        created_object_names: [objectName],
        prompt_string: `Analyze this text and classify the user's emotional/energetic state using the 7-state framework. Return ONLY a JSON object with confidence scores (0-100) for each state and a suggested intervention.

7-State Framework:
- Physical (Red, C): Body, survival, grounded, material concerns
- Etheric (Orange, D): Energy, vitality, life force
- Astral (Yellow, E): Emotions, dreams, desires, feelings
- Mental (Green, F): Logic, thinking, problem-solving, analysis  
- Causal (Blue, G): Life patterns, meaning, karma, deeper understanding
- Buddhic (Indigo, A): Intuition, connection, spiritual knowing
- Atmic (Violet, B): Transcendence, unity, peace, highest consciousness

Text to analyze: {user_input}

Return format:
{
  "Physical": 0-100,
  "Etheric": 0-100, 
  "Astral": 0-100,
  "Mental": 0-100,
  "Causal": 0-100,
  "Buddhic": 0-100,
  "Atmic": 0-100,
  "suggestion": "One specific action the user could take based on their state"
}`,
        inputs: [{
          input_object_name: "user_input",
          mode: "use_individually"
        }]
      });

      // Get the analysis results
      const analysisData = await apiCall('/return_data', 'POST', {
        object_name: objectName,
        return_type: "raw_text"
      });

      try {
        const stateAnalysis = JSON.parse(analysisData.value);
        setUserState({
          Physical: stateAnalysis.Physical || 0,
          Etheric: stateAnalysis.Etheric || 0,
          Astral: stateAnalysis.Astral || 0,
          Mental: stateAnalysis.Mental || 0,
          Causal: stateAnalysis.Causal || 0,
          Buddhic: stateAnalysis.Buddhic || 0,
          Atmic: stateAnalysis.Atmic || 0
        });
        return stateAnalysis.suggestion;
      } catch (e) {
        console.error('Error parsing state analysis:', e);
        return null;
      }
    } catch (error) {
      console.error('Error analyzing state:', error);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !agentId) return;

    const newMessage = { type: 'user', content: currentMessage };
    setChatHistory(prev => [...prev, newMessage]);
    
    const messageToSend = currentMessage;
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // Analyze state every other exchange
      let suggestion = null;
      if (exchangeCount % 2 === 1) {
        suggestion = await analyzeUserState(messageToSend);
      }

      const data = await apiCall('/chat', 'POST', {
        agent_id: agentId,
        message: suggestion ? 
          `${messageToSend}\n\n[Internal note: User state analysis suggests: ${suggestion}. Incorporate this insight naturally into your response.]` : 
          messageToSend
      });

      setChatHistory(prev => [...prev, { type: 'ai', content: data.response }]);
      setExchangeCount(prev => prev + 1);
    } catch (error) {
      console.error('Error sending message:', error);
      setChatHistory(prev => [...prev, { type: 'ai', content: 'I apologize, but I encountered an error. Please try again.' }]);
    }
    setIsLoading(false);
  };

  const startVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      
      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setVoiceTranscript(transcript);
      };

      recognitionRef.current.start();
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const saveJournalEntry = async () => {
    if (!voiceTranscript.trim()) return;

    setIsLoading(true);
    const suggestion = await analyzeUserState(voiceTranscript);
    
    const entry = {
      id: Date.now(),
      content: voiceTranscript,
      timestamp: new Date().toLocaleString(),
      suggestion: suggestion
    };
    
    setJournalEntries(prev => [entry, ...prev]);
    setVoiceTranscript('');
    setIsLoading(false);
  };

  const researchTopic = async (topic) => {
    setIsLoading(true);
    try {
      const objectName = `research_${topic.replace(/\s+/g, '_')}_${Date.now()}`;
      setCreatedObjects(prev => new Set([...prev, objectName]));

      await apiCall('/rapid_research', 'POST', {
        created_object_name: objectName,
        goal: `Find practical, evidence-based information about ${topic} for mental health and wellness`
      });

      // Wait a moment then get results
      setTimeout(async () => {
        try {
          const resultsData = await apiCall('/return_data', 'POST', {
            object_name: objectName,
            return_type: "pretty_text"
          });

          setResearchResults(prev => ({
            ...prev,
            [topic]: resultsData.value
          }));
        } catch (error) {
          console.error('Error getting research results:', error);
          setResearchResults(prev => ({
            ...prev,
            [topic]: 'Research results are still loading. Please try again in a moment.'
          }));
        }
        setIsLoading(false);
      }, 3000);
    } catch (error) {
      console.error('Error researching topic:', error);
      setIsLoading(false);
    }
  };

  const deleteAllObjects = async () => {
    for (const objectName of createdObjects) {
      try {
        await fetch(`https://builder.empromptu.ai/api_tools/objects/${objectName}`, {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer 22c3d153c7f536d80c3c384fb6ddc93c',
            'X-Generated-App-ID': 'd196c01c-8832-47b8-ba99-fa17a245fd75',
            'X-Usage-Key': '369397c6ffb66469db3dc7796c8f70f9'
          }
        });
      } catch (error) {
        console.error(`Error deleting object ${objectName}:`, error);
      }
    }
    setCreatedObjects(new Set());
    alert('All created objects have been deleted.');
  };

  const exportUserData = () => {
    const exportData = {
      userState,
      chatHistory,
      journalEntries,
      researchResults,
      dominantState: dominantState.name,
      exportTimestamp: new Date().toISOString(),
      stateHistory: stateData.map(state => ({
        name: state.name,
        value: state.value,
        color: state.color,
        note: state.note,
        chord: state.chord
      }))
    };
    
    setExportData(exportData);
    setShowExportModal(true);
  };

  const downloadCSV = () => {
    if (!exportData) return;
    
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add headers
    csvContent += "Type,Timestamp,Content,State,Confidence,Suggestion\n";
    
    // Add chat history
    chatHistory.forEach(msg => {
      csvContent += `Chat,${new Date().toISOString()},${msg.content.replace(/,/g, ';')},${dominantState.name},${dominantState.value}%,\n`;
    });
    
    // Add journal entries
    journalEntries.forEach(entry => {
      csvContent += `Journal,${entry.timestamp},${entry.content.replace(/,/g, ';')},${dominantState.name},${dominantState.value}%,${entry.suggestion || ''}\n`;
    });
    
    // Add state data
    stateData.forEach(state => {
      csvContent += `State,${new Date().toISOString()},${state.name},${state.name},${state.value}%,${state.chord} - ${state.note}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `maiiam_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderMoodCheckin = () => (
    <div className="flex-1 p-4 lg:p-6 transition-colors duration-300" 
         style={{ backgroundColor: dominantState.color + '10' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl lg:text-3xl font-bold text-white">Smart Mood Check-In</h2>
          <button
            onClick={exportUserData}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all focus:ring-2 focus:ring-blue-500"
            aria-label="Export user data"
          >
            Export Data
          </button>
        </div>
        
        {/* State Visualization */}
        <div className="mb-6 p-4 lg:p-6 bg-gray-800 rounded-2xl shadow-2xl">
          <div className="flex justify-center mb-6 space-x-2 lg:space-x-4 flex-wrap">
            {stateData.map(state => (
              <div key={state.name} className="text-center mb-2">
                <div 
                  className="text-xl lg:text-2xl mb-1 transition-all duration-300"
                  style={{ 
                    opacity: 0.3 + (state.value / 100) * 0.7,
                    filter: `drop-shadow(0 0 ${state.value / 10}px ${state.color})`,
                    transform: `scale(${1 + state.value / 200})`
                  }}
                  aria-label={`${state.name} state: ${state.value}% confidence`}
                >
                  {state.icon}
                </div>
                <div className="text-xs text-gray-400">{state.name}</div>
              </div>
            ))}
          </div>
          
          <div className="h-24 lg:h-32 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateData}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Bar 
                  dataKey="value" 
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {dominantState.value > 0 && (
            <div className="p-4 rounded-xl transition-all duration-300" 
                 style={{ backgroundColor: dominantState.color + '20' }}>
              <p className="text-sm text-white">
                <strong>Current State:</strong> {dominantState.name} ({dominantState.chord} - {dominantState.note})
              </p>
            </div>
          )}
        </div>

        {/* Chat Interface */}
        <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-primary-600 px-4 py-3 flex items-center">
            <div className="w-3 h-3 bg-white rounded-full mr-3"></div>
            <span className="text-white font-medium">MaiiaM Wellness Guide</span>
          </div>
          
          <div className="p-4 h-80 lg:h-96 flex flex-col">
            <div className="flex-1 overflow-y-auto mb-4 space-y-3 custom-scrollbar" 
                 role="log" 
                 aria-live="polite" 
                 aria-label="Chat conversation">
              {chatHistory.length === 0 && (
                <div className="text-gray-400 text-center py-8 bg-gray-700 rounded-xl">
                  Hello! I'm here to help you understand your emotional state. How are you feeling today?
                </div>
              )}
              {chatHistory.map((msg, idx) => (
                <div key={idx} 
                     className={`p-3 rounded-xl max-w-xs lg:max-w-md transition-all duration-200 ${
                       msg.type === 'user' 
                         ? 'bg-primary-600 text-white ml-auto' 
                         : 'bg-gray-700 text-gray-100 mr-auto'
                     }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <div className="spinner mr-3"></div>
                  <span className="text-gray-400">Analyzing your state...</span>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Share how you're feeling..."
                className="flex-1 p-3 bg-gray-700 text-white rounded-xl border-none outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                aria-label="Type your message"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !currentMessage.trim()}
                className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:ring-2 focus:ring-primary-500"
                aria-label="Send message"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderVoiceJournal = () => (
    <div className="flex-1 p-4 lg:p-6 transition-colors duration-300" 
         style={{ backgroundColor: dominantState.color + '10' }}>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-6">Voice Journal</h2>
        
        {/* Voice Input Card */}
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 lg:p-8 mb-6">
          <div className="text-center mb-6">
            <button
              onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
              className={`w-20 h-20 lg:w-24 lg:h-24 rounded-full text-3xl lg:text-4xl transition-all duration-300 focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                isListening 
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 animate-pulse' 
                  : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 hover:scale-105'
              } text-white shadow-lg`}
              aria-label={isListening ? 'Stop recording' : 'Start voice recording'}
            >
              {isListening ? '⏹️' : '🎤'}
            </button>
            <p className="text-gray-400 mt-4 text-lg">
              {isListening ? 'Listening... Click to stop' : 'Click to start voice recording'}
            </p>
          </div>
          
          {voiceTranscript && (
            <div className="bg-gray-700 p-4 lg:p-6 rounded-xl mb-6 border-l-4 border-primary-500">
              <h3 className="text-white font-medium mb-2">Transcript:</h3>
              <p className="text-gray-200 leading-relaxed">{voiceTranscript}</p>
            </div>
          )}
          
          {voiceTranscript && (
            <button
              onClick={saveJournalEntry}
              disabled={isLoading}
              className="w-full py-3 lg:py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg font-medium focus:ring-2 focus:ring-green-500"
              aria-label="Save journal entry"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="spinner mr-3"></div>
                  Analyzing...
                </div>
              ) : (
                'Save Journal Entry'
              )}
            </button>
          )}
        </div>

        {/* Journal Entries */}
        <div className="space-y-4">
          {journalEntries.map(entry => (
            <div key={entry.id} className="bg-gray-800 rounded-2xl shadow-lg p-4 lg:p-6 transition-all hover:shadow-xl">
              <div className="flex justify-between items-start mb-3">
                <div className="text-xs text-gray-400 bg-gray-700 px-3 py-1 rounded-full">
                  {entry.timestamp}
                </div>
              </div>
              <p className="text-white mb-4 leading-relaxed">{entry.content}</p>
              {entry.suggestion && (
                <div className="bg-primary-900 border border-primary-700 p-4 rounded-xl">
                  <p className="text-primary-200 text-sm">
                    <strong className="text-primary-100">Suggestion:</strong> {entry.suggestion}
                  </p>
                </div>
              )}
            </div>
          ))}
          
          {journalEntries.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-lg">No journal entries yet. Start by recording your thoughts above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderLearningCenter = () => (
    <div className="flex-1 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-6">Learning Center</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
          {['Mindfulness Techniques', 'Stress Management', 'Sleep Hygiene'].map(topic => (
            <button
              key={topic}
              onClick={() => researchTopic(topic)}
              disabled={isLoading}
              className="p-6 lg:p-8 bg-gray-800 text-white rounded-2xl hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:scale-105 focus:ring-2 focus:ring-primary-500"
              aria-label={`Research ${topic}`}
            >
              <div className="text-3xl lg:text-4xl mb-4">
                {topic === 'Mindfulness Techniques' && '🧘'}
                {topic === 'Stress Management' && '🌱'}
                {topic === 'Sleep Hygiene' && '😴'}
              </div>
              <h3 className="text-lg lg:text-xl font-semibold">{topic}</h3>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-400 text-lg">Researching wellness topics...</p>
          </div>
        )}

        <div className="space-y-6">
          {Object.entries(researchResults).map(([topic, content]) => (
            <div key={topic} className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-primary-600 px-6 py-4">
                <h3 className="text-xl lg:text-2xl font-bold text-white">{topic}</h3>
              </div>
              <div className="p-6 lg:p-8">
                <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">{content}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'} flex flex-col lg:flex-row`}>
      {/* Mobile Header */}
      <div className="lg:hidden bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">MaiiaM Method</h1>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-white p-2 hover:bg-gray-700 rounded-lg"
          aria-label="Toggle menu"
        >
          <div className="w-6 h-6 flex flex-col justify-center space-y-1">
            <div className="w-full h-0.5 bg-white"></div>
            <div className="w-full h-0.5 bg-white"></div>
            <div className="w-full h-0.5 bg-white"></div>
          </div>
        </button>
      </div>

      {/* Sidebar */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} lg:block w-full lg:w-80 bg-gray-800 p-4 lg:p-6`}>
        <h1 className="text-xl lg:text-2xl font-bold text-white mb-8 hidden lg:block">MaiiaM Method</h1>
        
        <nav className="space-y-3 mb-8">
          {[
            { id: 'mood-checkin', label: 'Smart Mood Check-In', icon: '🧠' },
            { id: 'voice-journal', label: 'Voice Journal', icon: '🎤' },
            { id: 'learning-center', label: 'Learning Center', icon: '📚' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentScreen(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left p-4 rounded-xl transition-all focus:ring-2 focus:ring-primary-500 ${
                currentScreen === item.id 
                  ? 'bg-primary-600 text-white shadow-lg' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              aria-label={`Navigate to ${item.label}`}
            >
              <span className="mr-3 text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Current State Display */}
        {dominantState.value > 0 && (
          <div className="p-4 lg:p-6 rounded-2xl shadow-lg mb-6" 
               style={{ backgroundColor: dominantState.color + '20' }}>
            <h3 className="text-white font-semibold mb-4">Current State</h3>
            <div className="text-center">
              <div className="text-4xl mb-2">{dominantState.icon}</div>
              <div className="text-lg text-white font-medium">{dominantState.name}</div>
              <div className="text-sm text-gray-300">{dominantState.chord}</div>
              <div className="text-xs text-gray-400 mt-1">{Math.round(dominantState.value)}% confidence</div>
            </div>
          </div>
        )}

        {/* API Controls */}
        <div className="space-y-3">
          <button
            onClick={() => setShowApiLogs(!showApiLogs)}
            className="w-full py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all focus:ring-2 focus:ring-green-500"
            aria-label="Toggle API logs"
          >
            {showApiLogs ? 'Hide' : 'Show'} API Logs
          </button>
          
          <button
            onClick={deleteAllObjects}
            className="w-full py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all focus:ring-2 focus:ring-red-500"
            aria-label="Delete all created objects"
          >
            Delete All Objects
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {currentScreen === 'mood-checkin' && renderMoodCheckin()}
        {currentScreen === 'voice-journal' && renderVoiceJournal()}
        {currentScreen === 'learning-center' && renderLearningCenter()}
      </div>

      {/* Export Data Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-96 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Export User Data</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
                aria-label="Close export modal"
              >
                ×
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-300 mb-4">Export your MaiiaM Method data including emotional states, chat history, journal entries, and research results.</p>
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="text-white font-medium mb-2">Data Summary:</h4>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• Current emotional state: {dominantState.name} ({Math.round(dominantState.value)}%)</li>
                  <li>• Chat messages: {chatHistory.length}</li>
                  <li>• Journal entries: {journalEntries.length}</li>
                  <li>• Research topics: {Object.keys(researchResults).length}</li>
                </ul>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={downloadCSV}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all focus:ring-2 focus:ring-blue-500"
              >
                Download CSV
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
                  alert('Data copied to clipboard!');
                }}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all focus:ring-2 focus:ring-green-500"
              >
                Copy JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Logs Modal */}
      {showApiLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-96 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">API Call Logs</h3>
              <button
                onClick={() => setShowApiLogs(false)}
                className="text-gray-400 hover:text-white text-2xl"
                aria-label="Close API logs"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto max-h-80 custom-scrollbar">
              {apiLogs.map((log, idx) => (
                <div key={idx} className="mb-4 p-4 bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-300 mb-2">
                    <strong>{log.method}</strong> {log.endpoint} - {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                  <details className="text-xs">
                    <summary className="text-gray-400 cursor-pointer hover:text-white">View Details</summary>
                    <div className="mt-2 space-y-2">
                      <div>
                        <strong className="text-gray-300">Request:</strong>
                        <pre className="bg-gray-900 p-2 rounded mt-1 overflow-x-auto text-gray-400">{log.payload}</pre>
                      </div>
                      <div>
                        <strong className="text-gray-300">Response:</strong>
                        <pre className="bg-gray-900 p-2 rounded mt-1 overflow-x-auto text-gray-400">{log.response}</pre>
                      </div>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentalHealthApp;
