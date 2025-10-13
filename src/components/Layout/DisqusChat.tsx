import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Minimize2 } from 'lucide-react';

export function DisqusChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isOpen && !isLoaded) {
      loadDisqus();
      setIsLoaded(true);
    }
  }, [isOpen, isLoaded]);

  const loadDisqus = () => {
    const disqusShortname = 'wwwbuildmyhomes-in';

    if (typeof window !== 'undefined' && !(window as any).DISQUS) {
      const script = document.createElement('script');
      script.src = `https://${disqusShortname}.disqus.com/embed.js`;
      script.setAttribute('data-timestamp', String(+new Date()));
      (document.head || document.body).appendChild(script);
    } else if ((window as any).DISQUS) {
      (window as any).DISQUS.reset({
        reload: true,
      });
    }
  };

  const toggleChat = () => {
    if (isOpen) {
      setIsOpen(false);
      setIsMinimized(false);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  const minimizeChat = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center space-x-2 group"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="hidden group-hover:inline-block text-sm font-medium pr-2 transition-all duration-300">
            Chat with us
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-white rounded-lg shadow-2xl border border-slate-200 transition-all duration-300 ${
            isMinimized ? 'h-14' : 'h-[600px]'
          } w-96 flex flex-col overflow-hidden`}
          style={{ maxHeight: 'calc(100vh - 100px)' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 flex items-center justify-between rounded-t-lg">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <h3 className="font-semibold text-sm">Community Discussion</h3>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={minimizeChat}
                className="p-1 hover:bg-blue-700 rounded transition-colors"
                aria-label={isMinimized ? 'Maximize' : 'Minimize'}
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={toggleChat}
                className="p-1 hover:bg-blue-700 rounded transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <div className="flex-1 overflow-y-auto bg-white">
              <div id="disqus_thread" className="p-4"></div>
              <noscript>
                Please enable JavaScript to view the{' '}
                <a href="https://disqus.com/?ref_noscript">
                  comments powered by Disqus.
                </a>
              </noscript>
            </div>
          )}
        </div>
      )}
    </>
  );
}
