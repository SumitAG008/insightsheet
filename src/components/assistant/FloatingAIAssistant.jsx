// components/assistant/FloatingAIAssistant.jsx - Floating AI Assistant for all pages
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your InsightSheet-lite AI Assistant. I can help you with:\n\n• Data analysis and cleaning\n• Excel operations\n• Feature guidance\n• Best practices\n\nWhat would you like help with today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    { icon: HelpCircle, text: 'How do I upload files?', query: 'How do I upload and process my CSV or Excel files?' },
    { icon: Sparkles, text: 'Data cleaning tips', query: 'What are the best practices for cleaning my data?' },
    { icon: HelpCircle, text: 'Export options', query: 'How can I export my cleaned data?' },
    { icon: Sparkles, text: 'AI features', query: 'What AI-powered features are available?' }
  ];

  const getContextualResponse = (userQuery) => {
    const query = userQuery.toLowerCase();

    // File upload help
    if (query.includes('upload') || query.includes('file')) {
      return "To upload files:\n\n1. **Supported formats**: CSV, XLSX, XLS\n2. **File size**: 10MB (Free) or 500MB (Premium)\n3. **Process**: Drag & drop or click to browse\n4. **Privacy**: All processing happens in your browser - no server uploads!\n\nYour data is analyzed instantly and you'll be taken to the Dashboard for cleaning and visualization.";
    }

    // Data cleaning
    if (query.includes('clean') || query.includes('duplicate') || query.includes('empty')) {
      return "Data Cleaning Tools available:\n\n• **Remove Duplicates**: Eliminate duplicate rows\n• **Remove Empty Rows**: Clean up blank entries\n• **Trim Whitespace**: Clean text fields\n• **Column Operations**: Sort, filter, rename columns\n• **AI-Powered Cleanup**: Smart data correction\n\nAccess these tools from the Dashboard after uploading your file.";
    }

    // Export help
    if (query.includes('export') || query.includes('download') || query.includes('save')) {
      return "Export Your Data:\n\n1. **Excel format (.xlsx)**: Full spreadsheet with formatting\n2. **CSV format (.csv)**: Universal compatibility\n\nClick the **'Export (Excel/CSV)'** button on the Dashboard to choose your format. All your cleaned data will be included!";
    }

    // AI features
    if (query.includes('ai') || query.includes('smart') || query.includes('intelligent')) {
      return "AI-Powered Features:\n\n• **Agentic AI**: Natural language data operations\n• **Smart Insights**: Automatic pattern detection\n• **Data Transformation**: AI-assisted formulas\n• **Chart Generation**: Smart visualization suggestions\n• **Quality Analysis**: Automated data quality checks\n\nNavigate to **AI Tools** in the menu to explore these features!";
    }

    // Dashboard help
    if (query.includes('dashboard') || query.includes('analyze')) {
      return "Dashboard Features:\n\n• **Data Grid**: View and edit your data\n• **Cleaning Tools**: Remove duplicates, empty rows\n• **AI Insights**: Automatic analysis\n• **Charts**: Visual data representation\n• **Transform**: Apply formulas and operations\n\nThe Dashboard is your central hub for all data operations!";
    }

    // Excel operations
    if (query.includes('excel') || query.includes('sheet') || query.includes('reconcil')) {
      return "Excel Tools Available:\n\n• **Sheet Manager**: Multi-sheet operations\n• **Reconciliation**: Compare datasets\n• **Accounting Toolkit**: Financial operations\n• **Project Tracker**: Project management\n\nAccess these under **Excel Tools** in the navigation menu!";
    }

    // Privacy
    if (query.includes('privacy') || query.includes('secure') || query.includes('safe')) {
      return "Privacy & Security:\n\n✅ **100% Browser Processing**: All data stays on your device\n✅ **Zero Server Upload**: Files never leave your computer\n✅ **No Tracking**: We don't collect or store any data\n✅ **Session-Only**: Data clears when you close the tab\n\nYour privacy is our top priority!";
    }

    // Default response
    return "I'm here to help! You can ask me about:\n\n• **File uploads** and supported formats\n• **Data cleaning** and transformation\n• **AI-powered features** and tools\n• **Excel operations** and reconciliation\n• **Export options** and formats\n• **Privacy** and security\n\nTry asking a specific question or select a quick action below!";
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI thinking delay
    setTimeout(() => {
      const response = getContextualResponse(input);
      const assistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 800);
  };

  const handleQuickAction = (action) => {
    setInput(action.query);
    handleSend();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-50 group"
        aria-label="Open AI Assistant"
      >
        <MessageCircle className="w-7 h-7" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-pulse" />
        <div className="absolute bottom-full right-0 mb-2 px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Need help? Ask me anything!
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">AI Assistant</h3>
            <p className="text-white/80 text-xs font-semibold">Always here to help</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white'
                  : 'bg-white border border-slate-300 text-slate-800'
              }`}
            >
              <p className="text-sm font-bold whitespace-pre-line leading-relaxed">
                {msg.content}
              </p>
              <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-white/60' : 'text-slate-500'} font-semibold`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-300 rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <p className="text-xs font-bold text-slate-600 mb-2">Quick actions:</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAction(action)}
                className="flex items-center gap-2 p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors text-left"
              >
                <action.icon className="w-4 h-4 text-slate-600 flex-shrink-0" />
                <span className="text-xs font-bold text-slate-800">{action.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything..."
            className="flex-1 border-slate-300 focus:border-slate-500 font-bold"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-900 hover:to-slate-800 text-white font-bold"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
